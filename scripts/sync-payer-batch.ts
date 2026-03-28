/**
 * scripts/sync-payer-batch.ts
 *
 * #45 — Payer directory batch mode.
 * Queries active providers across active payer FHIR endpoints.
 * Produces snapshots and runs mismatch detection in bulk.
 *
 * Usage:
 *   npx tsx scripts/sync-payer-batch.ts
 *   npx tsx scripts/sync-payer-batch.ts --payer aetna --limit 5000
 *   npx tsx scripts/sync-payer-batch.ts --payer uhc --offset 5000 --limit 5000
 *   npx tsx scripts/sync-payer-batch.ts --practice-id <id>
 *   npx tsx scripts/sync-payer-batch.ts --dry-run
 */

import { FhirDirectoryClient } from '../lib/payer-directory/fhir-client';
import { detectMismatches } from '../lib/payer-directory/mismatch-engine';
import type { PayerEndpoint, DirectorySnapshot, NppesProviderData } from '../lib/payer-directory/types';

// ── Supabase via raw fetch (same pattern as scan-scheduler) ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseRequest<T = unknown>(
  path: string,
  opts: { method?: string; body?: string } = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.method === 'POST' ? 'return=representation,resolution=merge-duplicates' : 'return=representation',
    },
    body: opts.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ([] as unknown as T);
}

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const getVal = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
};

const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(getVal('--limit') || '0', 10) || 0;
const OFFSET = parseInt(getVal('--offset') || '0', 10) || 0;
const PRACTICE_ID = getVal('--practice-id');
const PAYER_FILTER = getVal('--payer');
const BATCH_SIZE = 10;
const INTER_PAYER_DELAY_MS = 2000;

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Payer Directory Batch Sync         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (PAYER_FILTER) console.log(`Payer:     ${PAYER_FILTER}`);
  if (PRACTICE_ID) console.log(`Practice:  ${PRACTICE_ID}`);
  if (LIMIT) console.log(`Limit:     ${LIMIT} providers`);
  if (OFFSET) console.log(`Offset:    ${OFFSET}`);
  console.log('');

  // ── 1. Load active payer endpoints ──────────────────────
  let endpointPath = 'payer_directory_endpoints?is_active=eq.true&fhir_base_url=not.like.SCRAPE*&fhir_base_url=not.eq.TBD';
  if (PAYER_FILTER) {
    endpointPath += `&payer_code=eq.${PAYER_FILTER}`;
  }

  const endpoints = await supabaseRequest<PayerEndpoint[]>(endpointPath);

  if (!endpoints || endpoints.length === 0) {
    console.error('No active FHIR payer endpoints found.');
    process.exit(1);
  }

  console.log(`Active payer endpoints: ${endpoints.length}`);
  for (const ep of endpoints) {
    console.log(`  - ${ep.payer_code}: ${ep.payer_name} (${ep.fhir_base_url})`);
  }
  console.log('');

  // ── 2. Load providers (unique NPIs, ordered for stable offset) ──
  // Uses DB function get_active_provider_npis() for correct DISTINCT ON pagination
  const rpcParams: Record<string, unknown> = {
    p_limit: LIMIT || 5000,
    p_offset: OFFSET,
  };
  if (PRACTICE_ID) {
    rpcParams.p_practice_id = PRACTICE_ID;
  }

  const providers = await supabaseRequest<{ npi: string; practice_website_id: string; provider_name: string }[]>(
    'rpc/get_active_provider_npis',
    { method: 'POST', body: JSON.stringify(rpcParams) }
  );

  if (!providers || providers.length === 0) {
    console.log('No providers to query at this offset. Batch complete.');
    process.exit(0);
  }

  console.log(`Providers to query: ${providers.length} (unique NPIs)`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would query:');
    console.log(`  ${providers.length} providers x ${endpoints.length} payers = ${providers.length * endpoints.length} lookups`);
    return;
  }

  // ── 3. Batch query per payer ──────────────────────────────
  const client = new FhirDirectoryClient();
  const batchId = `batch_${Date.now()}`;
  let totalListed = 0;
  let totalNotListed = 0;
  let totalErrors = 0;
  let totalMismatches = 0;

  for (let pIdx = 0; pIdx < endpoints.length; pIdx++) {
    const endpoint = endpoints[pIdx];
    console.log(`\n─── ${endpoint.payer_name} (${endpoint.payer_code}) ───`);

    let payerListed = 0;
    let payerNotListed = 0;
    let payerErrors = 0;
    let payerMismatches = 0;

    for (let i = 0; i < providers.length; i += BATCH_SIZE) {
      const batch = providers.slice(i, i + BATCH_SIZE);

      for (const provider of batch) {
        try {
          const snapshot = await client.lookupByNpi(
            provider.npi,
            endpoint,
            batchId
          );

          if (!snapshot) continue;

          // Determine if provider was found in directory
          const isListed = !!(
            snapshot.listed_name_full ||
            snapshot.listed_name_last ||
            snapshot.listed_address_line1
          );

          if (isListed) {
            payerListed++;
          } else {
            payerNotListed++;
          }

          // ── Upsert snapshot (matches actual table schema) ──
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
          };

          await supabaseRequest(
            'payer_directory_snapshots',
            { method: 'POST', body: JSON.stringify(snapshotRow) }
          );

          // ── Run mismatch detection ──
          // Load NPPES data for this provider
          const nppesRows = await supabaseRequest<NppesProviderData[]>(
            `providers?npi=eq.${provider.npi}&select=npi,first_name,last_name,organization_name,address_line_1,address_line_2,city,state,zip,phone,taxonomy_code,taxonomy_desc,gender&limit=1`
          );

          if (nppesRows && nppesRows.length > 0) {
            const nppes = nppesRows[0];
            const mismatches = detectMismatches(
              {
                ...nppes,
                provider_name: provider.provider_name,
              },
              snapshot,
              provider.practice_website_id
            );

            if (mismatches.length > 0) {
              payerMismatches += mismatches.length;

              // Upsert each mismatch
              for (const m of mismatches) {
                const mismatchRow = {
                  npi: m.npi,
                  payer_code: m.payer_code,
                  practice_website_id: m.practice_website_id,
                  field_name: m.field_name,
                  mismatch_type: m.mismatch_type,
                  nppes_value: m.nppes_value,
                  website_value: m.website_value,
                  payer_value: m.payer_value,
                  recommended_value: m.recommended_value,
                  fix_via_caqh: m.fix_via_caqh,
                  fix_instructions: m.fix_instructions,
                  priority: m.priority,
                  status: 'open',
                  last_detected_at: new Date().toISOString(),
                  detection_count: 1,
                };

                await supabaseRequest(
                  'payer_directory_mismatches',
                  { method: 'POST', body: JSON.stringify(mismatchRow) }
                );
              }
            }
          }
        } catch (err) {
          payerErrors++;
          console.error(`  Error for NPI ${provider.npi}: ${err instanceof Error ? err.message : err}`);
        }
      }

      const progress = Math.min(i + BATCH_SIZE, providers.length);
      process.stdout.write(`\r  Progress: ${progress}/${providers.length} | Listed: ${payerListed} | Not listed: ${payerNotListed} | Mismatches: ${payerMismatches} | Errors: ${payerErrors}`);
    }

    totalListed += payerListed;
    totalNotListed += payerNotListed;
    totalErrors += payerErrors;
    totalMismatches += payerMismatches;

    console.log(`\n  Summary: Listed=${payerListed}, Not listed=${payerNotListed}, Mismatches=${payerMismatches}, Errors=${payerErrors}`);

    // Delay between payers
    if (pIdx < endpoints.length - 1) {
      console.log(`  Waiting ${INTER_PAYER_DELAY_MS}ms before next payer...`);
      await new Promise((r) => setTimeout(r, INTER_PAYER_DELAY_MS));
    }
  }

  // ── 4. Summary ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  BATCH SYNC COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Batch ID:       ${batchId}`);
  console.log(`  Offset:         ${OFFSET}`);
  console.log(`  Providers:      ${providers.length}`);
  console.log(`  Payers:         ${endpoints.length}`);
  console.log(`  Total lookups:  ${providers.length * endpoints.length}`);
  console.log(`  Listed:         ${totalListed}`);
  console.log(`  Not listed:     ${totalNotListed}`);
  console.log(`  Mismatches:     ${totalMismatches}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
