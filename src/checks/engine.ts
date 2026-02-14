// checks/engine.ts
// ═══ KairoLogic Scan Engine v2 — Runner ═══

import type { CheckContext, CheckResult, CheckResultWithId, ScanSession } from './types';
import { getChecksForTier } from './registry';
import { fetchNpiOrgBest, fetchNpiProvidersByGeo } from './fetchers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseFetch(path: string, options: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
}

/**
 * Run a full scan for a provider.
 *
 * @param npi - Provider NPI
 * @param url - Provider website URL
 * @param tier - Subscription tier determines which checks run
 * @param triggeredBy - What initiated the scan
 * @param siteSnapshot - Optional pre-crawled site data (if null, will attempt to crawl)
 */
export async function runScan(
  npi: string,
  url: string,
  tier: 'free' | 'report' | 'shield',
  triggeredBy: 'manual' | 'scheduled' | 'drift_monitor' = 'manual',
  siteSnapshot?: any,
): Promise<ScanSession> {
  const startedAt = new Date().toISOString();

  // 1. Create scan session
  const sessionRes = await supabaseFetch('scan_sessions', {
    method: 'POST',
    body: JSON.stringify({
      npi, url, tier, triggered_by: triggeredBy, started_at: startedAt,
    }),
  });
  const sessions = await sessionRes.json();
  const scanId = sessions?.[0]?.id;

  // 2. Pre-fetch shared data (avoids duplicate API calls across checks)
  const context: CheckContext = { npi, url, cache: {} };

  // Fetch NPI org data (needed by NPI-01, NPI-02, NPI-03)
  try {
    context.cache.npiOrgData = await fetchNpiOrgBest(npi);
  } catch (err) {
    console.error(`[Engine] Failed to fetch NPI org data:`, err);
    context.cache.npiOrgData = null;
  }

  // Use provided site snapshot or set null (crawler to be implemented)
  context.cache.siteSnapshot = siteSnapshot || null;

  // Fetch provider roster if tier allows (needed by RST-01, RST-02)
  if ((tier === 'report' || tier === 'shield') && context.cache.npiOrgData) {
    try {
      const org = context.cache.npiOrgData;
      context.cache.npiProviders = await fetchNpiProvidersByGeo(
        org.prac_city, org.prac_state, org.prac_zip
      );
    } catch (err) {
      console.error(`[Engine] Failed to fetch provider roster:`, err);
      context.cache.npiProviders = [];
    }
  }

  // 3. Get checks for this tier
  const checks = getChecksForTier(tier);

  // 4. Run all checks in parallel (with timeout per check)
  const results: CheckResultWithId[] = [];

  const checkPromises = checks.map(async (check) => {
    try {
      const result = await Promise.race([
        check.run(context),
        timeout(15000, `Check ${check.id} timed out`),
      ]) as CheckResult;

      return {
        ...result,
        id: check.id,
        category: check.category,
        tier: check.tier,
        severity: check.severity,
        statuteRef: check.statuteRef,
        name: check.name,
      };
    } catch (err) {
      console.error(`[Engine] Check ${check.id} failed:`, err);
      return {
        id: check.id,
        category: check.category,
        tier: check.tier,
        severity: check.severity,
        statuteRef: check.statuteRef,
        name: check.name,
        status: 'inconclusive' as const,
        score: 0,
        title: `${check.name} — check failed`,
        detail: `An error occurred while running this check`,
      };
    }
  });

  const settled = await Promise.allSettled(checkPromises);
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      results.push(s.value);
    }
  }

  // 5. Calculate composite score
  const scoreable = results.filter(r => r.status !== 'inconclusive');
  const compositeScore = scoreable.length > 0
    ? Math.round(scoreable.reduce((sum, r) => sum + r.score, 0) / scoreable.length)
    : 0;

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  const riskLevel = compositeScore >= 75 ? 'Sovereign'
    : compositeScore >= 50 ? 'Drift'
    : 'Violation';

  // 6. Store check results
  for (const result of results) {
    await supabaseFetch('check_results', {
      method: 'POST',
      body: JSON.stringify({
        scan_id: scanId,
        npi,
        check_id: result.id,
        category: result.category,
        tier: result.tier,
        status: result.status,
        score: result.score,
        title: result.title,
        detail: result.detail,
        evidence: result.evidence || null,
        remediation_steps: result.remediationSteps || null,
        statute_ref: result.statuteRef || null,
        severity: result.severity,
      }),
    });
  }

  // 7. Store mismatch alerts for NPI checks that failed/warned
  const npiResults = results.filter(r =>
    r.category === 'npi-integrity' && (r.status === 'fail' || r.status === 'warn')
  );

  for (const npiResult of npiResults) {
    const dimension = getDimension(npiResult.id);
    const evidence = npiResult.evidence || {};

    // Check if alert already exists (upsert logic)
    const existingRes = await supabaseFetch(
      `mismatch_alerts?npi=eq.${npi}&check_id=eq.${npiResult.id}&status=eq.open&select=id,occurrence_count`
    );
    const existing = await existingRes.json();

    if (existing?.length > 0) {
      // Update existing alert
      await supabaseFetch(`mismatch_alerts?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          last_seen: new Date().toISOString(),
          occurrence_count: (existing[0].occurrence_count || 1) + 1,
          npi_value: evidence.npi_address || evidence.npi_phone || evidence.npi_classification || '',
          site_value: evidence.site_address || evidence.site_phone || evidence.site_specialties?.join(', ') || '',
          delta_detail: npiResult.detail,
          risk_score: npiResult.score,
        }),
      });
    } else {
      // Create new alert
      await supabaseFetch('mismatch_alerts', {
        method: 'POST',
        body: JSON.stringify({
          npi,
          check_id: npiResult.id,
          dimension,
          severity: npiResult.severity,
          npi_value: evidence.npi_address || evidence.npi_phone || evidence.npi_classification || '',
          site_value: evidence.site_address || evidence.site_phone || evidence.site_specialties?.join(', ') || '',
          delta_detail: npiResult.detail,
          risk_score: npiResult.score,
          status: 'open',
        }),
      });
    }
  }

  // 8. Auto-resolve alerts for checks that now pass
  const passingNpiChecks = results.filter(r =>
    r.category === 'npi-integrity' && r.status === 'pass'
  );
  for (const passing of passingNpiChecks) {
    await supabaseFetch(
      `mismatch_alerts?npi=eq.${npi}&check_id=eq.${passing.id}&status=eq.open`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        }),
      }
    );
  }

  // 9. Update scan session with results
  const completedAt = new Date().toISOString();
  if (scanId) {
    await supabaseFetch(`scan_sessions?id=eq.${scanId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        composite_score: compositeScore,
        risk_level: riskLevel,
        checks_total: results.length,
        checks_passed: passed,
        checks_failed: failed,
        checks_warned: warned,
        completed_at: completedAt,
      }),
    });
  }

  // 10. Update registry with latest score
  await supabaseFetch(`registry?npi=eq.${npi}`, {
    method: 'PATCH',
    body: JSON.stringify({
      risk_score: compositeScore,
      risk_level: riskLevel,
      last_scan_timestamp: completedAt,
    }),
  });

  console.log(`[Engine] Scan complete for NPI ${npi}: ${compositeScore}/100 (${riskLevel}) — ${passed}✓ ${failed}✗ ${warned}⚠`);

  return {
    id: scanId,
    npi,
    url,
    tier,
    composite_score: compositeScore,
    risk_level: riskLevel,
    checks_total: results.length,
    checks_passed: passed,
    checks_failed: failed,
    checks_warned: warned,
    results,
    started_at: startedAt,
    completed_at: completedAt,
  };
}

// ── Helpers ──────────────────────────────

function getDimension(checkId: string): string {
  const map: Record<string, string> = {
    'NPI-01': 'address',
    'NPI-02': 'phone',
    'NPI-03': 'taxonomy',
    'RST-01': 'roster_count',
    'RST-02': 'roster_names',
  };
  return map[checkId] || 'unknown';
}

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
}
