import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/report-lookup?code={code}
 *
 * Looks up a provider by their campaign report code.
 * Returns provider info + scan findings for the /report/[code] landing page.
 * Parses last_scan_result JSON from registry for grouped findings.
 *
 * Handles TWO formats:
 *   1. Live scan API (v3.x): flat `findings` array with `category` field,
 *      plus `dataBorderMap`, `riskScore`, `riskLevel`, `categoryScores`
 *   2. Legacy pre-grouped: `sb1188_findings`, `hb149_findings`, `npi_checks`
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

async function supabasePatch(table: string, query: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
  } catch { /* non-blocking */ }
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
  phiRisk?: string;
  recommendedFix?: string;
}

interface BorderNode {
  domain?: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  type?: string;
  sovereign?: boolean;
  isSovereign?: boolean;
  phiRisk?: string;
  purpose?: string;
}

interface ParsedScanResult {
  score: number | null;
  level: string;
  sb1188_findings: ScanFinding[];
  hb149_findings: ScanFinding[];
  npi_checks: ScanFinding[];
  technical_fixes: ScanFinding[];
  data_border_map: BorderNode[];
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

  // ── Detect format: live scan (v3.x) vs legacy ──
  const hasFindings = Array.isArray(parsed.findings);
  const hasLegacy = Array.isArray(parsed.sb1188_findings);

  // ── LIVE SCAN FORMAT (v3.x) ──
  // Has: findings[], dataBorderMap[], riskScore, riskLevel, categoryScores, complianceStatus
  if (hasFindings) {
    const findings = parsed.findings as ScanFinding[];
    const score = (parsed.riskScore as number) ?? null;
    const complianceStatus = (parsed.complianceStatus as string) || '';
    const riskLevel = (parsed.riskLevel as string) || '';
    const level = complianceStatus || riskLevel || '';

    // Group findings by category
    const sb1188: ScanFinding[] = [];
    const hb149: ScanFinding[] = [];
    const clinical: ScanFinding[] = [];

    for (const f of findings) {
      const cat = (f.category || '').toLowerCase();
      // Normalize: scan engine uses 'name', landing page expects 'title'
      const normalized: ScanFinding = {
        ...f,
        title: f.title || f.name,
        name: f.name || f.title,
      };

      if (cat === 'data_sovereignty') {
        sb1188.push(normalized);
      } else if (cat === 'ai_transparency') {
        hb149.push(normalized);
      } else if (cat === 'clinical_integrity') {
        clinical.push(normalized);
      }
    }

    // Parse dataBorderMap from scan result
    const borderMap: BorderNode[] = [];
    const rawMap = parsed.dataBorderMap as BorderNode[] | undefined;
    if (Array.isArray(rawMap)) {
      for (const node of rawMap) {
        borderMap.push({
          domain: node.domain || node.ip || 'unknown',
          ip: node.ip,
          country: node.country || 'Unknown',
          countryCode: node.countryCode,
          city: node.city,
          type: node.type || 'unknown',
          sovereign: node.isSovereign ?? node.sovereign ?? false,
          isSovereign: node.isSovereign ?? node.sovereign ?? false,
          phiRisk: node.phiRisk,
          purpose: node.purpose,
        });
      }
    }

    // Parse NPI verification as a finding group
    const npiChecks: ScanFinding[] = [];
    const npiResult = parsed.npiVerification as Record<string, unknown> | undefined;
    if (npiResult) {
      const verified = npiResult.verified as boolean;
      const name = npiResult.name as string;
      const taxonomy = npiResult.taxonomy as string;
      npiChecks.push({
        id: 'NPI-01',
        title: 'NPI Registry Verification',
        name: 'NPI Registry Verification',
        status: verified ? 'pass' : 'fail',
        severity: verified ? 'low' : 'high',
        category: 'npi_integrity',
        detail: verified
          ? `NPI verified in NPPES registry. Provider: ${name || 'confirmed'}. Taxonomy: ${taxonomy || 'confirmed'}.`
          : `NPI could not be verified in the NPPES registry.`,
      });
    }

    return {
      score,
      level,
      sb1188_findings: sb1188,
      hb149_findings: hb149,
      npi_checks: npiChecks,
      technical_fixes: clinical,
      data_border_map: borderMap,
    };
  }

  // ── LEGACY FORMAT ──
  // Has: sb1188_findings[], hb149_findings[], npi_checks[], score, level
  if (hasLegacy) {
    const sb1188 = (parsed.sb1188_findings as ScanFinding[]) || [];
    const borderMap: BorderNode[] = [];

    for (const finding of sb1188) {
      if (finding.id === 'DR-01' && finding.evidence) {
        const ev = finding.evidence;
        borderMap.push({
          domain: (ev.ip as string) || 'unknown',
          country: (ev.geo as string) || 'Unknown',
          type: 'Primary Domain',
          sovereign: ev.isUS as boolean,
        });
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

  return defaults;
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

  // Track landing page visit (non-blocking, fire-and-forget)
  if (!outreach[0].first_viewed_at) {
    supabasePatch(
      'campaign_outreach',
      `report_code=eq.${encodeURIComponent(code)}`,
      { first_viewed_at: new Date().toISOString(), opened: true }
    );
  }

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

  // Use scan result score if available, fall back to registry risk_score
  const score = scan.score ?? (provider.risk_score as number) ?? null;

  // Derive level from score if not in scan result
  let level = scan.level;
  if (!level && score !== null) {
    if (score >= 80) level = 'Sovereign';
    else if (score >= 60) level = 'Drift';
    else level = 'Violation';
  }

  return NextResponse.json({
    npi,
    practice_name: (provider.name as string) || 'Healthcare Provider',
    url: (provider.url as string) || '',
    score,
    level,
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
