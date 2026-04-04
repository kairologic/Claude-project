#!/usr/bin/env npx tsx
/**
 * scripts/analyze-payer-priority.ts
 * ════════════════════════════════════════════════════════════════
 * KairoLogic — Phase 1A Task 12: Payer Discovery Analysis
 * ════════════════════════════════════════════════════════════════
 *
 * Analyzes the "Insurance Accepted" data extracted during the Task 7
 * website crawl to identify which NEW payers appear most frequently
 * across TX providers — beyond the initial 6 we already integrate.
 *
 * Outputs a priority-ranked payer list with:
 *   - Frequency (how many TX providers mention this payer)
 *   - Market coverage estimate
 *   - Whether FHIR API integration is known / TBD
 *   - Recommended priority tier (P0/P1/P2)
 *
 * Usage:
 *   npx tsx scripts/analyze-payer-priority.ts
 *   npx tsx scripts/analyze-payer-priority.ts --output payer-priority.json
 *   npx tsx scripts/analyze-payer-priority.ts --min-mentions 10
 *
 * Environment:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

// ── Config ────────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}

// ── CLI Args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getVal = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
};
const OUTPUT_FILE  = getVal('--output');
const MIN_MENTIONS = parseInt(getVal('--min-mentions') || '5', 10);

// ── Known payer integrations ──────────────────────────────────────
// These are already integrated in Phase 1A Step 1 (Tasks 8-9).
// We use this set to distinguish NEW payers from existing ones.

const ALREADY_INTEGRATED = new Set([
  'aetna', 'uhc', 'cigna', 'humana', 'bcbs_tx', 'medicare',
  'bcbs', 'bcbs_ca',  // generic BCBS variants
]);

// ── Known FHIR API status (from research + strategy doc) ─────────

interface PayerAPIInfo {
  name: string;
  fhir_status: 'confirmed' | 'likely' | 'tbd' | 'scrape_only';
  fhir_notes: string;
  tx_lives_estimate?: string;   // estimated TX member lives
  cms_interoperability: boolean; // CMS mandated FHIR (most large payers)
}

const KNOWN_PAYER_API_INFO: Record<string, PayerAPIInfo> = {
  centene: {
    name: 'Centene / Superior HealthPlan',
    fhir_status: 'confirmed',
    fhir_notes: 'Confirmed FHIR R4 (DA VINCI PDex). Superior HealthPlan is TX Medicaid arm.',
    tx_lives_estimate: '1.8M (TX Medicaid)',
    cms_interoperability: true,
  },
  molina: {
    name: 'Molina Healthcare',
    fhir_status: 'confirmed',
    fhir_notes: 'CMS mandated FHIR compliant. TX Medicaid + Marketplace.',
    tx_lives_estimate: '~500K',
    cms_interoperability: true,
  },
  'united_medicaid': {
    name: 'UnitedHealth / Community Plan (Medicaid)',
    fhir_status: 'likely',
    fhir_notes: 'UHC Medicaid arm separate from commercial FHIR. DA VINCI likely.',
    cms_interoperability: true,
  },
  tricare: {
    name: 'TRICARE / Military Health',
    fhir_status: 'confirmed',
    fhir_notes: 'DHA FHIR API available for military provider directories.',
    tx_lives_estimate: '~400K (large military presence in TX)',
    cms_interoperability: false,
  },
  baylor_scott: {
    name: 'Baylor Scott & White Health Plan',
    fhir_status: 'tbd',
    fhir_notes: 'TX-specific health system plan. FHIR status unknown — contact required.',
    cms_interoperability: false,
  },
  christus: {
    name: 'CHRISTUS Health Plan',
    fhir_status: 'tbd',
    fhir_notes: 'TX Catholic health system plan. Research needed.',
    cms_interoperability: false,
  },
  oscar: {
    name: 'Oscar Health',
    fhir_status: 'confirmed',
    fhir_notes: 'CMS mandated FHIR R4. Marketplace-focused.',
    tx_lives_estimate: '~100K',
    cms_interoperability: true,
  },
  ambetter: {
    name: 'Ambetter (Centene subsidiary)',
    fhir_status: 'confirmed',
    fhir_notes: 'Part of Centene. Same FHIR endpoint family as Superior HealthPlan.',
    cms_interoperability: true,
  },
  wellcare: {
    name: 'WellCare Health Plans',
    fhir_status: 'confirmed',
    fhir_notes: 'Part of Centene post-2020. DA VINCI compliant.',
    cms_interoperability: true,
  },
  uhc_medicaid: {
    name: 'UnitedHealthcare Community Plan',
    fhir_status: 'likely',
    fhir_notes: 'Medicaid arm of UHC. Separate credentialing from commercial.',
    cms_interoperability: true,
  },
  coventry: {
    name: 'Coventry / First Health (Aetna subsidiary)',
    fhir_status: 'likely',
    fhir_notes: 'Now folded into Aetna. May share Aetna FHIR infrastructure.',
    cms_interoperability: true,
  },
  medicaid_tx: {
    name: 'Texas Medicaid (HHSC)',
    fhir_status: 'tbd',
    fhir_notes: 'TX HHSC manages Medicaid. Provider enrollment via EVV/TMHP. FHIR TBD.',
    cms_interoperability: false,
  },
};

// ── Payer name normalization ───────────────────────────────────────
// Maps raw website text variations → a canonical payer key for counting.

const PAYER_NORMALIZATION: Array<{ pattern: RegExp; key: string; display_name: string }> = [
  { pattern: /centene|superior\s+health\s*plan/i,         key: 'centene',        display_name: 'Centene / Superior HealthPlan' },
  { pattern: /molina/i,                                    key: 'molina',         display_name: 'Molina Healthcare' },
  { pattern: /tricare|tri-care|military/i,                 key: 'tricare',        display_name: 'TRICARE / Military Health' },
  { pattern: /baylor\s*scott/i,                            key: 'baylor_scott',   display_name: 'Baylor Scott & White Health Plan' },
  { pattern: /christus/i,                                  key: 'christus',       display_name: 'CHRISTUS Health Plan' },
  { pattern: /oscar\s+health/i,                            key: 'oscar',          display_name: 'Oscar Health' },
  { pattern: /ambetter/i,                                  key: 'ambetter',       display_name: 'Ambetter (Centene)' },
  { pattern: /wellcare|well\s*care/i,                      key: 'wellcare',       display_name: 'WellCare Health Plans' },
  { pattern: /coventry|first\s+health/i,                   key: 'coventry',       display_name: 'Coventry / First Health' },
  { pattern: /community\s+plan|medicaid.*united|united.*medicaid/i, key: 'uhc_medicaid', display_name: 'UHC Community Plan (Medicaid)' },
  { pattern: /medicaid/i,                                  key: 'medicaid_tx',    display_name: 'Texas Medicaid (HHSC)' },
  { pattern: /chip\b|children.*health/i,                   key: 'chip',           display_name: 'CHIP (Children\'s Health Insurance)' },
  { pattern: /scott\s*&\s*white|scott\s*and\s*white/i,    key: 'baylor_scott',   display_name: 'Baylor Scott & White Health Plan' },
  { pattern: /multiplan|beech\s*street/i,                  key: 'multiplan',      display_name: 'MultiPlan / PHCS' },
  { pattern: /phcs/i,                                      key: 'multiplan',      display_name: 'MultiPlan / PHCS' },
  { pattern: /healthspring/i,                              key: 'healthspring',   display_name: 'HealthSpring' },
  { pattern: /community\s+health\s+choice/i,              key: 'community_health_choice', display_name: 'Community Health Choice' },
  { pattern: /firstcare/i,                                 key: 'firstcare',      display_name: 'FirstCare Health Plans' },
  { pattern: /texas\s+childrens/i,                         key: 'tx_childrens',   display_name: "Texas Children's Health Plan" },
  { pattern: /united\s*concordia/i,                        key: 'concordia',      display_name: 'United Concordia (Dental)' },
];

// ── Supabase helpers ──────────────────────────────────────────────

async function db<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB GET ${path}: ${res.status} ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Priority scoring ──────────────────────────────────────────────

function computePriority(mentionCount: number, apiInfo?: PayerAPIInfo): 'P0' | 'P1' | 'P2' {
  const hasConfirmedFhir = apiInfo?.fhir_status === 'confirmed';
  const hasLargeTxPopulation = (apiInfo?.tx_lives_estimate ?? '').match(/\d+M|\d+00K/);

  if (mentionCount >= 200 && hasConfirmedFhir) return 'P0';
  if (mentionCount >= 100 || (mentionCount >= 50 && hasConfirmedFhir)) return 'P0';
  if (mentionCount >= 30 || hasLargeTxPopulation) return 'P1';
  return 'P2';
}

// ── Main ──────────────────────────────────────────────────────────

interface PayerPriorityRow {
  rank: number;
  payer_key: string;
  display_name: string;
  mention_count: number;
  pct_of_crawled: number;
  priority: 'P0' | 'P1' | 'P2';
  already_integrated: boolean;
  fhir_status: string;
  fhir_notes: string;
  tx_lives_estimate: string;
  cms_interoperability: boolean;
  recommended_action: string;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Phase 1A Task 12: Payer Priority Analysis     ║');
  console.log('║  Analyzing "Insurance Accepted" data from website crawl     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Min mentions to include: ${MIN_MENTIONS}`);
  console.log('');

  // ── 1. Pull accepted_payers arrays from practice_websites ────
  console.log('  Loading accepted_payers from practice_websites...');

  // Fetch in pages (Supabase max 1000 per request)
  let allRows: Array<{ accepted_payers: string[] | null }> = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const batch = await db<Array<{ accepted_payers: string[] | null }>>(
      `practice_websites?select=accepted_payers&accepted_payers=not.is.null&state=eq.TX&limit=${PAGE_SIZE}&offset=${offset}`,
    );
    if (batch.length === 0) break;
    allRows = allRows.concat(batch);
    offset += batch.length;
    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`  Loaded ${allRows.length.toLocaleString()} TX sites with payer data`);

  if (allRows.length === 0) {
    console.log('');
    console.log('  ⚠️  No accepted_payers data found. Run the TX crawl first:');
    console.log('     npx tsx scripts/run-tx-crawl.ts');
    process.exit(0);
  }

  // ── 2. Aggregate raw payer mentions ──────────────────────────
  const rawCounts = new Map<string, number>();
  let totalMentions = 0;

  for (const row of allRows) {
    if (!row.accepted_payers) continue;
    for (const payer of row.accepted_payers) {
      const lower = payer.toLowerCase().trim();
      rawCounts.set(lower, (rawCounts.get(lower) ?? 0) + 1);
      totalMentions++;
    }
  }

  // ── 3. Normalize payer names to canonical keys ────────────────
  const normalizedCounts = new Map<string, { key: string; display: string; count: number }>();

  for (const [rawPayer, count] of rawCounts.entries()) {
    let matched = false;
    for (const { pattern, key, display_name } of PAYER_NORMALIZATION) {
      if (pattern.test(rawPayer)) {
        const existing = normalizedCounts.get(key);
        if (existing) {
          existing.count += count;
        } else {
          normalizedCounts.set(key, { key, display: display_name, count });
        }
        matched = true;
        break;
      }
    }
    // If no normalization matched, use raw key
    if (!matched && !ALREADY_INTEGRATED.has(rawPayer)) {
      const existing = normalizedCounts.get(rawPayer);
      if (existing) {
        existing.count += count;
      } else {
        normalizedCounts.set(rawPayer, {
          key: rawPayer,
          display: rawPayer.charAt(0).toUpperCase() + rawPayer.slice(1),
          count,
        });
      }
    }
  }

  // ── 4. Build priority list ────────────────────────────────────
  const rows: PayerPriorityRow[] = [];
  const crawledCount = allRows.length;

  for (const [key, { display, count }] of normalizedCounts.entries()) {
    if (count < MIN_MENTIONS) continue;

    const alreadyIntegrated = ALREADY_INTEGRATED.has(key);
    const apiInfo = KNOWN_PAYER_API_INFO[key];
    const priority = alreadyIntegrated ? 'P0' : computePriority(count, apiInfo);

    rows.push({
      rank: 0, // assigned after sort
      payer_key: key,
      display_name: display,
      mention_count: count,
      pct_of_crawled: parseFloat(((count / crawledCount) * 100).toFixed(1)),
      priority,
      already_integrated: alreadyIntegrated,
      fhir_status: apiInfo?.fhir_status ?? 'tbd',
      fhir_notes: apiInfo?.fhir_notes ?? 'Research needed',
      tx_lives_estimate: apiInfo?.tx_lives_estimate ?? 'Unknown',
      cms_interoperability: apiInfo?.cms_interoperability ?? false,
      recommended_action: alreadyIntegrated
        ? 'Already integrated — monitor quality'
        : apiInfo?.fhir_status === 'confirmed'
          ? 'Integrate FHIR API (confirmed available)'
          : apiInfo?.fhir_status === 'likely'
            ? 'Research FHIR endpoint; likely available via CMS mandate'
            : 'Contact payer BizDev to confirm API / credential access',
    });
  }

  // Sort: already-integrated first (informational), then by mention count descending
  rows.sort((a, b) => {
    if (a.already_integrated !== b.already_integrated) {
      return a.already_integrated ? -1 : 1;
    }
    return b.mention_count - a.mention_count;
  });

  // Assign rank (excluding already-integrated from ranking)
  let rank = 1;
  for (const row of rows) {
    if (!row.already_integrated) row.rank = rank++;
    else row.rank = 0;
  }

  // ── 5. Print results ──────────────────────────────────────────

  console.log('');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('  EXISTING INTEGRATIONS (reference)');
  console.log('  ═══════════════════════════════════════════════════════════');
  const existing = rows.filter((r) => r.already_integrated);
  for (const r of existing) {
    console.log(
      `  ✅  ${r.display_name.padEnd(35)} ${r.mention_count.toString().padStart(5)} sites  (${r.pct_of_crawled}%)`,
    );
  }

  console.log('');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('  NEW PAYER PRIORITY LIST (Phase 1A Task 13 candidates)');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log(
    `  ${'Rank'.padEnd(5)} ${'Payer'.padEnd(38)} ${'Sites'.padStart(6)} ${'%'.padStart(5)} ${'Priority'} ${'FHIR'}`,
  );
  console.log('  ' + '─'.repeat(80));

  const newPayers = rows.filter((r) => !r.already_integrated);
  for (const r of newPayers) {
    const fhirIcon =
      r.fhir_status === 'confirmed' ? '✅' :
      r.fhir_status === 'likely'    ? '🔵' :
      r.fhir_status === 'scrape_only' ? '🟡' : '❓';

    console.log(
      `  ${('#' + r.rank).padEnd(5)} ${r.display_name.padEnd(38)} ` +
      `${r.mention_count.toString().padStart(6)} ${(r.pct_of_crawled + '%').padStart(5)} ` +
      `   ${r.priority}     ${fhirIcon} ${r.fhir_status}`,
    );
  }

  console.log('');
  console.log('  FHIR Legend: ✅ Confirmed | 🔵 Likely | 🟡 Scrape only | ❓ TBD');

  // Print P0 new payers detail
  const p0New = newPayers.filter((r) => r.priority === 'P0');
  if (p0New.length > 0) {
    console.log('');
    console.log('  ── P0 NEW PAYERS (integrate in Phase 1A Step 3) ──────────');
    for (const r of p0New) {
      console.log(`  ${r.display_name}`);
      console.log(`    TX lives: ${r.tx_lives_estimate}`);
      console.log(`    FHIR:     ${r.fhir_status} — ${r.fhir_notes}`);
      console.log(`    Action:   ${r.recommended_action}`);
      console.log('');
    }
  }

  // ── 6. Save JSON output if requested ─────────────────────────
  if (OUTPUT_FILE) {
    const { writeFileSync } = await import('fs');
    const output = {
      generated_at: new Date().toISOString(),
      total_sites_crawled: crawledCount,
      total_mentions: totalMentions,
      min_mentions_threshold: MIN_MENTIONS,
      payers: rows,
    };
    writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`  ✅  Priority list saved to: ${OUTPUT_FILE}`);
  }

  console.log('');
  console.log('  Next step → Task 13: Research and confirm API availability');
  console.log('    npx tsx scripts/analyze-payer-priority.ts --output payer-priority.json');
  console.log('    Then share payer-priority.json with BizDev for API outreach.');
  console.log('');
}

main().catch((err) => {
  console.error('❌  Fatal:', err);
  process.exit(1);
});
