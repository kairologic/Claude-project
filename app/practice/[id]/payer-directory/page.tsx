/**
 * app/practice/[id]/payer-directory/page.tsx
 *
 * Server component: fetches payer endpoints, snapshots, mismatches,
 * and practice providers, then renders the PayerDirectoryView grid.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import PayerDirectoryView from '@/components/dashboard/PayerDirectoryView';

export default async function PayerDirectoryPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // 1. Payer endpoints (all, including inactive)
  const { data: payers } = await admin
    .from('payer_directory_endpoints')
    .select('payer_code, payer_name, is_active')
    .order('payer_name');

  // 2. Practice providers
  const { data: providers } = await admin
    .from('practice_providers')
    .select('npi, provider_name, roster_status')
    .eq('practice_id', practiceId)
    .order('provider_name');

  // Get NPI list for filtering snapshots/mismatches
  const npiList = (providers || []).map(p => p.npi);

  // 3. Latest payer directory snapshots for these NPIs
  const { data: snapshots } = npiList.length > 0
    ? await admin
        .from('payer_directory_snapshots')
        .select('npi, payer_code, snapshot_date, listed_name_full, listed_address_line1, listed_city, listed_state, listed_zip, listed_phone, listed_specialty_display, listed_accepting_patients')
        .in('npi', npiList)
        .order('snapshot_date', { ascending: false })
    : { data: [] };

  // Deduplicate: keep latest snapshot per (npi, payer_code)
  const latestSnapshots = deduplicateSnapshots(snapshots || []);

  // 4. Mismatches for these NPIs
  const { data: mismatchesRaw } = npiList.length > 0
    ? await admin
        .from('payer_directory_mismatches')
        .select('npi, payer_code, field_name, mismatch_type, nppes_value, payer_value, priority')
        .in('npi', npiList)
    : { data: [] };

  // 5. NPPES baseline data for providers
  const { data: nppesData } = npiList.length > 0
    ? await admin
        .from('providers')
        .select('npi, provider_first_name, provider_last_name_legal_name, provider_first_line_business_practice_location_address, provider_business_practice_location_address_city_name, provider_business_practice_location_address_state_name, provider_business_practice_location_address_postal_code, provider_business_practice_location_address_telephone_number, healthcare_provider_taxonomy_code_1')
        .in('npi', npiList)
    : { data: [] };

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
            nppes.provider_first_line_business_practice_location_address,
            nppes.provider_business_practice_location_address_city_name,
            nppes.provider_business_practice_location_address_state_name,
            nppes.provider_business_practice_location_address_postal_code?.slice(0, 5),
          ].filter(Boolean).join(', ')
        : null,
      nppes_phone: nppes?.provider_business_practice_location_address_telephone_number || null,
      nppes_specialty: nppes?.healthcare_provider_taxonomy_code_1 || null,
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
function deduplicateSnapshots(
  snapshots: Array<{
    npi: string;
    payer_code: string;
    snapshot_date: string;
    [key: string]: unknown;
  }>,
) {
  const seen = new Map<string, typeof snapshots[0]>();
  for (const snap of snapshots) {
    const key = `${snap.npi}_${snap.payer_code}`;
    if (!seen.has(key)) {
      seen.set(key, snap);
    }
    // Already sorted desc, first one wins
  }
  return Array.from(seen.values());
}
