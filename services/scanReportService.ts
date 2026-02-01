/**
 * KairoLogic Scan Report Service
 * ===============================
 * Service layer for admin UI to manage forensic audit reports
 * stored in the scan_reports table.
 * 
 * Capabilities:
 * - List all reports for a provider (by NPI)
 * - Fetch single report by report ID (full scan data for regeneration)
 * - Mark report as emailed / downloaded
 * - Attach PDF blob to existing report
 * - Get report counts for dashboard stats
 * - Get report history for provider detail modal
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const headers: Record<string, string> = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// ── Types ──

export interface ScanReportFull {
  id: string;
  npi: string;
  registry_id: string;
  report_id: string;
  report_date: string;
  engine_version: string;
  sovereignty_score: number;
  compliance_status: string;
  category_scores: Record<string, unknown> | null;
  data_border_map: unknown[];
  findings: unknown[];
  page_context: Record<string, unknown> | null;
  npi_verification: Record<string, unknown> | null;
  scan_meta: Record<string, unknown> | null;
  practice_name: string;
  website_url: string;
  pdf_base64: string | null;
  pdf_size_bytes: number | null;
  pdf_storage_path: string | null;
  emailed_at: string | null;
  emailed_to: string | null;
  downloaded_at: string | null;
  payment_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportListItem {
  report_id: string;
  report_date: string;
  sovereignty_score: number;
  compliance_status: string;
  engine_version: string;
  practice_name: string;
  has_pdf: boolean;
  emailed_at: string | null;
  payment_confirmed: boolean;
  findings_count: number;
  violations_count: number;
  category_scores: Record<string, unknown> | null;
}

// ── Core Functions ──

/**
 * Get all reports for a provider, newest first.
 * Used in the admin ProviderDetailModal to show report history.
 */
export async function getReportsForProvider(npi: string): Promise<ReportListItem[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?npi=eq.${npi}&select=report_id,report_date,sovereignty_score,compliance_status,engine_version,practice_name,pdf_base64,pdf_storage_path,emailed_at,payment_confirmed,category_scores,findings&order=report_date.desc`,
      { headers }
    );

    if (!response.ok) return [];

    const data: ScanReportFull[] = await response.json();
    return data.map((r) => ({
      report_id: r.report_id,
      report_date: r.report_date,
      sovereignty_score: r.sovereignty_score,
      compliance_status: r.compliance_status,
      engine_version: r.engine_version,
      practice_name: r.practice_name,
      has_pdf: !!(r.pdf_base64 || r.pdf_storage_path),
      emailed_at: r.emailed_at,
      payment_confirmed: r.payment_confirmed,
      findings_count: Array.isArray(r.findings) ? r.findings.length : 0,
      violations_count: Array.isArray(r.findings) ? r.findings.filter((f: Record<string, unknown>) => f.status === 'fail').length : 0,
      category_scores: r.category_scores,
    }));
  } catch (e) {
    console.error('[ScanReportService] Failed to fetch reports:', e);
    return [];
  }
}

/**
 * Get a single full report by report ID.
 * Contains everything needed to regenerate the PDF.
 */
export async function getReportById(reportId: string): Promise<ScanReportFull | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}&select=*`,
      { headers }
    );

    if (!response.ok) return null;

    const data: ScanReportFull[] = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error('[ScanReportService] Failed to fetch report:', e);
    return null;
  }
}

/**
 * Get the latest report for a provider.
 */
export async function getLatestReport(npi: string): Promise<ScanReportFull | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?npi=eq.${npi}&select=*&order=report_date.desc&limit=1`,
      { headers }
    );

    if (!response.ok) return null;

    const data: ScanReportFull[] = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error('[ScanReportService] Failed to fetch latest report:', e);
    return null;
  }
}

/**
 * Mark a report as emailed to a provider.
 */
export async function markReportEmailed(reportId: string, emailAddress: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          emailed_at: new Date().toISOString(),
          emailed_to: emailAddress,
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Mark a report as downloaded by admin.
 */
export async function markReportDownloaded(reportId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          downloaded_at: new Date().toISOString(),
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Confirm payment for a report (triggered by Stripe webhook).
 */
export async function confirmReportPayment(reportId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          payment_confirmed: true,
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Attach a PDF blob (base64) to an existing report.
 * Called after client-side jsPDF generation in admin UI.
 */
export async function attachPdfToReport(reportId: string, pdfBase64: string, sizeBytes: number): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          pdf_size_bytes: sizeBytes,
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get report statistics for dashboard widget.
 */
export async function getReportStats(): Promise<{
  totalReports: number;
  reportsThisMonth: number;
  emailedCount: number;
  paidCount: number;
}> {
  const defaults = { totalReports: 0, reportsThisMonth: 0, emailedCount: 0, paidCount: 0 };
  try {
    const countHeader = { ...headers, 'Prefer': 'count=exact' };

    const [totalRes, monthRes, emailRes, paidRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/scan_reports?select=id&limit=1`, { headers: countHeader }),
      (() => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return fetch(`${SUPABASE_URL}/rest/v1/scan_reports?select=id&report_date=gte.${startOfMonth.toISOString()}&limit=1`, { headers: countHeader });
      })(),
      fetch(`${SUPABASE_URL}/rest/v1/scan_reports?select=id&emailed_at=not.is.null&limit=1`, { headers: countHeader }),
      fetch(`${SUPABASE_URL}/rest/v1/scan_reports?select=id&payment_confirmed=eq.true&limit=1`, { headers: countHeader }),
    ]);

    const parseCount = (res: Response) => parseInt(res.headers.get('content-range')?.split('/')[1] || '0');

    return {
      totalReports: parseCount(totalRes),
      reportsThisMonth: parseCount(monthRes),
      emailedCount: parseCount(emailRes),
      paidCount: parseCount(paidRes),
    };
  } catch {
    return defaults;
  }
}
