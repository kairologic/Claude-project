/**
 * POST /api/admin/practice-payer-sync
 *
 * On-demand payer directory sync for a single practice.
 * Looks up each provider NPI against active FHIR payer directories
 * and upserts snapshot rows. Runs inline (10-30s for typical practices).
 *
 * Input: { practice_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { FhirDirectoryClient } from '@/lib/payer-directory/fhir-client';
import type { PayerEndpoint, DirectorySnapshot } from '@/lib/payer-directory/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST'
        ? 'return=minimal,resolution=merge-duplicates'
        : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path.slice(0, 80)}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { practice_id } = await request.json();
    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }

    // 1. Get practice providers
    const providers = await db(
      `practice_providers?practice_website_id=eq.${practice_id}&select=npi,provider_name&roster_status=eq.active`
    );
    if (!providers || providers.length === 0) {
      return NextResponse.json({ error: 'No active providers found for this practice' }, { status: 404 });
    }

    // 2. Get active payer endpoints
    const endpoints: PayerEndpoint[] = await db(
      'payer_directory_endpoints?is_active=eq.true&select=*'
    );
    if (!endpoints || endpoints.length === 0) {
      return NextResponse.json({ error: 'No active payer endpoints configured' }, { status: 500 });
    }

    // 3. Run FHIR lookups
    const fhirClient = new FhirDirectoryClient();
    const batchId = `admin-sync-${practice_id.slice(0, 8)}-${Date.now()}`;
    const results: { npi: string; payer: string; found: boolean }[] = [];
    let snapshotsUpserted = 0;

    for (const provider of providers) {
      if (!provider.npi) continue;

      for (const endpoint of endpoints) {
        try {
          const snapshot = await fhirClient.lookupByNpi(provider.npi, endpoint, batchId);
          if (!snapshot) continue; // Endpoint inactive or error

          const isListed = !!snapshot.fhir_practitioner_id;
          results.push({ npi: provider.npi, payer: endpoint.payer_code, found: isListed });

          // Read existing consecutive_not_listed_count
          let prevCount = 0;
          try {
            const existing = await db(
              `payer_directory_snapshots?npi=eq.${provider.npi}&payer_code=eq.${endpoint.payer_code}&select=consecutive_not_listed_count&limit=1`
            );
            if (existing && existing.length > 0) {
              prevCount = existing[0].consecutive_not_listed_count || 0;
            }
          } catch { /* first snapshot for this NPI+payer */ }

          const newCount = isListed ? 0 : prevCount + 1;

          // Build snapshot row
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
            consecutive_not_listed_count: newCount,
          };

          if (isListed) {
            snapshotRow.reverification_confirmed = null;
            snapshotRow.last_reverification_at = null;
          }

          // Upsert (merge on npi+payer_code unique constraint)
          await db('payer_directory_snapshots', {
            method: 'POST',
            body: JSON.stringify(snapshotRow),
          });
          snapshotsUpserted++;

        } catch (err) {
          console.warn(`[practice-payer-sync] FHIR error for NPI ${provider.npi} / ${endpoint.payer_code}:`, err);
          results.push({ npi: provider.npi, payer: endpoint.payer_code, found: false });
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const listed = results.filter(r => r.found).length;
    const notListed = results.filter(r => !r.found).length;

    return NextResponse.json({
      success: true,
      practice_id,
      providers_checked: providers.length,
      payers_checked: endpoints.length,
      snapshots_upserted: snapshotsUpserted,
      listed,
      not_listed: notListed,
      elapsed_seconds: parseFloat(elapsed),
      message: `Synced ${providers.length} providers × ${endpoints.length} payers in ${elapsed}s. Listed: ${listed}, Not listed: ${notListed}`,
    });

  } catch (err) {
    console.error('[practice-payer-sync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payer sync failed' },
      { status: 500 },
    );
  }
}
