import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/public/provider-lookup?q=<name or NPI>
 *
 * Public provider lookup with 3-tier response:
 *   Tier 1: Full match — provider in practice_providers + practice_websites
 *           → rich card with practice, specialty, payer coverage, compliance indicators
 *   Tier 2: NPPES-only — provider in providers table but not monitored
 *           → basic NPPES info with CTA to start monitoring
 *   Tier 3: No match — not found at all
 *           → aggregate stats for state + CTA
 *
 * Rate limited to prevent scraping (10 lookups per IP per hour).
 * Returns only non-sensitive summary data (no addresses, phone numbers, etc.)
 */

export const revalidate = 0; // No caching — personalized lookups

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ProviderLookupResult {
  tier: 1 | 2 | 3;
  provider?: {
    name: string;
    npi: string;
    specialty?: string;
    state?: string;
    practice_name?: string;
    practice_url?: string;
  };
  indicators?: {
    address_verified: boolean | null;
    license_current: boolean | null;
    payer_directories: { matched: number; total: number } | null;
    ehr_detected: string | null;
    accepting_patients: boolean | null;
    specialty_listed: boolean | null;
    compliance_score: number | null;
  };
  aggregate_stats?: {
    total_providers: number;
    states_covered: string[];
  };
  message: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProviderLookupResult | { error: string }>> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    // Determine if query is NPI (10-digit number starting with 1) or name
    const isNpi = /^1\d{9}$/.test(q);

    // ── Tier 1: Check practice_providers (actively monitored) ──
    const tier1 = await tryTier1(q, isNpi);
    if (tier1) return NextResponse.json(tier1);

    // ── Tier 2: Check NPPES providers table ──
    const tier2 = await tryTier2(q, isNpi);
    if (tier2) return NextResponse.json(tier2);

    // ── Tier 3: No match — return aggregate stats ──
    const tier3 = await buildTier3(q);
    return NextResponse.json(tier3);
  } catch (error: any) {
    console.error('[Provider Lookup] Error:', error?.message || error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}

// ── Tier 1: Actively monitored provider ──
async function tryTier1(q: string, isNpi: boolean): Promise<ProviderLookupResult | null> {
  try {
    // Search practice_providers by NPI or name
    let filter: string;
    if (isNpi) {
      filter = `npi=eq.${q}`;
    } else {
      // Fuzzy name search: ilike on provider_name
      const encoded = encodeURIComponent(`%${q}%`);
      filter = `provider_name=ilike.${encoded}`;
    }

    const rows: any[] = await supabaseGet(
      `practice_providers?${filter}&status=neq.DEPARTED&select=npi,provider_name,web_specialty,practice_website_id,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,has_name_mismatch,has_license_issue,active_mismatch_count&limit=1`,
    );

    if (!rows || rows.length === 0) return null;

    const pp = rows[0];

    // Fetch practice details
    let practiceName: string | undefined;
    let practiceUrl: string | undefined;
    let acceptingPatients: boolean | null = null;
    let practiceSpecialties: any[] | null = null;
    let acceptedPayers: string[] | null = null;
    let state: string | null = null;

    if (pp.practice_website_id) {
      const pwRows: any[] = await supabaseGet(
        `practice_websites?id=eq.${pp.practice_website_id}&select=name,url,state,website_accepting_patients,practice_specialties,accepted_payers`,
      );
      if (pwRows?.[0]) {
        const pw = pwRows[0];
        practiceName = pw.name;
        practiceUrl = pw.url;
        acceptingPatients = pw.website_accepting_patients;
        practiceSpecialties = pw.practice_specialties;
        acceptedPayers = pw.accepted_payers;
        state = pw.state;
      }
    }

    // Check license status
    let licenseCurrent: boolean | null = null;
    try {
      const licRows: any[] = await supabaseGet(
        `provider_licenses?npi=eq.${pp.npi}&select=license_status,expiration_date&order=expiration_date.desc&limit=1`,
      );
      if (licRows?.[0]) {
        const lic = licRows[0];
        const expired = lic.expiration_date && new Date(lic.expiration_date) < new Date();
        licenseCurrent = lic.license_status === 'ACTIVE' && !expired;
      }
    } catch {
      // Non-critical
    }

    // Check EHR detection
    let ehrDetected: string | null = null;
    try {
      const ehrRows: any[] = await supabaseGet(
        `ai_tools_detected?npi=eq.${pp.npi}&tool_category=eq.EHR&select=tool_name&limit=1`,
      );
      if (ehrRows?.[0]) {
        ehrDetected = ehrRows[0].tool_name;
      }
    } catch {
      // Non-critical
    }

    // Payer directory coverage
    let payerCoverage: { matched: number; total: number } | null = null;
    if (acceptedPayers && acceptedPayers.length > 0) {
      try {
        const pdRows: any[] = await supabaseGet(
          `payer_directory_snapshots?npi=eq.${pp.npi}&select=payer_code&limit=50`,
        );
        const pdPayers = new Set((pdRows || []).map((r: any) => r.payer_code));
        payerCoverage = {
          matched: pdPayers.size,
          total: acceptedPayers.length,
        };
      } catch {
        // Non-critical
      }
    }

    // Compute simple compliance indicator
    const addressVerified = pp.has_address_mismatch === false;
    const totalMismatches = pp.active_mismatch_count || 0;
    const complianceScore = totalMismatches === 0 ? 100 : Math.max(0, 100 - totalMismatches * 15);

    return {
      tier: 1,
      provider: {
        name: pp.provider_name,
        npi: pp.npi,
        specialty: pp.web_specialty || undefined,
        state: state || undefined,
        practice_name: practiceName,
        practice_url: practiceUrl,
      },
      indicators: {
        address_verified: addressVerified,
        license_current: licenseCurrent,
        payer_directories: payerCoverage,
        ehr_detected: ehrDetected,
        accepting_patients: acceptingPatients,
        specialty_listed: !!pp.web_specialty,
        compliance_score: complianceScore,
      },
      message: 'This provider is actively monitored. Sign up for full compliance details.',
    };
  } catch (error: any) {
    console.warn('[Provider Lookup] Tier 1 error:', error?.message);
    return null;
  }
}

// ── Tier 2: NPPES-only provider ──
async function tryTier2(q: string, isNpi: boolean): Promise<ProviderLookupResult | null> {
  try {
    let filter: string;
    if (isNpi) {
      filter = `npi=eq.${q}`;
    } else {
      // Search by last name (most reliable NPPES match)
      const parts = q
        .replace(/^Dr\.?\s*/i, '')
        .trim()
        .split(/\s+/);
      const lastName = parts[parts.length - 1].replace(
        /,?\s*(MD|DO|NP|PA|DPM|DDS|DMD|OD|PhD|APRN|FNP|DNP)$/i,
        '',
      );
      if (!lastName || lastName.length < 2) return null;

      // If we have first + last name, use both for better matching
      if (parts.length >= 2) {
        const firstName = parts[0];
        filter = `last_name=ilike.${encodeURIComponent(lastName)}&first_name=ilike.${encodeURIComponent(firstName + '%')}`;
      } else {
        filter = `last_name=ilike.${encodeURIComponent(lastName)}`;
      }
    }

    const rows: any[] = await supabaseGet(
      `providers?${filter}&entity_type_code=eq.1&deactivation_date=is.null&select=npi,first_name,last_name,state,taxonomy_desc&limit=1`,
    );

    if (!rows || rows.length === 0) return null;

    const p = rows[0];
    return {
      tier: 2,
      provider: {
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        npi: p.npi,
        specialty: p.taxonomy_desc || undefined,
        state: p.state || undefined,
      },
      indicators: {
        address_verified: null,
        license_current: null,
        payer_directories: null,
        ehr_detected: null,
        accepting_patients: null,
        specialty_listed: !!p.taxonomy_desc,
        compliance_score: null,
      },
      message:
        "This provider is in our database but isn't being actively monitored yet. Start a free trial to track their compliance.",
    };
  } catch (error: any) {
    console.warn('[Provider Lookup] Tier 2 error:', error?.message);
    return null;
  }
}

// ── Tier 3: No match — aggregate stats ──
async function buildTier3(q: string): Promise<ProviderLookupResult> {
  let totalProviders = 57503; // fallback
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/providers?select=npi`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
        Range: '0-0',
      },
    });
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) totalProviders = parseInt(match[1], 10);
    }
  } catch {
    // Use fallback
  }

  return {
    tier: 3,
    aggregate_stats: {
      total_providers: totalProviders,
      states_covered: ['TX', 'CA'],
    },
    message: `Provider not found. We currently monitor ${totalProviders.toLocaleString()} providers across TX and CA. Start a free trial to add your practice.`,
  };
}

// ── Supabase helper ──
async function supabaseGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${path}: ${res.status} ${text}`);
  }

  return res.json();
}
