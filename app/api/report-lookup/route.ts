import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/report-lookup?code={code}
 *
 * Looks up a provider by their campaign report code.
 * Returns provider info + scan findings for the /report/[code] landing page.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseGet(table: string, query: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || !/^[a-zA-Z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  // Look up the code in campaign_outreach table
  const outreach = await supabaseGet('campaign_outreach', `report_code=eq.${encodeURIComponent(code)}&limit=1`);
  if (!outreach || outreach.length === 0) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const npi = outreach[0].npi as string;

  // Fetch provider from registry
  const providers = await supabaseGet('registry', `npi=eq.${npi}&limit=1`);
  const provider = providers?.[0] || null;

  // Fetch latest scan report
  const reports = await supabaseGet(
    'scan_reports',
    `npi=eq.${npi}&order=report_date.desc&limit=1&select=npi,report_id,report_date,sovereignty_score,compliance_status,findings,category_scores,data_border_map,practice_name,website_url`
  );
  const scanReport = reports?.[0] || null;

  if (!provider && !scanReport) {
    return NextResponse.json({ error: 'Provider data not found' }, { status: 404 });
  }

  return NextResponse.json({
    npi,
    practice_name: (provider?.name as string) || (scanReport?.practice_name as string) || 'Healthcare Provider',
    url: (provider?.url as string) || (scanReport?.website_url as string) || '',
    score: (scanReport?.sovereignty_score as number) ?? (provider?.risk_score as number) ?? null,
    compliance_status: (scanReport?.compliance_status as string) || '',
    findings: (scanReport?.findings as unknown[]) || [],
    category_scores: scanReport?.category_scores || null,
    data_border_map: (scanReport?.data_border_map as unknown[]) || [],
    is_paid: (provider?.is_paid as boolean) || false,
    report_status: (provider?.report_status as string) || 'none',
    latest_report_url: (provider?.latest_report_url as string) || null,
    report_id: (scanReport?.report_id as string) || null,
  });
}
