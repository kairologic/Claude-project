/**
 * POST /api/admin/test-aetna-batch
 * Temporary test endpoint: queries Aetna FHIR for a list of NPIs
 * Input: { npis: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { FhirDirectoryClient } from '@/lib/payer-directory/fhir-client';
import type { PayerEndpoint } from '@/lib/payer-directory/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  const { npis } = await req.json();
  if (!npis || !Array.isArray(npis) || npis.length === 0) {
    return NextResponse.json({ error: 'npis array required' }, { status: 400 });
  }

  // Get Aetna endpoint config from DB
  const epRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payer_directory_endpoints?payer_code=eq.aetna&is_active=eq.true`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const endpoints = await epRes.json();
  if (!endpoints.length) {
    return NextResponse.json({ error: 'Aetna endpoint not found' }, { status: 404 });
  }
  const endpoint: PayerEndpoint = endpoints[0];

  const client = new FhirDirectoryClient();
  const results: Array<{ npi: string; found: boolean; name: string | null; error: string | null }> = [];

  for (const npi of npis.slice(0, 50)) { // cap at 50
    try {
      const snapshot = await client.lookupByNpi(npi, endpoint, undefined, undefined);
      results.push({
        npi,
        found: !!(snapshot?.listed_name_full),
        name: snapshot?.listed_name_full || null,
        error: null
      });
    } catch (err: unknown) {
      results.push({
        npi,
        found: false,
        name: null,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found && !r.error);
  const errors = results.filter(r => r.error);

  return NextResponse.json({
    tested: results.length,
    found: found.length,
    not_found: notFound.length,
    errors: errors.length,
    found_details: found.map(r => ({ npi: r.npi, name: r.name })),
    error_details: errors.slice(0, 5).map(r => ({ npi: r.npi, error: r.error })),
    results
  });
}
