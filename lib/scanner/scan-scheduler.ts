// lib/scanner/scan-scheduler.ts
// ═══ KairoLogic Practice Website Scan Scheduler ═══
// Task 1.10: Extends existing scanner with weekly cadence per practice_id,
// tier-based frequency, and delta tracking.
// Task 1.12: Auto-populates practice_providers from scan results.
//
// The scheduler:
//   1. Queries practice_websites for sites due for rescan
//   2. Crawls each site via crawler.ts
//   3. Runs address extraction (lib/address/)
//   4. Extracts provider names from HTML
//   5. Auto-populates practice_providers with DETECTED associations
//   6. Updates provider_sites with extraction results
//   7. Triggers compliance checks via scan engine
//   8. Updates scan metadata on practice_websites
//
// Scan tier cadence:
//   monthly  → 30 days between scans (free/starter)
//   weekly   → 7 days (practice plan)
//   daily    → 1 day (CVO/network plan)

import { isValidProviderName } from './name-quality-filter';
import { isBlockedDomain } from './domain-blocklist';
import { crawlPage, type CrawlResult } from '../crawler';
import { extractAddressFromSite, type ExtractionSummary } from '../address/index';
import {
  saveExtractionToProviderSites,
  saveExtractionToPracticeProviders,
} from '../address/scan-plugin';
import {
  triggerWorkflowsForPractice,
  triggerDepartureWorkflow,
  triggerComplianceWorkflows,
  triggerPayerDirectoryWorkflows,
  triggerLicenseRenewalWorkflows,
} from './trigger-workflows';
import { runDeltaDetection } from './delta-engine';
import { extractAcceptedPayers, type PayerExtractionResult } from './payer-acceptance-extractor';
import {
  runComplianceChecks,
  getActionableFindings,
  type ComplianceScanResult,
} from './compliance-checks';

// ── Types ────────────────────────────────────────────────

export interface PracticeWebsite {
  id: string;
  practice_group_id: string | null;
  organization_id: string | null;
  npi: string | null;
  name: string | null;
  url: string;
  state: string | null;
  scan_tier: 'monthly' | 'weekly' | 'daily';
  scan_scheduled_at: string | null;
  last_scan_at: string | null;
  scan_status: string;
  consecutive_errors: number;
  provider_count: number;
  mismatch_count: number;
}

export interface ScanResult {
  practice_website_id: string;
  url: string;
  success: boolean;
  crawl_strategy: string;
  extraction: ExtractionSummary | null;
  providers_detected: string[]; // provider names found on site
  providers_matched: MatchedProvider[];
  payer_extraction: PayerExtractionResult | null; // #111: insurance accepted on website
  compliance_scan: ComplianceScanResult | null; // WF6: compliance check results
  delta_count: number; // delta events created by delta engine
  scan_duration_ms: number;
  error?: string;
}

export interface MatchedProvider {
  npi: string;
  name: string;
  match_method: 'npi_on_page' | 'name_fuzzy';
  confidence: number;
}

export interface SchedulerResult {
  sites_scanned: number;
  sites_succeeded: number;
  sites_failed: number;
  providers_detected: number;
  providers_matched: number;
  new_associations: number;
  departures_detected: number;
  total_duration_ms: number;
}

// ── Supabase Client ──────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Scan Cadence Logic ───────────────────────────────────

const CADENCE_DAYS: Record<string, number> = {
  monthly: 30,
  weekly: 7,
  daily: 1,
};

/**
 * Fetch practice websites that are due for a rescan based on their
 * scan_tier cadence and last_scan_at timestamp.
 */
export async function fetchDueSites(
  limit: number = 50,
  forceAll: boolean = false,
): Promise<PracticeWebsite[]> {
  const now = new Date().toISOString();

  if (forceAll) {
    // Scan everything regardless of schedule
    return db(
      `practice_websites?scan_status=neq.unreachable&select=*&order=last_scan_at.asc.nullsfirst&limit=${limit}`,
    );
  }

  // Fetch sites where:
  // - scan_scheduled_at is null (never scheduled) OR scan_scheduled_at <= now
  // - scan_status is not 'unreachable'
  return db(
    `practice_websites?scan_status=neq.unreachable&or=(scan_scheduled_at.is.null,scan_scheduled_at.lte.${now})&select=*&order=scan_scheduled_at.asc.nullsfirst&limit=${limit}`,
  );
}

/**
 * Calculate the next scan time based on tier cadence.
 */
function nextScanTime(tier: string): string {
  const days = CADENCE_DAYS[tier] || 30;
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

// ── Provider Matching ────────────────────────────────────

/**
 * Match detected provider names against the providers table.
 * Two strategies:
 *   1. NPI found on page (highest confidence)
 *   2. Name fuzzy match against providers in the same state
 */
async function matchProviders(
  names: string[],
  html: string,
  state: string | null,
): Promise<MatchedProvider[]> {
  const matched: MatchedProvider[] = [];
  const seen = new Set<string>();

  // Strategy 1: Find NPIs directly on the page
  const npiRegex = /\b(1\d{9})\b/g;
  let npiMatch: RegExpExecArray | null;
  const pageNpis: string[] = [];

  // Search in text content only (strip tags)
  const textContent = html.replace(/<[^>]+>/g, ' ');
  while ((npiMatch = npiRegex.exec(textContent)) !== null) {
    const candidate = npiMatch[1];
    if (!pageNpis.includes(candidate)) pageNpis.push(candidate);
  }

  // Verify each NPI against providers table
  if (pageNpis.length > 0 && pageNpis.length <= 100) {
    const npiList = pageNpis.map((n) => `"${n}"`).join(',');
    const providers: any[] = await db(
      `providers?npi=in.(${npiList})&entity_type_code=eq.1&deactivation_date=is.null&select=npi,first_name,last_name`,
    );

    for (const p of providers) {
      if (!seen.has(p.npi)) {
        seen.add(p.npi);
        matched.push({
          npi: p.npi,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          match_method: 'npi_on_page',
          confidence: 0.99,
        });
      }
    }
  }

  // Strategy 2: Name matching against state providers
  if (state && names.length > 0 && names.length <= 50) {
    const cleanNames = names.filter(isValidProviderName);
    for (const name of cleanNames) {
      // Parse name into parts
      const parts = name.replace(/^Dr\.?\s*/i, '').split(/\s+/);
      if (parts.length < 2) continue;

      const lastName = parts[parts.length - 1];
      // Remove credential suffixes
      const cleanLast = lastName
        .replace(/,?\s*(MD|DO|NP|PA|DPM|DDS|DMD|OD|PhD|APRN|FNP|DNP)$/i, '')
        .trim();
      if (!cleanLast || cleanLast.length < 2) continue;

      const encoded = encodeURIComponent(cleanLast.toLowerCase());
      const candidates: any[] = await db(
        `providers?last_name=ilike.${encoded}&state=eq.${state}&entity_type_code=eq.1&deactivation_date=is.null&select=npi,first_name,last_name&limit=20`,
      );

      for (const c of candidates) {
        if (seen.has(c.npi)) continue;

        // Check first name similarity
        const firstName = parts[0];
        const candidateFirst = c.first_name || '';
        const sim = jaroWinklerSimple(firstName.toLowerCase(), candidateFirst.toLowerCase());

        if (sim >= 0.85) {
          seen.add(c.npi);
          matched.push({
            npi: c.npi,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            match_method: 'name_fuzzy',
            confidence: parseFloat((sim * 0.9).toFixed(2)), // cap at 0.90 for fuzzy
          });
        }
      }
    }
  }

  return matched;
}

// ── practice_providers Management (Task 1.12) ────────────

/**
 * Auto-populate practice_providers from scan results.
 * Handles new detections, confirmations, and departures.
 */
async function updatePracticeProviders(
  practiceWebsiteId: string,
  matchedProviders: MatchedProvider[],
): Promise<{ newAssociations: number; departures: number }> {
  let newAssociations = 0;
  let departures = 0;

  // Fetch current associations for this practice
  const current: any[] = await db(
    `practice_providers?practice_website_id=eq.${practiceWebsiteId}&select=id,npi,status,last_seen_at`,
  );

  const currentNpis = new Set(current.map((c) => c.npi));
  const detectedNpis = new Set(matchedProviders.map((m) => m.npi));
  const now = new Date().toISOString();

  // 1. New detections: provider found on site but not in practice_providers
  for (const provider of matchedProviders) {
    if (!currentNpis.has(provider.npi)) {
      // Insert new association
      await db('practice_providers', {
        method: 'POST',
        body: JSON.stringify({
          practice_website_id: practiceWebsiteId,
          npi: provider.npi,
          provider_name: provider.name,
          association_source: 'DETECTED',
          status: 'UNVERIFIED',
          first_detected_at: now,
          last_seen_at: now,
        }),
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      });
      newAssociations++;
    } else {
      // Update last_seen_at for existing associations
      const existing = current.find((c) => c.npi === provider.npi);
      if (existing) {
        await db(`practice_providers?id=eq.${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            last_seen_at: now,
            status: existing.status === 'DEPARTED' ? 'ACTIVE' : existing.status,
          }),
        });
      }
    }
  }

  // 2. Departures: provider in practice_providers but NOT found on site
  for (const assoc of current) {
    if (
      !detectedNpis.has(assoc.npi) &&
      assoc.status !== 'DEPARTED' &&
      assoc.status !== 'SUSPENDED'
    ) {
      // Check if they've been missing for multiple scan cycles
      const lastSeen = assoc.last_seen_at ? new Date(assoc.last_seen_at) : null;
      const daysSinceLastSeen = lastSeen
        ? (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      // Only mark as departed after 2+ missed scan cycles (14+ days for weekly)
      if (daysSinceLastSeen >= 14) {
        await db(`practice_providers?id=eq.${assoc.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'DEPARTED',
            departed_at: now,
          }),
        });
        departures++;

        // WF4: Auto-trigger release workflow for departed provider
        try {
          await triggerDepartureWorkflow(practiceWebsiteId, assoc.npi, assoc.provider_name || '');
        } catch (err) {
          console.warn(`[Scanner] Failed to trigger departure workflow for NPI ${assoc.npi}:`, err);
        }
      }
    }
  }

  // 3. Update cached counts on practice_websites
  const activeCount = matchedProviders.length;
  const mismatchRows: any[] = await db(
    `practice_providers?practice_website_id=eq.${practiceWebsiteId}&active_mismatch_count=gt.0&select=id`,
  );

  await db(`practice_websites?id=eq.${practiceWebsiteId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      provider_count: activeCount,
      mismatch_count: mismatchRows.length,
    }),
  });

  return { newAssociations, departures };
}

// ── Single Site Scan ─────────────────────────────────────

/**
 * Run a complete scan cycle for one practice website:
 * crawl → extract address → extract providers → match → update associations
 */
export async function scanSite(site: PracticeWebsite): Promise<ScanResult> {
  const startTime = Date.now();
  const result: ScanResult = {
    practice_website_id: site.id,
    url: site.url,
    success: false,
    crawl_strategy: 'none',
    extraction: null,
    providers_detected: [],
    providers_matched: [],
    payer_extraction: null,
    compliance_scan: null,
    delta_count: 0,
    scan_duration_ms: 0,
  };

  try {
    // 0. Domain blocklist pre-flight guard
    if (isBlockedDomain(site.url)) {
      console.log(`[Scheduler] Blocked (directory): ${site.url}`);
      await db(`practice_websites?id=eq.${site.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scan_status: 'unreachable',
          last_error: 'Blocked: directory or aggregator domain',
          updated_at: new Date().toISOString(),
        }),
      });
      result.error = 'Blocked: directory or aggregator domain';
      result.scan_duration_ms = Date.now() - startTime;
      return result;
    }

    // 1. Crawl the page
    const crawl = await crawlPage(site.url);
    result.crawl_strategy = crawl.strategy;

    if (!crawl.success) {
      result.error = crawl.error || 'Crawl failed';
      return result;
    }

    // 2. Run address extraction (with sub-page discovery)
    const extraction = await extractAddressFromSite(site.url, crawl.html, crawl.text, {
      maxSubPages: 3,
    });
    result.extraction = extraction;
    result.providers_detected = extraction.provider_names;

    // 3. Match detected providers against providers table
    const matched = await matchProviders(extraction.provider_names, crawl.html, site.state);
    result.providers_matched = matched;

    // 3b. Extract accepted payers from website (#111)
    try {
      let payerResult = extractAcceptedPayers(crawl.html, crawl.text, site.state);

      // Sub-page fallback: if main page found few/no payers, discover insurance sub-pages
      if (payerResult.accepted_payers.length < 3) {
        try {
          const { discoverPayerPages } = await import('../address/page-discoverer');
          const subPages = await discoverPayerPages(site.url, crawl.html, 2);

          for (const subPage of subPages) {
            if (!subPage.crawlResult?.success) continue;
            const subResult = extractAcceptedPayers(
              subPage.crawlResult.html,
              subPage.crawlResult.text,
              site.state,
            );
            if (subResult.accepted_payers.length > payerResult.accepted_payers.length) {
              payerResult = {
                ...subResult,
                extraction_source: 'section' as const, // found on sub-page
              };
              console.log(
                `[Scanner] Sub-page payer discovery: found ${subResult.accepted_payers.length} payers on ${subPage.url}`,
              );
            }
          }
        } catch (subErr) {
          // Non-critical — sub-page discovery is best-effort
          console.warn(`[Scanner] Sub-page payer discovery failed:`, subErr);
        }
      }

      result.payer_extraction = payerResult;

      if (payerResult.accepted_payers.length > 0) {
        console.log(
          `[Scanner] Payer acceptance: ${payerResult.accepted_payers.join(', ')} ` +
            `(${payerResult.confidence} confidence, source: ${payerResult.extraction_source})`,
        );

        // Write accepted_payers to practice_websites
        await db(`practice_websites?id=eq.${site.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            accepted_payers: payerResult.accepted_payers,
            accepted_payers_extracted_at: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.warn(`[Scanner] Payer extraction failed for ${site.url}:`, err);
    }

    // 3c. Run compliance checks (WF6: DR/AI/ER scans)
    try {
      // Build response headers map from crawl result (if available)
      const responseHeaders: Record<string, string> = {};
      if (crawl.headers) {
        for (const [k, v] of Object.entries(crawl.headers)) {
          responseHeaders[k.toLowerCase()] = String(v).toLowerCase();
        }
      }

      const complianceResult = await runComplianceChecks({
        url: site.url,
        html: crawl.html,
        text: crawl.text,
        responseHeaders,
      });
      result.compliance_scan = complianceResult;

      if (complianceResult.failing_count > 0 || complianceResult.warning_count > 0) {
        console.log(
          `[Scanner] Compliance: ${complianceResult.composite_score}/100 (${complianceResult.risk_level}) — ` +
            `${complianceResult.failing_count} fails, ${complianceResult.warning_count} warns`,
        );
      }
    } catch (err) {
      console.warn(`[Scanner] Compliance checks failed for ${site.url}:`, err);
    }

    // 4. Update practice_providers (Task 1.12)
    await updatePracticeProviders(site.id, matched);

    // 4a. Aggregate practice-level specialties from matched providers
    // Uses web_specialty when available, falls back to NPPES taxonomy_desc
    try {
      if (matched.length > 0) {
        // Fetch NPPES taxonomy for matched providers as fallback
        const npis = matched.map((m) => m.npi);
        const npiList = npis.map((n) => `"${n}"`).join(',');
        const npiProviders = await db(`providers?npi=in.(${npiList})&select=npi,taxonomy_desc`);
        const taxonomyMap: Record<string, string> = {};
        for (const p of npiProviders || []) {
          if (p.taxonomy_desc) taxonomyMap[p.npi] = p.taxonomy_desc;
        }

        // Also check web_specialty from practice_providers
        const ppRows = await db(
          `practice_providers?practice_website_id=eq.${site.id}&npi=in.(${npiList})&select=npi,web_specialty`,
        );
        const webSpecMap: Record<string, string> = {};
        for (const pp of ppRows || []) {
          if (pp.web_specialty) webSpecMap[pp.npi] = pp.web_specialty;
        }

        // Build specialty list: prefer web_specialty, fall back to NPPES taxonomy
        const specialtyCounts: Record<string, number> = {};
        for (const npi of npis) {
          const spec = webSpecMap[npi] || taxonomyMap[npi];
          if (spec) {
            // Clean up schema.org URLs and normalize
            const cleaned = spec
              .replace(/^https?:\/\/(schema\.org|www\.productontology\.org\/id)\//i, '')
              .replace(/([a-z])([A-Z])/g, '$1 $2'); // CamelCase to spaces
            specialtyCounts[cleaned] = (specialtyCounts[cleaned] || 0) + 1;
          }
        }

        const specialties = Object.entries(specialtyCounts).map(([specialty, count]) => ({
          specialty,
          provider_count: count,
        }));

        if (specialties.length > 0) {
          await db(`practice_websites?id=eq.${site.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              practice_specialties: specialties,
              updated_at: new Date().toISOString(),
            }),
          });
          console.log(
            `[Scanner] Practice specialties: ${specialties.map((s) => `${s.specialty} (${s.provider_count})`).join(', ')}`,
          );
        }
      }
    } catch (err) {
      console.warn(`[Scanner] Failed to aggregate specialties for ${site.url}:`, err);
    }

    // 5. Save extraction to provider_sites (for each matched NPI)
    for (const provider of matched) {
      try {
        await saveExtractionToProviderSites(provider.npi, site.url, extraction);
        await saveExtractionToPracticeProviders(provider.npi, site.id, extraction);
      } catch (err) {
        console.warn(`[Scanner] Failed to save extraction for NPI ${provider.npi}:`, err);
      }
    }

    // 5b. Backfill: ensure ALL providers at this practice have web_address.
    // Some providers (e.g., matched by NPI-on-page) may not have gotten
    // the address from saveExtractionToPracticeProviders if the extractor
    // didn't produce a best_address. Use the practice-level address as fallback.
    const practiceAddress =
      extraction.best_address?.address?.full_address ||
      (extraction.all_addresses?.length > 0
        ? extraction.all_addresses[0]?.address?.full_address
        : null);

    if (practiceAddress) {
      const practicePhone = extraction.phone?.phone || null;
      try {
        // Update providers that still have no web_address
        await db(`practice_providers?practice_website_id=eq.${site.id}&web_address=is.null`, {
          method: 'PATCH',
          body: JSON.stringify({
            web_address: practiceAddress,
            ...(practicePhone ? { web_phone: practicePhone } : {}),
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn(`[Scanner] Failed to backfill web_address for practice ${site.id}:`, err);
      }
    }

    // 5c. Run delta detection: compare web extraction against NPPES + state board
    // This populates nppes_delta_events and sets mismatch flags on practice_providers
    // (has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch)
    try {
      const deltaResult = await runDeltaDetection(site.id);
      if (deltaResult.deltas_created > 0) {
        console.log(
          `[Scanner] Delta detection: ${deltaResult.deltas_created} deltas for ${deltaResult.providers_with_deltas} providers ` +
            `(${deltaResult.high_confidence} high, ${deltaResult.medium_confidence} medium confidence) at practice ${site.id}`,
        );
      }
      result.delta_count = deltaResult.deltas_created;
    } catch (err) {
      console.warn(`[Scanner] Failed to run delta detection for practice ${site.id}:`, err);
    }

    result.success = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown scan error';
  }

  result.scan_duration_ms = Date.now() - startTime;
  return result;
}

// ── Update Scan Metadata ─────────────────────────────────

async function updateScanMetadata(site: PracticeWebsite, result: ScanResult): Promise<void> {
  const now = new Date().toISOString();

  if (result.success) {
    await db(`practice_websites?id=eq.${site.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        last_scan_at: now,
        scan_scheduled_at: nextScanTime(site.scan_tier),
        scan_status: 'healthy',
        consecutive_errors: 0,
        last_error: null,
        updated_at: now,
      }),
    });
  } else {
    const newErrors = site.consecutive_errors + 1;
    const status = newErrors >= 5 ? 'unreachable' : 'error';

    await db(`practice_websites?id=eq.${site.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        scan_scheduled_at: nextScanTime(site.scan_tier),
        scan_status: status,
        consecutive_errors: newErrors,
        last_error: result.error || 'Unknown error',
        updated_at: now,
      }),
    });
  }

  // Compute practice-level scan scores from provider mismatch data
  let compositeScore: number | null = null;
  let riskLevel: string | null = null;
  let checksTotal = 0;
  let checksPassed = 0;
  let checksFailed = 0;

  if (result.success) {
    try {
      // Fetch current mismatch status for all providers at this practice
      const providers: any[] = await db(
        `practice_providers?practice_website_id=eq.${site.id}&select=npi,active_mismatch_count,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,has_name_mismatch,has_license_issue`,
      );

      checksTotal = providers.length;
      checksPassed = providers.filter(
        (p) => p.active_mismatch_count === 0 && !p.has_license_issue,
      ).length;
      checksFailed = providers.filter(
        (p) => p.active_mismatch_count > 0 || p.has_license_issue,
      ).length;

      // Score: percentage of providers with clean data (0-100)
      compositeScore = checksTotal > 0 ? Math.round((checksPassed / checksTotal) * 100) : 100;

      riskLevel = compositeScore >= 80 ? 'Low' : compositeScore >= 50 ? 'Medium' : 'High';
    } catch (err) {
      console.warn(`[Scanner] Failed to compute scan scores for practice ${site.id}:`, err);
    }
  }

  // Create scan_session record with scores
  await db('scan_sessions', {
    method: 'POST',
    body: JSON.stringify({
      npi: site.npi || 'PRACTICE',
      url: site.url,
      tier: site.scan_tier,
      triggered_by: 'scheduled',
      started_at: now,
      completed_at: now,
      practice_website_id: site.id,
      practice_group_id: site.practice_group_id,
      delta_count: result.delta_count || 0,
      composite_score: compositeScore,
      risk_level: riskLevel,
      checks_total: checksTotal,
      checks_passed: checksPassed,
      checks_failed: checksFailed,
    }),
    headers: { Prefer: 'return=minimal' },
  });

  // 6. Trigger workflows and alerts for providers with mismatches
  // This ensures every detected mismatch has an actionable workflow
  // and alert in the dashboard.
  if (result.success) {
    try {
      const wfResult = await triggerWorkflowsForPractice(site.id);
      if (wfResult.workflows_created > 0) {
        console.log(
          `[Scanner] Created ${wfResult.workflows_created} workflows, ${wfResult.alerts_created} alerts for practice ${site.id}`,
        );
      }
    } catch (err) {
      console.warn(`[Scanner] Failed to trigger workflows for practice ${site.id}:`, err);
    }

    // 7. WF6: Trigger compliance workflows for actionable findings
    if (result.compliance_scan) {
      try {
        const actionable = getActionableFindings(result.compliance_scan.findings);
        if (actionable.length > 0) {
          const compWfResult = await triggerComplianceWorkflows(
            site.id,
            actionable.map((f) => ({
              check_id: f.id,
              name: f.name,
              status: f.status as 'fail' | 'warn',
              severity: f.severity,
              category: f.category,
              detail: f.detail,
              clause: f.clause,
              recommended_fix: f.recommended_fix,
            })),
          );
          if (compWfResult.workflows_created > 0) {
            console.log(
              `[Scanner] Created ${compWfResult.workflows_created} compliance workflows for practice ${site.id}`,
            );
          }
        }
      } catch (err) {
        console.warn(
          `[Scanner] Failed to trigger compliance workflows for practice ${site.id}:`,
          err,
        );
      }
    }

    // 8. Trigger payer directory workflows from acceptance gap mismatches
    try {
      const payerWfResult = await triggerPayerDirectoryWorkflows(site.id);
      if (payerWfResult.workflows_created > 0) {
        console.log(
          `[Scanner] Created ${payerWfResult.workflows_created} payer directory workflows for practice ${site.id}`,
        );
      }
    } catch (err) {
      console.warn(
        `[Scanner] Failed to trigger payer directory workflows for practice ${site.id}:`,
        err,
      );
    }

    // 9. Trigger license renewal workflows for providers with license issues
    try {
      const licWfResult = await triggerLicenseRenewalWorkflows(site.id);
      if (licWfResult.workflows_created > 0) {
        console.log(
          `[Scanner] Created ${licWfResult.workflows_created} license renewal workflows for practice ${site.id}`,
        );
      }
    } catch (err) {
      console.warn(
        `[Scanner] Failed to trigger license renewal workflows for practice ${site.id}:`,
        err,
      );
    }
  }
}

// ── Main Scheduler Loop ──────────────────────────────────

/**
 * Run the scan scheduler: fetch due sites, scan each one, update metadata.
 *
 * @param options.limit - Max sites per run (default 50)
 * @param options.forceAll - Ignore schedule, scan everything
 * @param options.dryRun - Crawl and extract but don't write to DB
 * @param options.concurrency - Max parallel scans (default 3)
 */
export async function runScheduler(
  options: {
    limit?: number;
    forceAll?: boolean;
    dryRun?: boolean;
    concurrency?: number;
    onProgress?: (scanned: number, total: number) => void;
  } = {},
): Promise<SchedulerResult> {
  const { limit = 50, forceAll = false, dryRun = false, concurrency = 5, onProgress } = options;

  const startTime = Date.now();

  // Fetch sites due for scanning
  const sites = await fetchDueSites(limit, forceAll);

  if (sites.length === 0) {
    console.log('[Scheduler] No sites due for scanning.');
    return {
      sites_scanned: 0,
      sites_succeeded: 0,
      sites_failed: 0,
      providers_detected: 0,
      providers_matched: 0,
      new_associations: 0,
      departures_detected: 0,
      total_duration_ms: Date.now() - startTime,
    };
  }

  console.log(`[Scheduler] ${sites.length} sites due for scanning.`);

  const result: SchedulerResult = {
    sites_scanned: 0,
    sites_succeeded: 0,
    sites_failed: 0,
    providers_detected: 0,
    providers_matched: 0,
    new_associations: 0,
    departures_detected: 0,
    total_duration_ms: 0,
  };

  // Process in batches for concurrency control
  for (let i = 0; i < sites.length; i += concurrency) {
    const batch = sites.slice(i, i + concurrency);

    const scanPromises = batch.map(async (site) => {
      const scanResult = await scanSite(site);

      if (!dryRun) {
        await updateScanMetadata(site, scanResult);
      }

      return { site, scanResult };
    });

    const settled = await Promise.allSettled(scanPromises);

    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { site, scanResult } = s.value;
        result.sites_scanned++;

        if (scanResult.success) {
          result.sites_succeeded++;
          result.providers_detected += scanResult.providers_detected.length;
          result.providers_matched += scanResult.providers_matched.length;
        } else {
          result.sites_failed++;
          console.warn(`[Scheduler] Failed: ${site.url} — ${scanResult.error}`);
        }
      } else {
        result.sites_scanned++;
        result.sites_failed++;
        console.error(`[Scheduler] Error:`, s.reason);
      }
    }

    if (onProgress) {
      onProgress(result.sites_scanned, sites.length);
    }
  }

  result.total_duration_ms = Date.now() - startTime;
  return result;
}

// ── Jaro-Winkler (simplified, no external dep) ──────────

function jaroWinklerSimple(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const matchWindow = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const s1m = new Array(s1.length).fill(false);
  const s2m = new Array(s2.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const lo = Math.max(0, i - matchWindow);
    const hi = Math.min(i + matchWindow + 1, s2.length);
    for (let j = lo; j < hi; j++) {
      if (s2m[j] || s1[i] !== s2[j]) continue;
      s1m[i] = true;
      s2m[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1m[i]) continue;
    while (!s2m[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}
