import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/report-lookup?code={code}
 *
 * Looks up a provider by their campaign report code.
 * Returns provider info + scan findings for the /report/[code] landing page.
 * Parses last_scan_result JSON from registry for grouped findings.
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

interface ScanFinding {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  detail?: string;
  clause?: string;
  check_id?: string;
  category?: string;
  severity?: string;
  evidence?: Record<string, unknown>;
  tier?: string;
  score?: number;
  regulation?: string;
  fix_priority?: string;
}

interface ParsedScanResult {
  score: number | null;
  level: string;
  sb1188_findings: ScanFinding[];
  hb149_findings: ScanFinding[];
  npi_checks: ScanFinding[];
  technical_fixes: ScanFinding[];
  data_border_map: Array<{
    domain?: string;
    country?: string;
    city?: string;
    type?: string;
    sovereign?: boolean;
  }>;
}

function parseScanResult(raw: unknown): ParsedScanResult {
  const defaults: ParsedScanResult = {
    score: null,
    level: '',
    sb1188_findings: [],
    hb149_findings: [],
    npi_checks: [],
    technical_fixes: [],
    data_border_map: [],
  };

  if (!raw) return defaults;

  let parsed: Record<string, unknown>;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return defaults; }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>;
  } else {
    return defaults;
  }

  // Build data_border_map from DR-01 and DR-04 evidence
  const borderMap: ParsedScanResult['data_border_map'] = [];
  const sb1188 = (parsed.sb1188_findings as ScanFinding[]) || [];

  for (const finding of sb1188) {
    if (finding.id === 'DR-01' && finding.evidence) {
      const geo = finding.evidence.geo as string;
      const ip = finding.evidence.ip as string;
      const isUS = finding.evidence.isUS as boolean;
      if (ip) {
        borderMap.push({
          domain: ip.replace(/\.$/, ''),
          country: geo || 'Unknown',
          type: 'Primary Domain',
          sovereign: isUS,
        });
      }
    }
    if (finding.id === 'DR-04' && finding.evidence) {
      const nonUS = (finding.evidence.non_us as Array<{ domain?: string; country?: string }>) || [];
      for (const ep of nonUS) {
        borderMap.push({
          domain: ep.domain || 'unknown',
          country: ep.country || 'Foreign',
          type: 'Third-Party',
          sovereign: false,
        });
      }
    }
  }

  return {
    score: (parsed.score as number) ?? null,
    level: (parsed.level as string) || '',
    sb1188_findings: sb1188,
    hb149_findings: (parsed.hb149_findings as ScanFinding[]) || [],
    npi_checks: (parsed.npi_checks as ScanFinding[]) || [],
    technical_fixes: (parsed.technical_fixes as ScanFinding[]) || [],
    data_border_map: borderMap,
  };
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

  // Fetch provider from registry (includes last_scan_result JSON)
  const providers = await supabaseGet(
    'registry',
    `npi=eq.${npi}&limit=1&select=npi,name,url,risk_score,risk_level,last_scan_result,is_paid,report_status,latest_report_url`
  );
  const provider = providers?.[0] || null;

  if (!provider) {
    return NextResponse.json({ error: 'Provider data not found' }, { status: 404 });
  }

  // Parse the last_scan_result JSON for grouped findings
  const scan = parseScanResult(provider.last_scan_result);

  // Also try scan_reports table as fallback
  let reportId: string | null = null;
  const reports = await supabaseGet(
    'scan_reports',
    `npi=eq.${npi}&order=report_date.desc&limit=1&select=report_id`
  );
  if (reports && reports.length > 0) {
    reportId = (reports[0].report_id as string) || null;
  }

  return NextResponse.json({
    npi,
    practice_name: (provider.name as string) || 'Healthcare Provider',
    url: (provider.url as string) || '',
    score: scan.score ?? (provider.risk_score as number) ?? null,
    level: scan.level,
    sb1188_findings: scan.sb1188_findings,
    hb149_findings: scan.hb149_findings,
    npi_checks: scan.npi_checks,
    technical_fixes: scan.technical_fixes,
    data_border_map: scan.data_border_map,
    is_paid: (provider.is_paid as boolean) || false,
    report_status: (provider.report_status as string) || 'none',
    latest_report_url: (provider.latest_report_url as string) || null,
    report_id: reportId,
  });
}
