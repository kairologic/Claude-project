import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Report Generation API
 * =================================
 * POST /api/report
 * 
 * Accepts full scan results payload, generates a report ID,
 * stores the complete scan snapshot in the scan_reports table,
 * and returns the report metadata for admin UI display.
 * 
 * The PDF itself is generated client-side via jsPDF (browser)
 * or can be generated server-side via a future Edge Function.
 * This endpoint handles the DATA layer — storing the full
 * scan snapshot so reports can be regenerated at any time.
 * 
 * GET /api/report?npi=XXXXXXXXXX
 * Returns all reports for a given NPI (newest first).
 * 
 * GET /api/report?reportId=KL-SAR-XXXX
 * Returns a single report by report ID.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

function generateReportId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `KL-SAR-${dateStr}-${hex}`;
}

// ── POST: Store a new report from scan results ──
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields
    const { npi, url, riskScore, findings, categoryScores, dataBorderMap, pageContext, npiVerification, engineVersion, scanDuration } = body;

    if (!npi || !findings || !Array.isArray(findings)) {
      return NextResponse.json({ error: 'Missing required fields: npi, findings' }, { status: 400 });
    }

    const reportId = generateReportId();
    const reportDate = new Date().toISOString();

    // Determine provider name from multiple sources
    const practiceName = body.providerName || body.name || npiVerification?.name || 'Unknown Practice';

    // Build the report record
    const reportRecord = {
      npi,
      registry_id: npi,
      report_id: reportId,
      report_date: reportDate,
      engine_version: engineVersion || 'SENTRY-3.0.0',
      sovereignty_score: riskScore || 0,
      compliance_status: body.complianceStatus || (riskScore >= 67 ? 'Sovereign' : riskScore >= 34 ? 'Drift' : 'Violation'),
      category_scores: categoryScores || null,
      data_border_map: dataBorderMap || [],
      findings: findings,
      page_context: pageContext || null,
      npi_verification: npiVerification || null,
      scan_meta: body.meta || { engine: engineVersion, duration: `${scanDuration}ms` },
      practice_name: practiceName,
      website_url: url || '',
      // PDF fields will be populated later when client-side PDF is generated
      pdf_base64: null,
      pdf_size_bytes: null,
      pdf_storage_path: null,
    };

    // Store in Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/scan_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(reportRecord)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[REPORT] Supabase insert failed:', errorText);
      // Return report ID anyway so frontend can still show results
      return NextResponse.json({
        reportId,
        reportDate,
        stored: false,
        error: 'Database storage failed',
        detail: errorText,
        duration: `${Date.now() - startTime}ms`
      }, { status: 207 }); // 207 = partial success
    }

    const stored = await response.json();

    return NextResponse.json({
      reportId,
      reportDate,
      stored: true,
      record: stored[0] || stored,
      duration: `${Date.now() - startTime}ms`
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[REPORT] Generation failed:', msg);
    return NextResponse.json({ error: 'Report generation failed', message: msg }, { status: 500 });
  }
}

// ── GET: Retrieve reports by NPI or report ID ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npi = searchParams.get('npi');
  const reportId = searchParams.get('reportId');

  if (!npi && !reportId) {
    return NextResponse.json({ error: 'Provide npi or reportId parameter' }, { status: 400 });
  }

  try {
    let queryUrl = `${SUPABASE_URL}/rest/v1/scan_reports?select=*`;

    if (reportId) {
      queryUrl += `&report_id=eq.${encodeURIComponent(reportId)}`;
    } else if (npi) {
      queryUrl += `&npi=eq.${encodeURIComponent(npi)}&order=report_date.desc`;
    }

    const response = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to fetch reports', detail: errorText }, { status: 500 });
    }

    const reports = await response.json();

    // If single report requested, return first (or 404)
    if (reportId) {
      if (reports.length === 0) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json(reports[0]);
    }

    // Return all reports for NPI
    return NextResponse.json({
      npi,
      count: reports.length,
      reports: reports.map((r: Record<string, unknown>) => ({
        id: r.id,
        report_id: r.report_id,
        report_date: r.report_date,
        sovereignty_score: r.sovereignty_score,
        compliance_status: r.compliance_status,
        engine_version: r.engine_version,
        practice_name: r.practice_name,
        website_url: r.website_url,
        has_pdf: !!(r.pdf_base64 || r.pdf_storage_path),
        emailed_at: r.emailed_at,
        payment_confirmed: r.payment_confirmed,
        category_scores: r.category_scores,
      }))
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to retrieve reports', message: msg }, { status: 500 });
  }
}

// ── PATCH: Update report (attach PDF, mark emailed, etc.) ──
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, ...updates } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    // Whitelist updatable fields
    const allowed = ['pdf_base64', 'pdf_size_bytes', 'pdf_storage_path', 'emailed_at', 'emailed_to', 'downloaded_at', 'payment_confirmed'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(safeUpdates)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Update failed', detail: errorText }, { status: 500 });
    }

    const updated = await response.json();
    return NextResponse.json({ success: true, record: updated[0] || updated });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Update failed', message: msg }, { status: 500 });
  }
}
