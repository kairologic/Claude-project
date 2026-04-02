#!/usr/bin/env tsx
/**
 * Run BCBS TX Provider Finder for all active providers at Brushy Creek.
 * Saves snapshots to payer_directory_snapshots and detects mismatches.
 *
 * Usage: npx tsx scripts/run-bcbs-lookup.ts
 */

import { BcbsTxProviderFinder } from '../lib/payer-directory/bcbstx-provider-finder';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PRACTICE_ID = 'c1000000-0000-0000-0000-000000000001';
// Brushy Creek is near Austin/Round Rock TX
const GEO_LOCATION = '30.5083,-97.6789';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DB ${options.method || 'GET'} ${path} → ${response.status}: ${text}`);
  }

  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  return null;
}

async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log('  BCBS TX Provider Finder — Brushy Creek Lookup');
  console.log('══════════════════════════════════════════════════\n');

  // 1. Get active providers
  const providers = await db(
    `practice_providers?practice_website_id=eq.${PRACTICE_ID}&roster_status=eq.active&select=npi,provider_name`,
  );

  console.log(`Found ${providers.length} active providers:\n`);
  for (const p of providers) {
    console.log(`  • ${p.provider_name} (NPI: ${p.npi})`);
  }
  console.log('');

  // 2. Initialize the finder
  const finder = new BcbsTxProviderFinder();
  const batchId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  // 3. Look up each provider
  const results: Array<{ npi: string; name: string; found: boolean; snapshot: any }> = [];

  for (const provider of providers) {
    // Parse first/last name from provider_name (format: "Dr. First Last" or "First Last, APRN")
    const cleanName = provider.provider_name
      .replace(/^(Dr\.|Dr|NP|PA|APRN|MD|DO)\s+/i, '')
      .replace(/,?\s*(MD|DO|APRN|NP|PA|FNP-C|DNP|PhD).*$/i, '')
      .trim();
    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';

    console.log(`\nLooking up: ${firstName} ${lastName} (NPI: ${provider.npi})...`);

    const snapshot = await finder.lookupByName(
      firstName,
      lastName,
      provider.npi,
      GEO_LOCATION,
      batchId,
    );

    if (snapshot && snapshot.listed_name_full) {
      console.log(`  ✓ FOUND: ${snapshot.listed_name_full}`);
      console.log(
        `    Address: ${snapshot.listed_address_line1}, ${snapshot.listed_city}, ${snapshot.listed_state} ${snapshot.listed_zip}`,
      );
      console.log(`    Specialty: ${snapshot.listed_specialty_display}`);
      console.log(`    Accepting: ${snapshot.listed_accepting_patients}`);
      results.push({ npi: provider.npi, name: provider.provider_name, found: true, snapshot });
    } else {
      console.log(`  ✕ NOT LISTED in BCBS TX Provider Finder`);
      results.push({ npi: provider.npi, name: provider.provider_name, found: false, snapshot });
    }

    // Rate limit: 2s between lookups
    if (providers.indexOf(provider) < providers.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 4. Save snapshots to DB
  console.log('\n\nSaving snapshots to payer_directory_snapshots...\n');

  for (const result of results) {
    if (!result.snapshot) continue;

    try {
      await db('payer_directory_snapshots', {
        method: 'POST',
        body: JSON.stringify({
          ...result.snapshot,
          sync_batch_id: batchId,
        }),
        headers: {
          Prefer: 'return=minimal,resolution=merge-duplicates',
        },
      });
      console.log(
        `  Saved snapshot for ${result.name} (${result.found ? 'listed' : 'not listed'})`,
      );
    } catch (err) {
      console.error(`  Error saving snapshot for ${result.name}: ${err}`);
    }
  }

  // 5. Summary
  const found = results.filter((r) => r.found).length;
  const notFound = results.filter((r) => !r.found).length;

  console.log('\n══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Total providers: ${results.length}`);
  console.log(`  Found in BCBS TX: ${found}`);
  console.log(`  Not listed:       ${notFound}`);
  console.log(`  Batch ID:         ${batchId}`);
  console.log('══════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
