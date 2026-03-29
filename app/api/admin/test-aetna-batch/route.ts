/**
 * POST /api/admin/test-aetna-batch
 * Temporary test endpoint: queries Aetna FHIR for a list of NPIs
 * Input: { npis: string[], raw?: boolean }
 * When raw=true, makes a direct FHIR call and returns the raw bundle
 */
import { NextRequest, NextResponse } from 'next/server';
import { FhirDirectoryClient } from '@/lib/payer-directory/fhir-client';
import type { PayerEndpoint } from '@/lib/payer-directory/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getAetnaEndpoint(): Promise<PayerEndpoint> {
  const epRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payer_directory_endpoints?payer_code=eq.aetna&is_active=eq.true`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const endpoints = await epRes.json();
  if (!endpoints.length) throw new Error('Aetna endpoint not found');
  return endpoints[0];
}

async function getOAuthToken(endpoint: PayerEndpoint): Promise<string> {
  const cfg = endpoint.auth_config as { client_id: string; client_secret: string; token_url: string; scope?: string };
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  if (cfg.scope) body.append('scope', cfg.scope);
  const resp = await fetch(cfg.token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64')}`,
    },
    body,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const { npis, raw } = await req.json();
  if (!npis || !Array.isArray(npis) || npis.length === 0) {
    return NextResponse.json({ error: 'npis array required' }, { status: 400 });
  }

  const endpoint = await getAetnaEndpoint();

  // RAW MODE: direct FHIR call, return raw response for debugging
  if (raw) {
    const token = await getOAuthToken(endpoint);
    const npi = npis[0];
    const npiSystem = 'http://hl7.org/fhir/sid/us-npi';
    const identifierParam = encodeURIComponent(`${npiSystem}|${npi}`);

    // Try multiple search approaches
    const urls = [
      `${endpoint.fhir_base_url}/Practitioner?identifier=${identifierParam}`,
      `${endpoint.fhir_base_url}/Practitioner?identifier=${npi}`,
      `${endpoint.fhir_base_url}/Practitioner?_id=${npi}`,
    ];

    const rawResults: Array<{ url: string; status: number; body: unknown }> = [];
    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          headers: { Accept: 'application/fhir+json', Authorization: `Bearer ${token}` },
        });
        const body = await resp.json();
        rawResults.push({ url, status: resp.status, body });
      } catch (err: unknown) {
        rawResults.push({ url, status: 0, body: { error: err instanceof Error ? err.message : String(err) } });
      }
    }
    return NextResponse.json({ npi, fhir_base_url: endpoint.fhir_base_url, rawResults });
  }

  // NORMAL MODE: use FHIR client
  const client = new FhirDirectoryClient();
  const results: Array<{ npi: string; found: boolean; name: string | null; error: string | null }> = [];

  for (const npi of npis.slice(0, 50)) {
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
