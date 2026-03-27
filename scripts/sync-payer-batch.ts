/**
 * scripts/sync-payer-batch.ts
 *
 * #45 — Payer directory batch mode.
 * Queries every active provider across every active payer endpoint.
 * Produces snapshots and mismatches in bulk.
 *
 * Usage:
 *   npx tsx scripts/sync-payer-batch.ts
 *   npx tsx scripts/sync-payer-batch.ts --practice-id <id>
 *   npx tsx scripts/sync-payer-batch.ts --payer aetna
 *   npx tsx scripts/sync-payer-batch.ts --limit 50 --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { FhirDirectoryClient } from '../lib/payer-directory/fhir-client';
import type { PayerEndpoint, DirectorySnapshot } from '../lib/payer-directory/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const getVal = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
};

const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(getVal('--limit') || '0', 10) || 0;
const PRACTICE_ID = getVal('--practice-id');
const PAYER_FILTER = getVal('--payer');
const BATCH_SIZE = 10; // Providers per batch (rate limit friendly)
const INTER_PAYER_DELAY_MS = 2000; // Delay between payers

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Payer Directory Batch Sync         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (PRACTICE_ID) console.log(`Practice:  ${PRACTICE_ID}`);
  if (PAYER_FILTER) console.log(`Payer:     ${PAYER_FILTER}`);
  if (LIMIT) console.log(`Limit:     ${LIMIT} providers`);
  console.log('');

  // ── 1. Load active payer endpoints ──────────────────────
  let payerQuery = supabase
    .from('payer_endpoints')
    .select('*')
    .eq('is_active', true)
    .not('fhir_base_url', 'like', 'SCRAPE%')
    .not('fhir_base_url', 'eq', 'TBD');

  if (PAYER_FILTER) {
    payerQuery = payerQuery.eq('payer_code', PAYER_FILTER);
  }

  const { data: endpoints, error: endpointError } = await payerQuery;

  if (endpointError || !endpoints || endpoints.length === 0) {
    console.error('No active FHIR payer endpoints found:', endpointError?.message);
    process.exit(1);
  }

  console.log(`Active payer endpoints: ${endpoints.length}`);
  for (const ep of endpoints) {
    console.log(`  - ${ep.payer_code}: ${ep.payer_name} (${ep.fhir_base_url})`);
  }
  console.log('');

  // ── 2. Load providers to query ──────────────────────────
  let providerQuery = supabase
    .from('practice_providers')
    .select('npi, practice_website_id, provider_name');

  if (PRACTICE_ID) {
    providerQuery = providerQuery.eq('practice_website_id', PRACTICE_ID);
  }

  // Deduplicate by NPI
  const { data: rawProviders, error: providerError } = await providerQuery;

  if (providerError || !rawProviders || rawProviders.length === 0) {
    console.error('No providers found:', providerError?.message);
    process.exit(1);
  }

  // Unique NPIs
  const npiMap = new Map<string, { npi: string; name: string; practice_id: string }>();
  for (const p of rawProviders) {
    if (p.npi && !npiMap.has(p.npi)) {
      npiMap.set(p.npi, {
        npi: p.npi,
        name: p.provider_name || `NPI ${p.npi}`,
        practice_id: p.practice_website_id,
      });
    }
  }

  let providers = [...npiMap.values()];
  if (LIMIT && LIMIT > 0) {
    providers = providers.slice(0, LIMIT);
  }

  console.log(`Providers to query: ${providers.length} (unique NPIs)`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would query:');
    console.log(`  ${providers.length} providers x ${endpoints.length} payers = ${providers.length * endpoints.length} lookups`);
    return;
  }

  // ── 3. Batch query ──────────────────────────────────────
  const client = new FhirDirectoryClient();
  const batchId = `batch_${Date.now()}`;
  let totalSnapshots = 0;
  let totalNotListed = 0;
  let totalErrors = 0;

  for (const endpoint of endpoints as PayerEndpoint[]) {
    console.log(`\n─── ${endpoint.payer_name} (${endpoint.payer_code}) ───`);

    let payerSnapshots = 0;
    let payerNotListed = 0;
    let payerErrors = 0;

    for (let i = 0; i < providers.length; i += BATCH_SIZE) {
      const batch = providers.slice(i, i + BATCH_SIZE);

      for (const provider of batch) {
        try {
          const snapshot = await client.lookupByNpi(
            provider.npi,
            endpoint,
            batchId
          );

          if (snapshot) {
            if (snapshot.listed_status === 'not_listed') {
              payerNotListed++;
            } else {
              payerSnapshots++;
            }

            // Upsert snapshot
            await supabase
              .from('payer_directory_snapshots')
              .upsert(
                {
                  npi: provider.npi,
                  payer_code: endpoint.payer_code,
                  batch_id: batchId,
                  snapshot_date: snapshot.snapshot_date,
                  listed_status: snapshot.listed_status,
                  address: snapshot.address || null,
                  phone: snapshot.phone || null,
                  specialty: snapshot.specialty || null,
                  name: snapshot.name || null,
                  network: snapshot.network || null,
                  raw_data: snapshot.raw_response || null,
                },
                { onConflict: 'npi,payer_code' }
              );
          }
        } catch (err) {
          payerErrors++;
          console.error(`  Error for NPI ${provider.npi}: ${err instanceof Error ? err.message : err}`);
        }
      }

      process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, providers.length)}/${providers.length}`);
    }

    totalSnapshots += payerSnapshots;
    totalNotListed += payerNotListed;
    totalErrors += payerErrors;

    console.log(`\n  Listed: ${payerSnapshots}, Not listed: ${payerNotListed}, Errors: ${payerErrors}`);

    // Delay between payers to avoid rate limits
    if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
      await new Promise((r) => setTimeout(r, INTER_PAYER_DELAY_MS));
    }
  }

  // ── 4. Summary ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  BATCH SYNC COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Batch ID:       ${batchId}`);
  console.log(`  Providers:      ${providers.length}`);
  console.log(`  Payers:         ${endpoints.length}`);
  console.log(`  Total lookups:  ${providers.length * endpoints.length}`);
  console.log(`  Listed:         ${totalSnapshots}`);
  console.log(`  Not listed:     ${totalNotListed}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
