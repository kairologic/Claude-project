// lib/payer-directory/acceptance-gap-detector.ts
// ═══ #112: Payer Acceptance Cross-Reference ═══
//
// For each practice that claims to accept a payer (via accepted_payers on
// practice_websites), checks how many of the practice's providers are actually
// found in that payer's FHIR directory. Flags gaps where > 50% are missing.
//
// Called after payer sync completes (from sync-payer-batch.ts or as a
// standalone post-sync step).

import { buildAcceptanceGapMismatch, type AcceptanceGapInput } from './mismatch-engine';
import type { DirectoryMismatch, PayerEndpoint } from './types';
import { FhirDirectoryClient } from './fhir-client';

// Minimum consecutive not_listed cycles before we consider it a real gap
const NOT_LISTED_THRESHOLD = 2;

export interface AcceptanceGap {
  practice_website_id: string;
  practice_name: string | null;
  practice_url: string;
  payer_code: string;
  claimed: true; // Website claims this payer
  total_providers: number; // Active providers at this practice
  listed_count: number; // Providers found in payer directory
  not_listed_count: number; // Providers NOT found
  gap_percentage: number; // 0-100: % of providers not listed
  severity: 'action' | 'warning' | 'info';
}

export interface AcceptanceGapReport {
  practices_checked: number;
  practices_with_gaps: number;
  total_gaps: number;
  gaps: AcceptanceGap[];
  mismatches: DirectoryMismatch[]; // Workflow 2 compatible mismatch entries
}

// ── Gap Detection ─────────────────────────────────────────

/**
 * Detect acceptance gaps for a single practice.
 *
 * @param practiceId - practice_website_id
 * @param acceptedPayers - payer codes the website claims to accept
 * @param providers - NPIs at this practice with their snapshot status per payer
 * @param practiceMeta - name and url for reporting
 */
export function detectAcceptanceGaps(
  practiceId: string,
  acceptedPayers: string[],
  providers: ProviderDirectoryStatus[],
  practiceMeta: { name: string | null; url: string },
): AcceptanceGap[] {
  const gaps: AcceptanceGap[] = [];

  if (!acceptedPayers || acceptedPayers.length === 0 || providers.length === 0) {
    return gaps;
  }

  for (const payerCode of acceptedPayers) {
    // For each claimed payer, check how many providers are listed
    let listed = 0;
    let notListed = 0;

    for (const provider of providers) {
      const status = provider.payer_statuses[payerCode];
      if (!status) {
        // No snapshot at all for this payer — treat as not listed
        notListed++;
      } else if (status === 'listed') {
        listed++;
      } else {
        notListed++;
      }
    }

    const total = listed + notListed;
    if (total === 0) continue;

    const gapPct = Math.round((notListed / total) * 100);

    // Severity thresholds:
    //   action:  >50% missing (majority not in directory — serious compliance risk)
    //   warning: 20-50% missing (some gaps — billing risk for those patients)
    //   info:    <20% missing (minor — could be new hires not yet credentialed)
    let severity: AcceptanceGap['severity'] = 'info';
    if (gapPct > 50) {
      severity = 'action';
    } else if (gapPct >= 20) {
      severity = 'warning';
    }

    // Only report gaps where at least one provider is missing
    if (notListed > 0) {
      gaps.push({
        practice_website_id: practiceId,
        practice_name: practiceMeta.name,
        practice_url: practiceMeta.url,
        payer_code: payerCode,
        claimed: true,
        total_providers: total,
        listed_count: listed,
        not_listed_count: notListed,
        gap_percentage: gapPct,
        severity,
      });
    }
  }

  return gaps;
}

// ── Supabase-Backed Batch Detection ───────────────────────

export interface ProviderDirectoryStatus {
  npi: string;
  payer_statuses: Record<string, 'listed' | 'not_listed'>;
}

/**
 * Run acceptance gap detection across all practices (or a subset).
 * Queries practice_websites for accepted_payers, joins against
 * payer_directory_snapshots to compute gaps.
 *
 * @param dbFn - Supabase REST fetch function (same signature as scan-scheduler's `db`)
 * @param options - Optional filters
 */
export async function runAcceptanceGapCheck(
  dbFn: (path: string, options?: RequestInit) => Promise<any>,
  options: {
    practiceId?: string;
    payerCode?: string;
    /** Pass FHIR client + endpoints to enable Layer 2 re-verification */
    fhirClient?: FhirDirectoryClient;
    payerEndpoints?: PayerEndpoint[];
  } = {},
): Promise<AcceptanceGapReport> {
  const report: AcceptanceGapReport = {
    practices_checked: 0,
    practices_with_gaps: 0,
    total_gaps: 0,
    gaps: [],
    mismatches: [],
  };

  // 1. Fetch practices that have accepted_payers populated
  let practiceFilter =
    'practice_websites?accepted_payers=not.is.null&select=id,name,url,accepted_payers,accepted_payers_source';
  if (options.practiceId) {
    practiceFilter += `&id=eq.${options.practiceId}`;
  }

  const practices: {
    id: string;
    name: string | null;
    url: string;
    accepted_payers: string[];
    accepted_payers_source: string | null;
  }[] = await dbFn(practiceFilter);

  if (!practices || practices.length === 0) {
    console.log('[AcceptanceGap] No practices with accepted_payers found.');
    return report;
  }

  console.log(
    `[AcceptanceGap] Checking ${practices.length} practices with claimed payer acceptance.`,
  );

  for (const practice of practices) {
    report.practices_checked++;

    // 2. Get active providers for this practice
    const providers: { npi: string; provider_name: string | null }[] = await dbFn(
      `practice_providers?practice_website_id=eq.${practice.id}&roster_status=in.(active,onboarding)&select=npi,provider_name`,
    );

    if (!providers || providers.length === 0) continue;

    // 3. Get payer directory snapshots for these providers (with consecutive counter)
    const npiList = providers.map((p) => `"${p.npi}"`).join(',');
    let snapshotFilter = `payer_directory_snapshots?npi=in.(${npiList})&select=npi,payer_code,fhir_practitioner_id,consecutive_not_listed_count,reverification_confirmed`;
    if (options.payerCode) {
      snapshotFilter += `&payer_code=eq.${options.payerCode}`;
    }

    const snapshots: {
      npi: string;
      payer_code: string;
      fhir_practitioner_id: string | null;
      consecutive_not_listed_count: number;
      reverification_confirmed: boolean | null;
    }[] = await dbFn(snapshotFilter);

    // 4. Build per-provider status map
    // Layer 1: Only count as not_listed if consecutive_not_listed_count >= threshold
    const providerStatuses: ProviderDirectoryStatus[] = providers.map((p) => ({
      npi: p.npi,
      payer_statuses: {} as Record<string, 'listed' | 'not_listed'>,
    }));

    const statusMap = new Map<string, ProviderDirectoryStatus>();
    for (const ps of providerStatuses) {
      statusMap.set(ps.npi, ps);
    }

    // Track providers needing re-verification (Layer 2)
    const needsReverification: { npi: string; payer_code: string; name: string | null }[] = [];

    for (const snap of snapshots || []) {
      const ps = statusMap.get(snap.npi);
      if (!ps) continue;

      // Determine listed status from fhir_practitioner_id:
      // Non-null = provider was found in the payer directory
      // Null = provider was NOT found (not listed)
      const isNotListed = !snap.fhir_practitioner_id;

      if (isNotListed) {
        if (snap.consecutive_not_listed_count < NOT_LISTED_THRESHOLD) {
          // Layer 1: Below threshold — don't count as not_listed yet
          // (treat as unknown/pending, effectively skip)
          continue;
        }

        if (snap.reverification_confirmed === true) {
          // Already re-verified and confirmed not listed
          ps.payer_statuses[snap.payer_code] = 'not_listed';
        } else if (snap.reverification_confirmed === false) {
          // Re-verification found them — treat as listed
          ps.payer_statuses[snap.payer_code] = 'listed';
        } else {
          // Needs re-verification (Layer 2)
          const providerData = providers.find((p) => p.npi === snap.npi);
          needsReverification.push({
            npi: snap.npi,
            payer_code: snap.payer_code,
            name: (providerData as any)?.provider_name || null,
          });
          // Tentatively mark as not_listed; will be corrected by re-verification
          ps.payer_statuses[snap.payer_code] = 'not_listed';
        }
      } else {
        ps.payer_statuses[snap.payer_code] = 'listed';
      }
    }

    // Layer 2: Re-verify providers that hit the threshold but haven't been checked
    if (needsReverification.length > 0 && options.fhirClient && options.payerEndpoints) {
      const endpointMap = new Map(options.payerEndpoints.map((ep) => [ep.payer_code, ep]));

      console.log(
        `[AcceptanceGap] Re-verifying ${needsReverification.length} not-listed providers for ${practice.name || practice.id}...`,
      );

      for (const item of needsReverification) {
        const endpoint = endpointMap.get(item.payer_code);
        if (!endpoint) continue;

        try {
          const result = await options.fhirClient.verifyNotListed(item.npi, item.name, endpoint);

          // Update snapshot with re-verification result
          const now = new Date().toISOString();
          await dbFn(
            `payer_directory_snapshots?npi=eq.${item.npi}&payer_code=eq.${item.payer_code}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                last_reverification_at: now,
                reverification_confirmed: !result.found,
                // If found, update the snapshot data and reset counter
                ...(result.found && result.snapshot
                  ? {
                      fhir_practitioner_id: result.snapshot.fhir_practitioner_id,
                      consecutive_not_listed_count: 0,
                    }
                  : {}),
              }),
            },
          );

          // Update the in-memory status
          const ps = statusMap.get(item.npi);
          if (ps) {
            ps.payer_statuses[item.payer_code] = result.found ? 'listed' : 'not_listed';
          }

          if (result.found) {
            console.log(
              `  [reverify] ✓ ${item.npi} FOUND in ${item.payer_code} — false positive corrected`,
            );
          } else {
            console.log(`  [reverify] ✗ ${item.npi} confirmed NOT in ${item.payer_code}`);
          }
        } catch (err) {
          console.warn(`  [reverify] Error for ${item.npi} in ${item.payer_code}:`, err);
          // On error, leave as not_listed (conservative)
        }
      }
    } else if (needsReverification.length > 0 && !options.fhirClient) {
      console.log(
        `[AcceptanceGap] ${needsReverification.length} providers need re-verification ` +
          `but no FHIR client provided. Pass fhirClient + payerEndpoints to enable Layer 2.`,
      );
    }

    // 5. Detect gaps
    const gaps = detectAcceptanceGaps(practice.id, practice.accepted_payers, providerStatuses, {
      name: practice.name,
      url: practice.url,
    });

    if (gaps.length > 0) {
      report.practices_with_gaps++;
      report.total_gaps += gaps.length;
      report.gaps.push(...gaps);

      // Generate Workflow 2 compatible mismatches for warning+ severity
      // Determine signal confidence from acceptance source
      const acceptanceSource = practice.accepted_payers_source || 'assumed';
      const signalType = acceptanceSource === 'admin_entered' ? 'confirmed' : 'indicative';

      for (const gap of gaps) {
        if (gap.severity === 'warning' || gap.severity === 'action') {
          const mismatch = buildAcceptanceGapMismatch({
            practice_website_id: gap.practice_website_id,
            payer_code: gap.payer_code,
            total_providers: gap.total_providers,
            not_listed_count: gap.not_listed_count,
            gap_percentage: gap.gap_percentage,
          });
          // Attach signal metadata for the dashboard
          (mismatch as any).signal_type = signalType;
          (mismatch as any).acceptance_source = acceptanceSource;
          report.mismatches.push(mismatch);
        }
      }
    }
  }

  return report;
}
