/**
 * POST /api/admin/practice-payer-sync
 *
 * Two-phase payer sync for a single practice:
 *   Phase 1 (always): Read existing snapshots from DB, run mismatch engine
 *                      against NPPES data, populate payer_directory_mismatches.
 *   Phase 2 (optional): If { refresh: true }, also re-fetch FHIR directories
 *                        and upsert new snapshots before running mismatches.
 *
 * Input: { practice_id: string, refresh?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { FhirDirectoryClient } from '@/lib/payer-directory/fhir-client';
import { detectMismatches, buildAcceptanceGapMismatch } from '@/lib/payer-directory/mismatch-engine';
import type { PayerEndpoint, DirectorySnapshot, NppesProviderData, DirectoryMismatch } from '@/lib/payer-directory/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST'
        ? 'return=minimal,resolution=merge-duplicates'
        : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path.slice(0, 80)}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Practice-level sync lock ──────────────────────────────────
// Prevents concurrent syncs for the same practice from creating race conditions.
// In-memory lock is sufficient for single-instance Vercel deployments.
const activeSyncs = new Map<string, number>(); // practice_id → start timestamp
const SYNC_LOCK_TIMEOUT_MS = 300_000; // 5 minutes max lock duration

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let lockedPracticeId: string | null = null;

  try {
    const { practice_id, refresh } = await request.json();
    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }

    // Check for concurrent sync — reject if another sync is running for this practice
    const existingSync = activeSyncs.get(practice_id);
    if (existingSync && (Date.now() - existingSync) < SYNC_LOCK_TIMEOUT_MS) {
      const elapsedSec = Math.round((Date.now() - existingSync) / 1000);
      return NextResponse.json({
        error: `Sync already in progress for this practice (started ${elapsedSec}s ago). Please wait for it to complete.`,
        retry_after_seconds: 30,
      }, { status: 429 });
    }
    activeSyncs.set(practice_id, startTime);
    lockedPracticeId = practice_id;

    // 1. Get practice providers
    const providers = await db(
      `practice_providers?practice_website_id=eq.${practice_id}&select=npi,provider_name&roster_status=eq.active`
    );
    if (!providers || providers.length === 0) {
      return NextResponse.json({ error: 'No active providers found for this practice' }, { status: 404 });
    }

    const npiList = providers.map((p: any) => p.npi).filter(Boolean);

    // 2. Bulk-fetch NPPES data for all provider NPIs
    //    CRITICAL: If NPPES data is unavailable, mismatch detection is meaningless.
    //    We fail explicitly rather than producing misleading "0 mismatches" results.
    const nppesMap = new Map<string, NppesProviderData>();
    let nppesLoadError: string | null = null;
    if (npiList.length > 0) {
      try {
        const nppesRows = await db(
          `providers?npi=in.(${npiList.join(',')})&select=npi,first_name,last_name,organization_name,address_line_1,address_line_2,city,state,zip:zip_code,phone,taxonomy_code,taxonomy_desc,gender`
        );
        if (nppesRows) {
          for (const row of nppesRows) {
            nppesMap.set(row.npi, {
              npi: row.npi,
              provider_name: row.organization_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
              first_name: row.first_name,
              last_name: row.last_name,
              organization_name: row.organization_name,
              address_line_1: row.address_line_1,
              address_line_2: row.address_line_2,
              city: row.city,
              state: row.state,
              zip: row.zip,
              phone: row.phone,
              taxonomy_code: row.taxonomy_code,
              taxonomy_desc: row.taxonomy_desc,
              gender: row.gender,
            });
          }
        }
        if (nppesMap.size === 0) {
          nppesLoadError = `NPPES returned 0 rows for ${npiList.length} NPIs — mismatch detection will be skipped`;
          console.warn(`[practice-payer-sync] ${nppesLoadError}`);
        }
      } catch (nppesErr) {
        nppesLoadError = `Failed to fetch NPPES data: ${nppesErr instanceof Error ? nppesErr.message : String(nppesErr)}`;
        console.error(`[practice-payer-sync] ${nppesLoadError}`);
      }
    }

    // ═══ Phase 2 (optional): Refresh snapshots from FHIR endpoints ═══
    let fhirRefreshStats = { attempted: 0, upserted: 0, errors: 0 };
    // Capture first N error messages for diagnostics (visible in API response)
    const errorSamples: string[] = [];
    const MAX_ERROR_SAMPLES = 10;
    // Track payers that had FHIR errors (auth failures, config issues).
    // Phase 1 will exclude old snapshots from these payers since the data is unreliable.
    const failedPayers = new Set<string>();
    // Circuit breaker: track consecutive failures per payer.
    // If a payer fails 3+ providers in a row, mark it as failed (likely a systemic issue).
    const consecutiveFailures = new Map<string, number>();
    const CIRCUIT_BREAKER_THRESHOLD = 3;
    if (refresh) {
      const endpoints: PayerEndpoint[] = await db(
        'payer_directory_endpoints?is_active=eq.true&select=*'
      );
      if (endpoints && endpoints.length > 0) {
        const fhirClient = new FhirDirectoryClient();
        const batchId = `admin-sync-${practice_id.slice(0, 8)}-${Date.now()}`;

        for (const provider of providers) {
          if (!provider.npi) continue;
          for (const endpoint of endpoints) {
            if (failedPayers.has(endpoint.payer_code)) continue; // Skip payer if already failed
            fhirRefreshStats.attempted++;
            try {
              const snapshot = await fhirClient.lookupByNpi(provider.npi, endpoint, batchId, provider.provider_name);
              if (!snapshot) continue;

              const isListed = !!snapshot.fhir_practitioner_id;

              // Read existing consecutive count
              let prevCount = 0;
              try {
                const existing = await db(
                  `payer_directory_snapshots?npi=eq.${provider.npi}&payer_code=eq.${endpoint.payer_code}&select=consecutive_not_listed_count&limit=1`
                );
                if (existing?.[0]) prevCount = existing[0].consecutive_not_listed_count || 0;
              } catch { /* first snapshot */ }

              const snapshotRow: Record<string, unknown> = {
                npi: provider.npi,
                payer_code: endpoint.payer_code,
                snapshot_date: snapshot.snapshot_date,
                listed_name_first: snapshot.listed_name_first,
                listed_name_last: snapshot.listed_name_last,
                listed_name_full: snapshot.listed_name_full,
                listed_credentials: snapshot.listed_credentials,
                listed_gender: snapshot.listed_gender,
                listed_address_line1: snapshot.listed_address_line1,
                listed_address_line2: snapshot.listed_address_line2,
                listed_city: snapshot.listed_city,
                listed_state: snapshot.listed_state,
                listed_zip: snapshot.listed_zip,
                listed_phone: snapshot.listed_phone,
                listed_fax: snapshot.listed_fax,
                listed_specialty_code: snapshot.listed_specialty_code,
                listed_specialty_display: snapshot.listed_specialty_display,
                listed_accepting_patients: snapshot.listed_accepting_patients,
                listed_org_name: snapshot.listed_org_name,
                listed_org_npi: snapshot.listed_org_npi,
                listed_network_name: snapshot.listed_network_name,
                listed_plan_names: snapshot.listed_plan_names,
                listed_languages: snapshot.listed_languages,
                listed_telehealth_available: snapshot.listed_telehealth_available,
                listed_office_hours: snapshot.listed_office_hours,
                listed_disability_access: snapshot.listed_disability_access,
                fhir_practitioner_id: snapshot.fhir_practitioner_id,
                fhir_practitioner_role_id: snapshot.fhir_practitioner_role_id,
                fhir_location_id: snapshot.fhir_location_id,
                fhir_organization_id: snapshot.fhir_organization_id,
                fhir_raw_bundle: snapshot.fhir_raw_bundle,
                sync_batch_id: batchId,
                consecutive_not_listed_count: isListed ? 0 : prevCount + 1,
              };

              if (isListed) {
                snapshotRow.reverification_confirmed = null;
                snapshotRow.last_reverification_at = null;
              }

              await db('payer_directory_snapshots?on_conflict=npi,payer_code,snapshot_date', {
                method: 'POST',
                body: JSON.stringify(snapshotRow),
              });
              fhirRefreshStats.upserted++;
              // Reset circuit breaker on success
              consecutiveFailures.set(endpoint.payer_code, 0);

            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              console.warn(`[practice-payer-sync] FHIR error for ${provider.npi}/${endpoint.payer_code}: ${msg}`);
              if (stack) console.warn(`[practice-payer-sync] Stack: ${stack}`);
              // Log full error for DB upsert failures to capture PostgREST error body
              if (msg.includes('DB POST')) {
                console.warn(`[practice-payer-sync] Upsert failed for NPI ${provider.npi}/${endpoint.payer_code} — full error: ${msg}`);
              }
              fhirRefreshStats.errors++;
              if (errorSamples.length < MAX_ERROR_SAMPLES) {
                errorSamples.push(`${provider.npi}/${endpoint.payer_code}: ${msg.slice(0, 200)}`);
              }

              // ── Circuit breaker: immediate trip on auth errors ──
              const isAuthError =
                msg.includes('OAuth') ||
                msg.includes('auth error') ||
                msg.includes('credentials rejected') ||
                msg.includes('FHIR 401') ||
                msg.includes('FHIR 403');
              if (isAuthError) {
                console.warn(`[practice-payer-sync] Auth failure for ${endpoint.payer_code} — skipping remaining providers`);
                failedPayers.add(endpoint.payer_code);
                continue;
              }

              // ── Circuit breaker: consecutive failure tracking ──
              const prevFailCount = consecutiveFailures.get(endpoint.payer_code) || 0;
              consecutiveFailures.set(endpoint.payer_code, prevFailCount + 1);
              if (prevFailCount + 1 >= CIRCUIT_BREAKER_THRESHOLD) {
                console.warn(
                  `[practice-payer-sync] Circuit breaker: ${endpoint.payer_code} failed ${prevFailCount + 1} times consecutively — skipping remaining providers`
                );
                failedPayers.add(endpoint.payer_code);
              }
            }
          }
        }
      }
    }

    // ═══ Phase 1 (always): Read existing snapshots, run mismatch engine ═══

    // Clear existing unresolved mismatches for this practice
    try {
      await db(`payer_directory_mismatches?practice_website_id=eq.${practice_id}&status=eq.open`, {
        method: 'DELETE',
      });
    } catch (delErr) {
      console.warn('[practice-payer-sync] Failed to clear old mismatches:', delErr);
    }

    // Read all current snapshots for this practice's NPIs
    let snapshots: DirectorySnapshot[] = npiList.length > 0
      ? await db(
          `payer_directory_snapshots?npi=in.(${npiList.join(',')})&select=*`
        ) || []
      : [];

    // If refresh was attempted, exclude snapshots from payers that had auth/config errors.
    // Their old "not listed" data is unreliable and would create false acceptance gaps.
    if (refresh && failedPayers.size > 0) {
      const before = snapshots.length;
      snapshots = snapshots.filter((s: DirectorySnapshot) => !failedPayers.has(s.payer_code));
      console.log(
        `[practice-payer-sync] Excluded ${before - snapshots.length} snapshots from failed payers: ${[...failedPayers].join(', ')}`
      );
    }

    let mismatchesCreated = 0;
    const allMismatches: DirectoryMismatch[] = [];
    const payerStats = new Map<string, { total: number; notListed: number }>();

    // Run mismatch detection for each snapshot
    for (const snapshot of snapshots) {
      const isListed = !!snapshot.fhir_practitioner_id;

      // Track per-payer stats for acceptance gap
      const stats = payerStats.get(snapshot.payer_code) || { total: 0, notListed: 0 };
      stats.total++;
      if (!isListed) stats.notListed++;
      payerStats.set(snapshot.payer_code, stats);

      // Run mismatch detection against NPPES
      const nppesData = nppesMap.get(snapshot.npi);
      if (nppesData) {
        try {
          const mismatches = detectMismatches(nppesData, snapshot, practice_id);
          if (mismatches.length > 0) {
            allMismatches.push(...mismatches);
            for (const m of mismatches) {
              await db('payer_directory_mismatches', {
                method: 'POST',
                body: JSON.stringify({
                  npi: m.npi,
                  payer_code: m.payer_code,
                  practice_website_id: m.practice_website_id,
                  field_name: m.field_name,
                  mismatch_type: m.mismatch_type,
                  nppes_value: m.nppes_value,
                  website_value: m.website_value,
                  payer_value: m.payer_value,
                  recommended_value: m.recommended_value,
                  priority: m.priority,
                  fix_via_caqh: m.fix_via_caqh,
                  fix_instructions: m.fix_instructions,
                  status: 'open',
                }),
              });
              mismatchesCreated++;
            }
          }
        } catch (mismatchErr) {
          console.warn(`[practice-payer-sync] Mismatch error for ${snapshot.npi}/${snapshot.payer_code}:`, mismatchErr);
        }
      }
    }

    // Acceptance gap detection per payer
    let acceptanceGapsCreated = 0;
    for (const [payerCode, stats] of payerStats) {
      if (stats.total > 0 && stats.notListed > 0) {
        const gapPct = Math.round((stats.notListed / stats.total) * 100);
        if (gapPct >= 20) {
          try {
            const gapMismatch = buildAcceptanceGapMismatch({
              practice_website_id: practice_id,
              payer_code: payerCode,
              total_providers: stats.total,
              not_listed_count: stats.notListed,
              gap_percentage: gapPct,
            });
            allMismatches.push(gapMismatch);
            await db('payer_directory_mismatches', {
              method: 'POST',
              body: JSON.stringify({
                npi: gapMismatch.npi,
                payer_code: gapMismatch.payer_code,
                practice_website_id: gapMismatch.practice_website_id,
                field_name: gapMismatch.field_name,
                mismatch_type: gapMismatch.mismatch_type,
                nppes_value: gapMismatch.nppes_value,
                website_value: gapMismatch.website_value,
                payer_value: gapMismatch.payer_value,
                recommended_value: gapMismatch.recommended_value,
                priority: gapMismatch.priority,
                fix_via_caqh: gapMismatch.fix_via_caqh,
                fix_instructions: gapMismatch.fix_instructions,
                status: 'open',
                signal_type: 'indicative',
                acceptance_source: 'assumed',
              }),
            });
            acceptanceGapsCreated++;
            mismatchesCreated++;
          } catch (gapErr) {
            console.warn(`[practice-payer-sync] Acceptance gap error for ${payerCode}:`, gapErr);
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const listed = snapshots.filter((s: DirectorySnapshot) => !!s.fhir_practitioner_id).length;
    const notListed = snapshots.filter((s: DirectorySnapshot) => !s.fhir_practitioner_id).length;

    // Build warnings array for issues that didn't prevent sync but affect data quality
    const warnings: string[] = [];
    if (nppesLoadError) {
      warnings.push(`NPPES: ${nppesLoadError}`);
    }
    if (failedPayers.size > 0) {
      warnings.push(`Failed payers (circuit breaker): ${[...failedPayers].join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      practice_id,
      providers_checked: npiList.length,
      snapshots_analyzed: snapshots.length,
      listed,
      not_listed: notListed,
      mismatches_detected: allMismatches.length,
      mismatches_upserted: mismatchesCreated,
      acceptance_gaps: acceptanceGapsCreated,
      fhir_refresh: refresh ? { ...fhirRefreshStats, failed_payers: [...failedPayers], error_samples: errorSamples } : null,
      warnings: warnings.length > 0 ? warnings : undefined,
      elapsed_seconds: parseFloat(elapsed),
      message: `Analyzed ${snapshots.length} snapshots for ${npiList.length} providers in ${elapsed}s. Listed: ${listed}, Not listed: ${notListed}. Mismatches: ${allMismatches.length}`,
    });

  } catch (err) {
    console.error('[practice-payer-sync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payer sync failed' },
      { status: 500 },
    );
  } finally {
    // Always release the practice-level sync lock
    if (lockedPracticeId) {
      activeSyncs.delete(lockedPracticeId);
    }
  }
}
