// ═══════════════════════════════════════════════════════════════
// ROUTE.TS v3.3 INTEGRATION GUIDE
// 
// Add these changes to your existing app/api/scan/route.ts (v3.2)
// to enable dual-write to the new ledger tables.
// ═══════════════════════════════════════════════════════════════

// ─── STEP 1: Add import at the top of route.ts ────────────────

// Add this alongside your existing imports:
import { writeLedgerData } from '@/lib/ledger-writer';

// ─── STEP 2: Update the engine version constant ───────────────

// Change:
//   const ENGINE = 'SENTRY-3.2.0';
// To:
const ENGINE = 'SENTRY-3.3.0';

// ─── STEP 3: Add dual-write call after existing DB writes ─────

// In your POST handler, after the existing scan_sessions insert
// and check_results inserts, add this block:
//
// Look for the section where you do something like:
//   const scanSession = await supabase.from('scan_sessions').insert(...)
//   for (const finding of findings) { await supabase.from('check_results').insert(...) }
//
// After that block, add:

// ═══ PHASE 2: Dual-write to compliance ledger tables ═══
try {
  const ledgerResult = await writeLedgerData({
    npi,
    url,
    scanSessionId: scanSession.id,  // from your scan_sessions insert
    riskScore: compositeScore,       // your computed composite score
    riskLevel: riskMeterLevel,       // Sovereign/Drift/Violation
    findings: findings,              // your findings array
    cdnDetection: {
      detected: cdnResult?.detected || false,
      provider: cdnResult?.provider || undefined,
      detectedVia: cdnResult?.detectedVia || undefined,
      confidence: cdnResult?.confidence || undefined,
    },
    meta: {
      engine: ENGINE,
      duration: `${Date.now() - startTime}ms`,
      checksPass: findings.filter(f => f.status === 'pass').length,
      checksFail: findings.filter(f => f.status === 'fail').length,
      checksWarn: findings.filter(f => f.status === 'warn').length,
      ip: ipAddress || undefined,        // from your geo lookup
      country: geoCountry || undefined,  // from your geo lookup
      city: geoCity || undefined,        // from your geo lookup
    },
    triggeredBy: 'api',
    // Optional: pass along if you have these
    // mxRecords: mxHosts,
    // thirdPartyScripts: foreignScripts,
    // responseHeaders: relevantHeaders,
  });

  if (ledgerResult.errors.length > 0) {
    console.warn('[LEDGER] Partial write errors:', ledgerResult.errors);
  }
} catch (ledgerErr: any) {
  // Non-fatal: ledger write failure should NOT block the scan response
  console.error('[LEDGER] Write failed:', ledgerErr.message);
}

// ─── STEP 4: Optionally include ledger data in response ───────

// In your JSON response, you can add:
//   ledger: {
//     findingsWritten: ledgerResult?.findingsWritten || 0,
//     practiceGroupId: ledgerResult?.practiceGroupId || null,
//   },

// ═══════════════════════════════════════════════════════════════
// NOTES:
//
// - The ledger write is wrapped in try/catch so it NEVER blocks
//   the scan response. Existing functionality is unaffected.
//
// - The writeLedgerData function handles:
//   * Deduplication: if a finding already exists (same NPI + check_id),
//     it updates rather than creating a duplicate
//   * Auto-remediation: if a previously failing check now passes,
//     the finding is marked as 'remediated'
//   * Practice group lookup: automatically finds the practice group
//     from the registry table
//
// - File placement:
//   * lib/ledger-writer.ts → your project's lib/ directory
//   * Import path @/lib/ledger-writer resolves via tsconfig paths
// ═══════════════════════════════════════════════════════════════
