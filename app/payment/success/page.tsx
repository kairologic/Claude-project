'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Download, Code, Shield, FileText, Clock, ArrowRight, AlertTriangle, Copy, ExternalLink } from 'lucide-react';

// ── Types ──
interface ScanReport {
  report_id: string;
  report_date: string;
  npi: string;
  website_url: string;
  practice_name: string;
  sovereignty_score: number;
  compliance_status: string;
  findings: any[];
  category_scores: any;
  data_border_map: any[];
  engine_version: string;
  scan_meta: any;
  page_context: any;
  npi_verification: any;
}

interface PurchaseInfo {
  product: 'report' | 'safe-harbor' | 'watch' | 'shield' | 'safe-harbor-watch' | 'safe-harbor-shield' | 'unknown';
  npi: string;
  email: string;
  reportData: ScanReport | null;
  reportAge: number;
}

const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const REPORT_MAX_AGE_DAYS = 30;

const PRODUCT_CONFIG: Record<string, { title: string; icon: any; color: string; includes: string[] }> = {
  'report': {
    title: 'Sovereignty Audit Report',
    icon: FileText,
    color: 'text-amber-600',
    includes: ['Forensic audit report (PDF)', 'Data border map', 'Remediation roadmap', 'Statutory clause mapping'],
  },
  'safe-harbor': {
    title: 'Safe Harbor\u2122 Bundle',
    icon: Shield,
    color: 'text-orange-600',
    includes: ['Everything in Audit Report', 'SB 1188 Policy Pack', 'AI Disclosure Kit', 'Evidence Ledger Templates', 'Staff Training Guide', 'Implementation Blueprint'],
  },
  'watch': {
    title: 'Sentry Watch',
    icon: Shield,
    color: 'text-blue-600',
    includes: ['Automated monthly re-scans', 'Compliance drift alerts', 'Monthly compliance reports', 'Infrastructure heartbeat'],
  },
  'shield': {
    title: 'Sentry Shield + Free Audit Report',
    icon: Shield,
    color: 'text-green-600',
    includes: ['Free Sovereignty Audit Report (PDF)', 'Everything in Sentry Watch', 'Live compliance dashboard', 'Quarterly forensic reports', 'Annual certification seal', 'Priority support'],
  },
  'safe-harbor-watch': {
    title: 'Safe Harbor\u2122 + Sentry Watch',
    icon: Shield,
    color: 'text-orange-600',
    includes: ['Everything in Safe Harbor\u2122', 'Automated monthly re-scans', 'Compliance drift alerts', 'Monthly compliance reports'],
  },
  'safe-harbor-shield': {
    title: 'Safe Harbor\u2122 + Sentry Shield',
    icon: Shield,
    color: 'text-green-600',
    includes: ['Everything in Safe Harbor\u2122', 'Live compliance dashboard', 'Quarterly forensic reports', 'Annual certification seal', 'Priority support'],
  },
};

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async (npi: string): Promise<{ report: ScanReport | null; ageDays: number }> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scan_reports?npi=eq.${npi}&order=report_date.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return { report: null, ageDays: 999 };
      const data = await res.json();
      if (!data || data.length === 0) return { report: null, ageDays: 999 };
      const report = data[0] as ScanReport;
      const ageDays = Math.floor((Date.now() - new Date(report.report_date).getTime()) / (1000 * 60 * 60 * 24));
      return { report, ageDays };
    } catch {
      return { report: null, ageDays: 999 };
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const sessionId = searchParams.get('session_id');

      let product: PurchaseInfo['product'] = 'report';
      let npi = searchParams.get('client_reference_id') || searchParams.get('npi') || '';
      let email = searchParams.get('prefilled_email') || searchParams.get('email') || '';

      // If we have a Stripe session ID, fetch the real product/NPI/email from Stripe
      if (sessionId) {
        try {
          const res = await fetch(`/api/stripe-session?session_id=${sessionId}`);
          if (res.ok) {
            const session = await res.json();
            if (session.product && PRODUCT_CONFIG[session.product]) {
              product = session.product as PurchaseInfo['product'];
            }
            if (session.npi) npi = session.npi;
            if (session.email) email = session.email;
          }
        } catch (e) {
          console.error('Failed to fetch Stripe session:', e);
        }
      } else {
        // Fallback: try to detect from URL params
        const urlProduct = searchParams.get('product');
        if (urlProduct && PRODUCT_CONFIG[urlProduct]) product = urlProduct as PurchaseInfo['product'];
      }

      if (npi) {
        const { report, ageDays } = await fetchReport(npi);
        setPurchaseInfo({ product, npi, email, reportData: report, reportAge: ageDays });
      } else {
        setPurchaseInfo({ product, npi, email, reportData: null, reportAge: 999 });
      }
      setLoading(false);
    };
    init();
  }, [searchParams, fetchReport]);

  // ── PDF Generation (client-side jsPDF) ──
  const handleDownloadReport = async () => {
    if (!purchaseInfo?.reportData) return;
    setGenerating(true);
    setError('');
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');
      const report = purchaseInfo.reportData;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(0, 35, 78);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setFillColor(197, 160, 89);
      doc.rect(0, 0, pageWidth, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('KAIROLOGIC', 15, 22);
      doc.setFontSize(8);
      doc.setTextColor(197, 160, 89);
      doc.text('STATUTORY AUDIT REPORT', 15, 30);
      doc.setTextColor(150, 160, 180);
      doc.text(`Report: ${report.report_id}`, pageWidth - 15, 18, { align: 'right' });
      doc.text(`Date: ${new Date(report.report_date).toLocaleDateString()}`, pageWidth - 15, 24, { align: 'right' });
      doc.text(`Engine: ${report.engine_version || 'SENTRY-3.1.0'}`, pageWidth - 15, 30, { align: 'right' });

      // Score
      let y = 55;
      const score = report.sovereignty_score || 0;
      const scoreColor: [number, number, number] = score >= 80 ? [22, 163, 74] : score >= 50 ? [217, 119, 6] : [220, 38, 38];
      doc.setDrawColor(...scoreColor);
      doc.setLineWidth(2);
      doc.circle(30, y + 10, 14, 'S');
      doc.setFontSize(22);
      doc.setTextColor(...scoreColor);
      doc.text(String(score), 30, y + 12, { align: 'center' });
      doc.setFontSize(7);
      doc.text(report.compliance_status?.toUpperCase() || 'UNKNOWN', 30, y + 20, { align: 'center' });

      // Practice info
      doc.setFontSize(13);
      doc.setTextColor(0, 35, 78);
      doc.text(report.practice_name || 'Healthcare Practice', 55, y + 5);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`NPI: ${report.npi}`, 55, y + 12);
      doc.text(`URL: ${report.website_url || 'N/A'}`, 55, y + 18);
      y = 90;

      // Category scores
      if (report.category_scores) {
        const cats = report.category_scores;
        const catList = [
          { name: 'Data Residency', score: cats.dataResidency?.percentage || 0, color: [0, 100, 200] as [number, number, number] },
          { name: 'AI Transparency', score: cats.aiTransparency?.percentage || 0, color: [180, 100, 0] as [number, number, number] },
          { name: 'Clinical Integrity', score: cats.ehrIntegrity?.percentage || 0, color: [0, 150, 80] as [number, number, number] },
        ];
        catList.forEach((cat, i) => {
          const cx = 15 + i * 62;
          doc.setFillColor(245, 247, 250);
          doc.roundedRect(cx, y, 56, 20, 3, 3, 'F');
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(cat.name, cx + 5, y + 7);
          doc.setFontSize(16);
          doc.setTextColor(...cat.color);
          doc.text(`${cat.score}%`, cx + 5, y + 16);
        });
        y += 30;
      }

      // Findings
      if (report.findings?.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 35, 78);
        doc.text('Findings', 15, y);
        y += 8;
        report.findings.forEach((f: any) => {
          if (y > 260) { doc.addPage(); y = 20; }
          const sColor: [number, number, number] = f.status === 'pass' ? [22, 163, 74] : f.status === 'warn' ? [217, 119, 6] : [220, 38, 38];
          doc.setFillColor(...sColor);
          doc.rect(15, y, 2, 12, 'F');
          doc.setFontSize(8);
          doc.setTextColor(0, 35, 78);
          doc.text(`${f.id || ''} \u2014 ${f.name || ''}`, 20, y + 4);
          doc.setFontSize(7);
          doc.setTextColor(...sColor);
          doc.text((f.status || '').toUpperCase(), 20, y + 9);
          if (f.description) {
            doc.setTextColor(100, 100, 100);
            const lines = doc.splitTextToSize(f.description, pageWidth - 40);
            doc.text(lines.slice(0, 2), 20, y + 13);
            y += 5 * Math.min(lines.length, 2);
          }
          if (f.recommendedFix || f.technicalFix || f.recommended_fix) {
            const fix = f.recommendedFix || f.technicalFix || f.recommended_fix;
            doc.setFillColor(240, 253, 244);
            doc.roundedRect(20, y + 10, pageWidth - 40, 10, 1, 1, 'F');
            doc.setFontSize(6);
            doc.setTextColor(22, 100, 50);
            doc.text('FIX: ' + fix.substring(0, 120), 22, y + 16);
            y += 12;
          }
          y += 16;
        });
      }

      // Data border map
      if (report.data_border_map?.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setTextColor(0, 35, 78);
        doc.text('Data Border Map', 15, y);
        y += 8;
        const tableData = report.data_border_map.map((e: any) => [
          e.domain || e.ip || '', e.location || e.country || '', e.type || '', e.sovereign ? '\u2713 US' : '\u2717 Foreign',
        ]);
        (doc as any).autoTable({
          startY: y,
          head: [['Endpoint', 'Location', 'Type', 'Sovereign']],
          body: tableData,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [0, 35, 78], textColor: 255 },
          margin: { left: 15, right: 15 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`KairoLogic\u2122 Sovereignty Audit Report \u2014 ${report.report_id} \u2014 Page ${i}/${pageCount}`, pageWidth / 2, 290, { align: 'center' });
        doc.text('CONFIDENTIAL \u2014 FOR AUTHORIZED RECIPIENTS ONLY', pageWidth / 2, 294, { align: 'center' });
      }

      doc.save(`KairoLogic-Audit-${report.npi}-${report.report_id}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('PDF generation failed. Please try again or contact support.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Widget embed code ──
  const getWidgetCode = (mode: 'watch' | 'shield') => {
    const npiVal = purchaseInfo?.npi || 'YOUR_NPI';
    return `<!-- KairoLogic Sentry ${mode === 'shield' ? 'Shield' : 'Watch'} Widget -->\n<script\n  src="https://kairologic.com/widget/sentry.js"\n  data-npi="${npiVal}"\n  data-mode="${mode}"\n  data-theme="light"\n  async>\n</script>\n<noscript>\n  <a href="https://kairologic.com/scan?npi=${npiVal}">\n    Compliance verified by KairoLogic\n  </a>\n</noscript>`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your purchase details...</p>
        </div>
      </div>
    );
  }

  const product = purchaseInfo?.product || 'unknown';
  const config = PRODUCT_CONFIG[product] || PRODUCT_CONFIG['report'];
  const hasReport = ['report', 'safe-harbor', 'safe-harbor-watch', 'safe-harbor-shield', 'shield'].includes(product);
  const hasSafeHarbor = ['safe-harbor', 'safe-harbor-watch', 'safe-harbor-shield'].includes(product);
  const hasMonitoring = ['watch', 'shield', 'safe-harbor-watch', 'safe-harbor-shield'].includes(product);
  const monitoringMode: 'watch' | 'shield' = ['shield', 'safe-harbor-shield'].includes(product) ? 'shield' : 'watch';
  const reportFresh = purchaseInfo?.reportData && purchaseInfo.reportAge <= REPORT_MAX_AGE_DAYS;
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ═══ SUCCESS HEADER ═══ */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 mb-6">
          <div className="bg-gradient-to-r from-navy via-navy to-navy p-6 text-center border-b-4 border-gold">
            <div className="text-2xl font-bold tracking-tighter text-white uppercase font-display">
              KAIRO<span className="text-orange">LOGIC</span>
            </div>
            <p className="text-gold text-[10px] uppercase tracking-[0.2em] mt-1 font-semibold">Purchase Confirmed</p>
          </div>
          <div className="p-8 md:p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2 font-display">Payment Successful</h1>
            <p className="text-gray-500 text-sm mb-4">Thank you for your purchase. Your deliverables are ready below.</p>
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
              <IconComponent className={`w-4 h-4 ${config.color}`} />
              <span className="text-sm font-semibold text-navy">{config.title}</span>
            </div>
          </div>
        </div>

        {/* ═══ DELIVERABLES ═══ */}
        <div className="space-y-4">

          {/* ── AUDIT REPORT ── */}
          {hasReport && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-navy text-sm">Sovereignty Audit Report</h2>
                {reportFresh && <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">READY</span>}
              </div>
              <div className="p-6">
                {purchaseInfo?.reportData ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-black" style={{ color: (purchaseInfo.reportData.sovereignty_score || 0) >= 80 ? '#16a34a' : (purchaseInfo.reportData.sovereignty_score || 0) >= 50 ? '#d97706' : '#dc2626' }}>
                          {purchaseInfo.reportData.sovereignty_score}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">Score</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-black text-navy">{purchaseInfo.reportData.findings?.length || 0}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Findings</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-black text-navy">{purchaseInfo.reportData.data_border_map?.length || 0}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Endpoints</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-xs font-bold text-navy">{purchaseInfo.reportData.report_id}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Report ID</div>
                      </div>
                    </div>

                    {reportFresh ? (
                      <button onClick={handleDownloadReport} disabled={generating}
                        className="w-full bg-navy hover:bg-navy-light text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {generating ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Download Full Report (PDF)</>
                        )}
                      </button>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">Report is older than {REPORT_MAX_AGE_DAYS} days</span>
                        </div>
                        <p className="text-xs text-amber-600 mb-3">Your most recent scan is {purchaseInfo.reportAge} days old. We recommend a fresh scan for the most accurate report.</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link href={`/scan?npi=${purchaseInfo.npi}`} className="flex-1">
                            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors">Run Fresh Scan → Generate Report</button>
                          </Link>
                          <button onClick={handleDownloadReport} disabled={generating}
                            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                            Download Existing Report Anyway
                          </button>
                        </div>
                      </div>
                    )}

                    {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">No scan data found</span>
                    </div>
                    <p className="text-xs text-blue-600 mb-3">We couldn&apos;t find a recent scan for NPI {purchaseInfo?.npi || 'N/A'}. Run a scan to generate your report.</p>
                    <Link href={`/scan?npi=${purchaseInfo?.npi || ''}`}>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors">Run Compliance Scan</button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SAFE HARBOR MATERIALS ── */}
          {hasSafeHarbor && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex items-center gap-3">
                <Shield className="w-5 h-5 text-orange-600" />
                <h2 className="font-bold text-navy text-sm">Safe Harbor&trade; Materials</h2>
                <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">READY</span>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">Your complete remediation kit. Each document is ready to use — no customization required.</p>
                <div className="space-y-2">
                  {[
                    { name: 'SB 1188 Data Sovereignty Policy', file: 'sb1188-policy-pack.pdf', icon: '\uD83D\uDCCB' },
                    { name: 'HB 149 AI Disclosure Kit', file: 'ai-disclosure-kit.zip', icon: '\uD83E\uDD16' },
                    { name: 'Audit Evidence Ledger Templates', file: 'evidence-ledger.xlsx', icon: '\uD83D\uDCC1' },
                    { name: 'Staff Training Guide', file: 'staff-training-guide.pdf', icon: '\uD83D\uDC65' },
                    { name: 'Annual Compliance Roadmap', file: 'compliance-roadmap.pdf', icon: '\uD83D\uDCC5' },
                    { name: 'Implementation Blueprint', file: 'implementation-blueprint.pdf', icon: '\uD83D\uDD27' },
                  ].map((d) => (
                    <a key={d.name} href={`/downloads/safe-harbor/${d.file}`}
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-lg transition-all cursor-pointer group">
                      <span className="text-lg">{d.icon}</span>
                      <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-orange-700">{d.name}</span>
                      <Download className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Documents are generic templates aligned to Texas SB 1188 and HB 149. Customize with your practice details for best results.</p>
              </div>
            </div>
          )}

          {/* ── SENTRY WIDGET CODE ── */}
          {hasMonitoring && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className={`px-6 py-4 border-b flex items-center gap-3 ${monitoringMode === 'shield' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                <Code className={`w-5 h-5 ${monitoringMode === 'shield' ? 'text-green-600' : 'text-blue-600'}`} />
                <h2 className="font-bold text-navy text-sm">Sentry {monitoringMode === 'shield' ? 'Shield' : 'Watch'} — Widget Code</h2>
                <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">Add this code to your website to display your live compliance status badge.</p>
                <div className="relative">
                  <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
                    {getWidgetCode(monitoringMode)}
                  </pre>
                  <button onClick={() => handleCopyCode(getWidgetCode(monitoringMode))}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-md transition-colors" title="Copy to clipboard">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 font-semibold mt-2">&check; Copied to clipboard</p>}

                <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Installation Guide</h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    {['Copy the code snippet above', 'Paste it into your website\u2019s HTML \u2014 just before the closing </body> tag', 'The widget will automatically display your compliance badge and status'].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="bg-navy text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">Works with WordPress, Squarespace, Wix, custom HTML, and any website platform.</p>
                </div>

                <div className="mt-3">
                  <Link href={`/widget/test?npi=${purchaseInfo?.npi || ''}&mode=${monitoringMode}`}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    <ExternalLink className="w-3 h-3" /> Preview how the widget looks on your site &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── WHAT'S INCLUDED ── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">What&apos;s Included in Your Purchase</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {config.includes.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>

          {/* ── UPSELL — ALWAYS PUSH RECURRING REVENUE ── */}
          {(() => {
            const npiRef = purchaseInfo?.npi || '';
            const emailRef = encodeURIComponent(purchaseInfo?.email || '');
            const watchLink = `https://buy.stripe.com/test_9B614n2Mz0168kv0xm4ko01?client_reference_id=${npiRef}&prefilled_email=${emailRef}`;
            const shieldLink = `https://buy.stripe.com/test_5kQfZh1IveW058j7ZO4ko00?client_reference_id=${npiRef}&prefilled_email=${emailRef}`;

            // Audit Report buyer → upsell Watch
            if (purchaseInfo?.product === 'report') return (
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl p-6 text-center">
                <h3 className="text-white font-bold text-sm mb-1">Your report is a snapshot. Compliance is ongoing.</h3>
                <p className="text-slate-400 text-xs mb-4 max-w-lg mx-auto">Plugin updates, hosting changes, and new scripts can silently break your compliance. Sentry Watch monitors your site 24/7 and alerts you the moment something drifts.</p>
                <a href={watchLink} target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors">
                  Add Sentry Watch — $39/mo
                </a>
                <p className="text-[10px] text-slate-500 mt-2">Drift alerts • Monthly re-scans • Compliance reports</p>
              </div>
            );

            // Safe Harbor buyer → upsell Watch
            if (purchaseInfo?.product === 'safe-harbor') return (
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl p-6 text-center">
                <h3 className="text-white font-bold text-sm mb-1">You&apos;ve fixed the issues. Now stay protected.</h3>
                <p className="text-slate-400 text-xs mb-4 max-w-lg mx-auto">Your Safe Harbor remediation gets you compliant today. Sentry Watch ensures you stay compliant tomorrow — automatically.</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
                  <a href={watchLink} target="_blank" rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg text-sm transition-colors">
                    Add Sentry Watch — $39/mo
                  </a>
                  <a href={shieldLink} target="_blank" rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-5 rounded-lg text-sm transition-colors border border-white/20">
                    Upgrade to Shield — $79/mo
                  </a>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Shield adds live dashboard, quarterly forensic reports, and annual certification seal</p>
              </div>
            );

            // Watch buyer → upsell Shield
            if (purchaseInfo?.product === 'watch' || purchaseInfo?.product === 'safe-harbor-watch') return (
              <div className="bg-gradient-to-r from-green-900 to-slate-900 rounded-xl p-6 text-center">
                <h3 className="text-white font-bold text-sm mb-1">Want full visibility? Upgrade to Shield.</h3>
                <p className="text-slate-400 text-xs mb-4 max-w-lg mx-auto">Get a live compliance dashboard, quarterly forensic reports, annual certification seal, and priority support.</p>
                <a href={shieldLink} target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors">
                  Upgrade to Sentry Shield — $79/mo
                </a>
                <p className="text-[10px] text-slate-500 mt-2">Only $40/mo more for full enterprise-grade compliance management</p>
              </div>
            );

            // Shield / Safe Harbor + Shield buyer → no upsell, reinforcement
            if (purchaseInfo?.product === 'shield' || purchaseInfo?.product === 'safe-harbor-shield') return (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-green-800 font-bold text-sm mb-1">You have the highest level of protection</h3>
                <p className="text-green-600 text-xs max-w-lg mx-auto">Sentry Shield provides continuous monitoring, quarterly forensic reports, live dashboard access, and annual certification. Your compliance is in expert hands.</p>
              </div>
            );

            return null;
          })()}

          {/* ── SUPPORT ── */}
          <div className="text-center py-4">
            <p className="text-slate-400 text-xs">
              Questions? Email <a href="mailto:compliance@kairologic.com" className="text-blue-600 hover:underline">compliance@kairologic.com</a> or call (512) 402-2237
            </p>
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-navy mt-2 transition-colors">
              <ArrowRight className="w-3 h-3" /> Return to KairoLogic
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccessPageInner />
    </Suspense>
  );
}
