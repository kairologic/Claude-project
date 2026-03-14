#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════
// KairoLogic: Payer Directory Sync — Single Practice Test
// Usage:
//   npx tsx scripts/sync-payer-directories.ts --npi 1234567890
//   npx tsx scripts/sync-payer-directories.ts --npi 1234567890 --payer uhc
//   npx tsx scripts/sync-payer-directories.ts --npi 1234567890 --dry-run
// ═══════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FhirDirectoryClient } from '../lib/payer-directory/fhir-client';
import { detectMismatches, buildCorrectionActions } from '../lib/payer-directory/mismatch-engine';
import type {
  PayerEndpoint,
  DirectorySnapshot,
  NppesProviderData,
  DirectoryMismatch,
} from '../lib/payer-directory/types';

// ── Config ────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// ── CLI Args ──────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--npi' && args[i + 1]) {
      flags.npi = args[++i];
    } else if (args[i] === '--payer' && args[i + 1]) {
      flags.payer = args[++i];
    } else if (args[i] === '--dry-run') {
      flags.dryRun = true;
    } else if (args[i] === '--verbose') {
      flags.verbose = true;
    }
  }

  if (!flags.npi) {
    console.error('Usage: npx tsx scripts/sync-payer-directories.ts --npi <NPI> [--payer <code>] [--dry-run] [--verbose]');
    console.error('');
    console.error('Options:');
    console.error('  --npi <NPI>       Required. 10-digit NPI to look up');
    console.error('  --payer <code>    Optional. Only query this payer (uhc, aetna, humana, etc.)');
    console.error('  --dry-run         Query APIs but do not write to Supabase');
    console.error('  --verbose         Print full FHIR response JSON');
    process.exit(1);
  }

  return flags;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();
  const npi = flags.npi as string;
  const dryRun = !!flags.dryRun;
  const verbose = !!flags.verbose;
  const payerFilter = flags.payer as string | undefined;

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  KairoLogic — Payer Directory Sync (Test Mode)      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  NPI:      ${npi}`);
  console.log(`  Payer:    ${payerFilter || 'all active'}`);
  console.log(`  Dry run:  ${dryRun}`);
  console.log('');

  // ── Connect Supabase ──
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Load payer endpoints ──
  console.log('Loading payer endpoints...');
  const { data: endpointRows, error: epErr } = await supabase
    .from('payer_directory_endpoints')
    .select('*')
    .eq('is_active', true);

  if (epErr || !endpointRows) {
    console.error('Failed to load endpoints:', epErr?.message);
    process.exit(1);
  }

  let endpoints = endpointRows as PayerEndpoint[];
  if (payerFilter) {
    endpoints = endpoints.filter((e) => e.payer_code === payerFilter);
    if (endpoints.length === 0) {
      console.error(`No active endpoint found for payer code: ${payerFilter}`);
      process.exit(1);
    }
  }

  console.log(`  Found ${endpoints.length} active endpoint(s): ${endpoints.map((e) => e.payer_code).join(', ')}`);
  console.log('');

  // ── Load NPPES data for this NPI ──
  console.log(`Loading NPPES data for NPI ${npi}...`);
  const nppesData = await loadNppesData(supabase, npi);
  if (nppesData) {
    console.log(`  Name:     ${nppesData.provider_name || nppesData.first_name + ' ' + nppesData.last_name}`);
    console.log(`  Address:  ${nppesData.address_line_1 || '(none)'}, ${nppesData.city}, ${nppesData.state} ${nppesData.zip}`);
    console.log(`  Phone:    ${nppesData.phone || '(none)'}`);
    console.log(`  Specialty:${nppesData.taxonomy_desc || '(none)'}`);
  } else {
    console.log('  ⚠ NPI not found in providers or provider_pecos tables');
    console.log('  Will still query payer directories but cannot run mismatch comparison');
  }
  console.log('');

  // ── Query payer directories ──
  const batchId = `test_${npi}_${Date.now()}`;
  const client = new FhirDirectoryClient();

  console.log('Querying payer directories...');
  const snapshots = await client.lookupAllPayers(npi, endpoints, batchId);
  console.log('');
  console.log(`Results: ${snapshots.length} payer(s) returned data`);

  // ── Print results ──
  for (const snap of snapshots) {
    console.log('');
    console.log(`┌── ${snap.payer_code.toUpperCase()} ──────────────────────────`);
    console.log(`│ Name:      ${snap.listed_name_full || '(not found)'}`);
    console.log(`│ Address:   ${snap.listed_address_line1 || '(none)'}`);
    console.log(`│            ${snap.listed_city || ''}, ${snap.listed_state || ''} ${snap.listed_zip || ''}`);
    console.log(`│ Phone:     ${snap.listed_phone || '(none)'}`);
    console.log(`│ Specialty: ${snap.listed_specialty_display || '(none)'} [${snap.listed_specialty_code || ''}]`);
    console.log(`│ Org:       ${snap.listed_org_name || '(none)'}`);
    console.log(`│ Accepting: ${snap.listed_accepting_patients ?? '(unknown)'}`);
    console.log(`│ Languages: ${snap.listed_languages?.join(', ') || '(none)'}`);
    console.log('└────────────────────────────────────────');

    if (verbose && snap.fhir_raw_bundle) {
      console.log('  [RAW FHIR BUNDLE]:');
      console.log(JSON.stringify(snap.fhir_raw_bundle, null, 2).substring(0, 2000));
      console.log('  ...(truncated)');
    }
  }

  // ── Run mismatch detection ──
  if (nppesData && snapshots.length > 0) {
    console.log('');
    console.log('Running mismatch detection...');
    const allMismatches: DirectoryMismatch[] = [];

    for (const snap of snapshots) {
      const mismatches = detectMismatches(nppesData, snap);
      allMismatches.push(...mismatches);

      if (mismatches.length > 0) {
        console.log(`  [${snap.payer_code}] ${mismatches.length} mismatch(es):`);
        for (const m of mismatches) {
          console.log(`    ⚠ ${m.field_name} (${m.mismatch_type}): NPPES="${m.nppes_value}" vs Payer="${m.payer_value}"`);
          console.log(`      Fix via CAQH: ${m.fix_via_caqh ? 'YES' : 'no'} | Priority: ${m.priority}`);
        }
      } else {
        console.log(`  [${snap.payer_code}] ✓ No mismatches`);
      }
    }

    // ── Build correction packet ──
    if (allMismatches.length > 0) {
      console.log('');
      console.log('Correction packet:');
      const actions = buildCorrectionActions(allMismatches);
      const caqhCount = allMismatches.filter((m) => m.fix_via_caqh).length;
      const directCount = allMismatches.filter((m) => !m.fix_via_caqh).length;

      console.log(`  Total mismatches:  ${allMismatches.length}`);
      console.log(`  Fix via CAQH:      ${caqhCount} (update once, fixes across multiple payers)`);
      console.log(`  Direct payer fix:  ${directCount}`);
      console.log('');
      console.log('  Prioritized actions:');
      for (const action of actions) {
        console.log(`    Step ${action.step}: ${action.action} [${action.target}] (~${action.effort})`);
        console.log(`      → Resolves: ${action.fixes.join(', ')}`);
        if (action.details) console.log(`      → ${action.details}`);
      }
    } else {
      console.log('');
      console.log('✓ No mismatches detected across any payer directory.');
    }

    // ── Write to Supabase ──
    if (!dryRun) {
      console.log('');
      console.log('Writing to Supabase...');
      await writeSnapshots(supabase, snapshots);
      await writeMismatches(supabase, allMismatches, snapshots);
      console.log('Done.');
    } else {
      console.log('');
      console.log('[DRY RUN] Skipping database writes.');
    }
  }

  console.log('');
  console.log('Complete.');
}

// ── Supabase helpers ──────────────────────────────────────────

async function loadNppesData(
  supabase: SupabaseClient,
  npi: string
): Promise<NppesProviderData | null> {
  // Try provider_pecos first (has address, specialty)
  const { data: pecos } = await supabase
    .from('provider_pecos')
    .select('npi, provider_name, first_name, last_name, organization_name, address_line_1, address_line_2, city, state, zip_code, specialty')
    .eq('npi', npi)
    .limit(1)
    .single();

  // Also get from providers table (has phone, taxonomy)
  const { data: provider } = await supabase
    .from('providers')
    .select('npi, provider_name, organization_name, practice_phone, taxonomy_code, taxonomy_desc, gender')
    .eq('npi', npi)
    .limit(1)
    .single();

  if (!pecos && !provider) return null;

  // Merge, prefer pecos for address, providers for phone/taxonomy
  return {
    npi,
    provider_name: pecos?.provider_name || provider?.provider_name || null,
    first_name: pecos?.first_name || null,
    last_name: pecos?.last_name || null,
    organization_name: pecos?.organization_name || provider?.organization_name || null,
    address_line_1: pecos?.address_line_1 || null,
    address_line_2: pecos?.address_line_2 || null,
    city: pecos?.city || null,
    state: pecos?.state || null,
    zip: pecos?.zip_code || null,
    phone: provider?.practice_phone || null,
    taxonomy_code: provider?.taxonomy_code || null,
    taxonomy_desc: pecos?.specialty || provider?.taxonomy_desc || null,
    gender: provider?.gender || null,
  };
}

async function writeSnapshots(
  supabase: SupabaseClient,
  snapshots: DirectorySnapshot[]
): Promise<void> {
  for (const snap of snapshots) {
    const { error } = await supabase
      .from('payer_directory_snapshots')
      .upsert(snap, { onConflict: 'npi,payer_code,snapshot_date' });

    if (error) {
      console.error(`  Error writing snapshot for ${snap.payer_code}: ${error.message}`);
    } else {
      console.log(`  ✓ Snapshot saved: ${snap.payer_code}`);
    }
  }
}

async function writeMismatches(
  supabase: SupabaseClient,
  mismatches: DirectoryMismatch[],
  snapshots: DirectorySnapshot[]
): Promise<void> {
  // Map snapshot IDs (we need the DB-generated IDs)
  // For now, write mismatches without snapshot_id FK (will link after insert)
  for (const m of mismatches) {
    const { error } = await supabase
      .from('payer_directory_mismatches')
      .insert({
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
      });

    if (error) {
      console.error(`  Error writing mismatch ${m.payer_code}/${m.field_name}: ${error.message}`);
    } else {
      console.log(`  ✓ Mismatch saved: ${m.payer_code} / ${m.field_name}`);
    }
  }
}

// ── Run ──
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
