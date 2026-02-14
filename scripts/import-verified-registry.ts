#!/usr/bin/env tsx
// scripts/import-verified-registry.ts
// ═══ Import 1,018 Verified TX Providers to Supabase ═══
//
// Run: npx tsx scripts/import-verified-registry.ts
//
// Prerequisites:
//   - verified-tx-import.json in same directory (or project root)
//   - Supabase env vars set

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars.');
  process.exit(1);
}

async function db(p: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers as any || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) console.error(`  DB error (${res.status}): ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return null; }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Import Verified TX Registry');
  console.log('═══════════════════════════════════════════════\n');

  // Find the JSON file
  const jsonPath = ['verified-tx-import.json', 'scripts/verified-tx-import.json', '../verified-tx-import.json']
    .find(p => fs.existsSync(p));

  if (!jsonPath) {
    console.error('❌ verified-tx-import.json not found. Place it in project root or scripts/');
    process.exit(1);
  }

  const providers = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📋 Loaded ${providers.length} providers from ${jsonPath}`);

  // Step 1: Clear existing registry (optional — comment out to append)
  console.log('\n🗑️  Clearing existing registry...');
  await db('registry', { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } as any });
  console.log('  Done');

  // Step 2: Import in batches of 50
  console.log(`\n📤 Importing ${providers.length} providers...`);
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < providers.length; i += 50) {
    const chunk = providers.slice(i, i + 50).map((p: any) => ({
      ...p,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/registry`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(chunk),
    });

    if (res.ok) {
      imported += chunk.length;
      console.log(`  ✓ ${Math.min(i + 50, providers.length)}/${providers.length}`);
    } else {
      const err = await res.text();
      console.log(`  ✗ Batch ${Math.floor(i/50) + 1} error: ${err.slice(0, 200)}`);
      errors += chunk.length;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 3: Verify
  const countRes = await db('registry?select=npi&limit=1', {
    headers: { 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } as any,
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\n  Next step: npx tsx scripts/batch-scan-v2.ts`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
