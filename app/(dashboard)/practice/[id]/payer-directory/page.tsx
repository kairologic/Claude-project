/**
 * app/practice/[id]/payer-directory/page.tsx
 *
 * Server component: fetches payer endpoints, snapshots, mismatches,
 * and practice providers, then renders the PayerDirectoryView grid.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { safeQuery } from '@/lib/supabase/safe-query';
import PayerDirectoryView from '@/components/dashboard/PayerDirectoryView';

export default async function PayerDirectoryPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // 1. Payer endpoints (all, including inactive)
  // 2. Practice providers (need to fetch first to get NPI list)
  const [payersResult, providersResult] = await Promise.all([
    safeQuery(
      admin
        .from('payer_directory_endpoints')
        .select('payer_code, payer_name, is_active')
        .order('payer_name'),
      []
    ),
    safeQuery(
      admin
        .from('practice_providers')
        .select('npi, provider_name, roster_status')
        .eq('practice_website_id', practiceId)
        .order('provider_name'),
      []
    ),
  ]);

  const payers = payersResult.data;
  const providers = providersResult.data;

  // Get NPI list for filtering snapshots/mismatches
  const npiList = (providers || []).map(p => p.npi);

  // Row shapes for typed results
  interface SnapshotRow { npi: string; payer_code: string; snapshot_date: string; listed_name_full: string | null; listed_address_line1: string | null; listed_city: string | null; listed_state: string | null; listed_zip: string | null; listed_phone: string | null; listed_specialty_display: string | null; listed_accepting_patients: boolean | null }
  interface MismatchRow { npi: string; payer_code: string; field_name: string; mismatch_type: string; nppes_value: string | null; payer_value: string | null; priority: number }
  interface NppesRow { npi: string; first_name: string; last_name: string; address_line_1: string | null; city: string | null; state: string | null; zip_code: string | null; phone: string | null; primary_taxonomy_code: string | null; taxonomy_desc: string | null }

  // 3-5. Snapshots, mismatches, and NPPES data (parallel queries, conditional on npiList length)
  let snapshotsResult = { data: [] as SnapshotRow[] };
  let mismatchesResult = { data: [] as MismatchRow[] };
  let nppesResult = { data: [] as NppesRow[] };

  if (npiList.length > 0) {
    [snapshotsResult, mismatchesResult, nppesResult] = await Promise.all([
      safeQuery(
        admin
          .from('payer_directory_snapshots')
          .select('npi, payer_code, snapshot_date, listed_name_full, listed_address_line1, listed_city, listed_state, listed_zip, listed_phone, listed_specialty_display, listed_accepting_patients')
          .in('npi', npiList)
          .order('snapshot_date', { ascending: false }),
        []
      ),
      safeQuery(
        admin
          .from('payer_directory_mismatches')
          .select('npi, payer_code, field_name, mismatch_type, nppes_value, payer_value, priority')
          .in('npi', npiList),
        []
      ),
      safeQuery(
        admin
          .from('providers')
          .select('npi, first_name, last_name, address_line_1, city, state, zip_code, phone, primary_taxonomy_code, taxonomy_desc')
          .in('npi', npiList),
        []
      ),
    ]);
  }

  const snapshots = snapshotsResult.data;
  const mismatchesRaw = mismatchesResult.data;
  const nppesData = nppesResult.data;

  // Deduplicate: keep latest snapshot per (npi, payer_code)
  const latestSnapshots = deduplicateSnapshots(snapshots || []);

  // Build provider rows with NPPES data
  const nppesMap = new Map(
    (nppesData || []).map(n => [n.npi, n]),
  );

  const providerRows = (providers || []).map(p => {
    const nppes = nppesMap.get(p.npi);
    return {
      npi: p.npi,
      provider_name: p.provider_name || 'Unknown',
      roster_status: p.roster_status || 'active',
      nppes_address: nppes
        ? [
            nppes.address_line_1,
            nppes.city,
            nppes.state,
            nppes.zip_code?.slice(0, 5),
          ].filter(Boolean).join(', ')
        : null,
      nppes_phone: nppes?.phone || null,
      nppes_specialty: nppes?.taxonomy_desc || nppes?.primary_taxonomy_code || null,
    };
  });

  return (
    <PayerDirectoryView
      providers={providerRows}
      payers={payers || []}
      snapshots={latestSnapshots}
      mismatches={mismatchesRaw || []}
      practiceId={practiceId}
    />
  );
}

/** Keep only the latest snapshot per (npi, payer_code). */
function deduplicateSnapshots<T extends { npi: string; payer_code: string }>(
  snapshots: T[],
): T[] {
  const seen = new Map<string, T>();
  for (const snap of snapshots) {
    const key = `${snap.npi}_${snap.payer_code}`;
    if (!seen.has(key)) {
      seen.set(key, snap);
    }
    // Already sorted desc, first one wins
  }
  return Array.from(seen.values());
}
