#!/usr/bin/env npx tsx
/**
 * scripts/backfill-confidence-scores.ts
 *
 * Retroactively scores all existing practice_providers records using the
 * confidence scoring engine. Safe to run multiple times — overwrites
 * previous scores with fresh calculations.
 *
 * Usage:
 *   npx tsx scripts/backfill-confidence-scores.ts
 *   npx tsx scripts/backfill-confidence-scores.ts --practice <practice_website_id>
 *   npx tsx scripts/backfill-confidence-scores.ts --dry-run
 *
 * Environment:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import {
  scoreProviderConfidence,
  type ProviderData,
  type NppesData,
  type PracticeContext,
  type ConfidenceResult,
} from '../lib/scanner/confidence-scorer';

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const practiceIdx = args.indexOf('--practice');
const targetPractice = practiceIdx >= 0 ? args[practiceIdx + 1] : null;

// ── DB Helper ───────────────────────────────────────────────

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
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

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Confidence Score Backfill                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  if (dryRun) console.log('  MODE: DRY RUN (no writes)\n');
  if (targetPractice) console.log(`  TARGET: practice ${targetPractice}\n`);

  // 1. Fetch all practice_providers (or filtered by practice)
  const filter = targetPractice
    ? `practice_providers?practice_website_id=eq.${targetPractice}&select=*`
    : `practice_providers?select=*`;
  const associations: any[] = await db(filter);
  console.log(`Found ${associations.length} practice_provider records to score.\n`);

  if (associations.length === 0) {
    console.log('Nothing to score. Exiting.');
    return;
  }

  // 2. Collect unique NPIs and practice IDs
  const allNpis = [...new Set(associations.map((a: any) => a.npi))];
  const allPracticeIds = [...new Set(associations.map((a: any) => a.practice_website_id))];

  // 3. Batch-fetch NPPES data for all NPIs
  console.log(`Fetching NPPES data for ${allNpis.length} unique NPIs...`);
  const nppesMap = new Map<string, NppesData>();

  // Fetch in batches of 50
  for (let i = 0; i < allNpis.length; i += 50) {
    const batch = allNpis.slice(i, i + 50);
    const npiList = batch.map((n: string) => `"${n}"`).join(',');
    const rows: any[] = await db(
      `providers?npi=in.(${npiList})&select=npi,first_name,last_name,organization_name,entity_type_code,phone,city,state,primary_taxonomy_code,taxonomy_desc`,
    );
    for (const r of rows) {
      nppesMap.set(r.npi, {
        npi: r.npi,
        first_name: r.first_name || '',
        last_name: r.last_name || '',
        organization_name: r.organization_name || '',
        entity_type_code: r.entity_type_code || '1',
        phone: r.phone || '',
        city: r.city || '',
        state: r.state || '',
        primary_taxonomy_code: r.primary_taxonomy_code || '',
        taxonomy_desc: r.taxonomy_desc || '',
      });
    }
  }
  console.log(`  → Loaded ${nppesMap.size} NPPES records.\n`);

  // 4. Build practice context for each practice
  console.log(`Building context for ${allPracticeIds.length} practices...`);
  const practiceCtxMap = new Map<string, PracticeContext>();

  for (const pid of allPracticeIds) {
    // Get practice info
    const pwRows: any[] = await db(
      `practice_websites?id=eq.${pid}&select=name,state,npi`,
    );
    const pw = pwRows[0] || { name: '', state: '' };

    // Count associations for this practice
    const practiceAssocs = associations.filter((a: any) => a.practice_website_id === pid);
    const confirmedCount = practiceAssocs.filter(
      (a: any) => a.status === 'VERIFIED' || a.status === 'ACTIVE',
    ).length;

    // Collect specialties
    const specSet = new Set<string>();
    for (const a of practiceAssocs) {
      if (a.web_specialty) specSet.add(a.web_specialty);
    }

    practiceCtxMap.set(pid, {
      practice_name: pw.name || '',
      practice_state: pw.state || '',
      practice_specialties: [...specSet],
      total_providers: practiceAssocs.length,
      confirmed_provider_count: confirmedCount,
    });
  }
  console.log(`  → Built context for ${practiceCtxMap.size} practices.\n`);

  // 5. Score each association
  const stats = {
    total: associations.length,
    scored: 0,
    confirmed: 0,
    unverified: 0,
    review: 0,
    noNppes: 0,
    errors: 0,
  };

  console.log('Scoring providers...\n');
  console.log('NPI        | Name                           | Score | Tier        | Top Signal');
  console.log('-'.repeat(95));

  const now = new Date().toISOString();

  for (const assoc of associations) {
    try {
      const nppes = nppesMap.get(assoc.npi) || null;
      const practiceCtx = practiceCtxMap.get(assoc.practice_website_id)!;

      if (!nppes) stats.noNppes++;

      const providerData: ProviderData = {
        npi: assoc.npi,
        provider_name: assoc.provider_name || '',
        web_phone: assoc.web_phone,
        web_specialty: assoc.web_specialty,
        association_source: assoc.association_source,
        last_seen_at: assoc.last_seen_at,
      };

      const result = scoreProviderConfidence(providerData, nppes, practiceCtx);

      // Print result row
      const name = (assoc.provider_name || '').padEnd(30).slice(0, 30);
      const topSignal = result.signals.length > 0
        ? result.signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0].signal
        : 'NONE';
      console.log(
        `${assoc.npi} | ${name} | ${result.score.toFixed(2).padStart(5)} | ${result.tier.padEnd(11)} | ${topSignal}`,
      );

      // Update DB
      if (!dryRun) {
        await db(`practice_providers?id=eq.${assoc.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            confidence_score: result.score,
            confidence_tier: result.tier,
            confidence_signals: result.signals,
            confidence_scored_at: now,
          }),
        });
      }

      stats.scored++;
      if (result.tier === 'confirmed') stats.confirmed++;
      else if (result.tier === 'unverified') stats.unverified++;
      else stats.review++;
    } catch (err) {
      stats.errors++;
      console.error(`  ERROR scoring NPI ${assoc.npi}:`, err);
    }
  }

  // 6. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('BACKFILL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total records:    ${stats.total}`);
  console.log(`  Scored:           ${stats.scored}`);
  console.log(`  ✅ Confirmed:     ${stats.confirmed} (≥0.80)`);
  console.log(`  ⚠️  Unverified:   ${stats.unverified} (0.50–0.79)`);
  console.log(`  🔍 Review:        ${stats.review} (<0.50)`);
  console.log(`  No NPPES record:  ${stats.noNppes}`);
  console.log(`  Errors:           ${stats.errors}`);
  if (dryRun) {
    console.log('\n  ⚡ DRY RUN — no changes written to database');
  } else {
    console.log(`\n  ✅ All scores written to practice_providers`);
  }
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
