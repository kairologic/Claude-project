'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Download, Code, Shield, FileText, Clock, ArrowRight, AlertTriangle, Copy, ExternalLink, Zap } from 'lucide-react';
import { generateAuditPDF } from '@/lib/generateAuditPDF';

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
  product: 'report' | 'safe-harbor' | 'shield' | 'watch' | 'unknown';
  npi: string;
  email: string;
  reportData: ScanReport | null;
  reportAge: number;
  includesShieldTrial: boolean;
  dashboardToken: string;
}

const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const REPORT_MAX_AGE_DAYS = 30;

// ── Product configs (v3 — 3 products + hidden watch) ──
const PRODUCT_CONFIG: Record<string, { title: string; subtitle: string; icon: any; color: string; includes: string[] }> = {
  'report': {
    title: 'Sovereignty Audit Report',
    subtitle: '+ 3 Months Sentry Shield FREE',
    icon: FileText,
    color: 'text-amber-600',
    includes: [
      'Forensic audit report (PDF)',
      'Data border map',
      'Remediation roadmap',
      'Statutory clause mapping',
      '3 months Sentry Shield monitoring',
      'Live compliance dashboard',
      'Website compliance widget',
    ],
  },
  'safe-harbor': {
    title: 'Safe Harbor\u2122 Compliance Bundle',
    subtitle: '+ 3 Months Sentry Shield FREE',
    icon: Shield,
    color: 'text-orange-600',
    includes: [
      'Everything in Audit Report',
      'SB 1188 Policy Pack',
      'AI Disclosure Kit',
      'Evidence Ledger Templates',
      'Staff Training Guide',
      'Implementation Blueprint',
      '3 months Sentry Shield monitoring',
      'Live compliance dashboard',
      'Website compliance widget',
    ],
  },
  'shield': {
    title: 'Sentry Shield — Continuous Compliance',
    subtitle: 'Active Subscription',
    icon: Shield,
    color: 'text-green-600',
    includes: [
      'Free Sovereignty Audit Report (PDF)',
      '24/7 compliance monitoring',
      'Live compliance dashboard',
      'Website compliance widget',
      'Quarterly forensic reports',
      'Annual certification seal',
      'Compliance drift alerts',
      'Priority support',
    ],
  },
  'watch': {
    title: 'Sentry Watch — Basic Monitoring',
    subtitle: 'Active Subscription',
    icon: Shield,
    color: 'text-blue-600',
    includes: [
      'Automated monthly re-scans',
      'Compliance drift alerts',
      'Monthly compliance reports',
      'Website compliance widget',
    ],
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
    // Try scan_reports table first (formal reports)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/scan_reports?npi=eq.${npi}&order=report_date.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const report = data[0] as ScanReport;
          const ageDays = Math.floor((Date.now() - new Date(report.report_date).getTime()) / (1000 * 60 * 60 * 24));
          return { report, ageDays };
        }
      }
    } catch { /* fall through to registry */ }

    // Fallback: read last_scan_result from registry (campaign providers have data here)
    try {
      const regRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&limit=1&select=npi,name,url,risk_score,last_scan_result,last_scan_timestamp`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (!regRes.ok) return { report: null, ageDays: 999 };
      const regData = await regRes.json();
      if (!regData || regData.length === 0) return { report: null, ageDays: 999 };

      const provider = regData[0];
      const scanResult = typeof provider.last_scan_result === 'string'
        ? JSON.parse(provider.last_scan_result)
        : provider.last_scan_result;

      if (!scanResult) return { report: null, ageDays: 999 };

      // Map live scan format to ScanReport shape
      const scanTs = scanResult.scanTimestamp || provider.last_scan_timestamp;
      const reportDate = scanTs ? new Date(typeof scanTs === 'number' ? scanTs : scanTs).toISOString() : new Date().toISOString();
      const ageDays = scanTs ? Math.floor((Date.now() - new Date(typeof scanTs === 'number' ? scanTs : scanTs).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const report: ScanReport = {
        report_id: `LIVE-${npi}-${Date.now().toString(36)}`,
        report_date: reportDate,
        npi: scanResult.npi || npi,
        website_url: scanResult.url || provider.url || '',
        practice_name: provider.name || 'Healthcare Practice',
        sovereignty_score: scanResult.riskScore ?? provider.risk_score ?? 0,
        compliance_status: scanResult.complianceStatus || (scanResult.riskScore >= 80 ? 'Sovereign' : scanResult.riskScore >= 60 ? 'Drift' : 'Violation'),
        findings: scanResult.findings || [],
        category_scores: scanResult.categoryScores || {},
        data_border_map: scanResult.dataBorderMap || [],
        engine_version: scanResult.engineVersion || 'SENTRY-3.2.0',
        scan_meta: scanResult.meta || { checksRun: scanResult.findings?.length || 0, duration: scanResult.scanDuration ? `${scanResult.scanDuration}ms` : undefined },
        page_context: scanResult.pageContext || {},
        npi_verification: scanResult.npiVerification || {},
      };

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
      let includesShieldTrial = false;

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
            includesShieldTrial = session.includesShieldTrial || false;
          }
        } catch (e) {
          console.error('Failed to fetch Stripe session:', e);
        }
      } else {
        // Fallback: try to detect from URL params
        const urlProduct = searchParams.get('product');
        if (urlProduct && PRODUCT_CONFIG[urlProduct]) product = urlProduct as PurchaseInfo['product'];
        // Report and Safe Harbor always include Shield trial
        includesShieldTrial = product === 'report' || product === 'safe-harbor';
      }

      if (npi) {
        const { report, ageDays } = await fetchReport(npi);
        // Fetch dashboard_token from registry
        let dashboardToken = '';
        try {
          const tokenRes = await fetch(
            `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&limit=1&select=dashboard_token`,
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData?.[0]?.dashboard_token) dashboardToken = tokenData[0].dashboard_token;
          }
        } catch { /* no token available yet */ }
        setPurchaseInfo({ product, npi, email, reportData: report, reportAge: ageDays, includesShieldTrial, dashboardToken });
      } else {
        setPurchaseInfo({ product, npi, email, reportData: null, reportAge: 999, includesShieldTrial, dashboardToken: '' });
      }
      setLoading(false);
    };
    init();
  }, [searchParams, fetchReport]);

  // ── PDF Generation (shared v3.3 template) ──
  const handleDownloadReport = async () => {
    if (!purchaseInfo?.reportData) return;
    setGenerating(true);
    setError('');
    try {
      const report = purchaseInfo.reportData;
      const score = report.sovereignty_score || 0;

      await generateAuditPDF({
        practiceName: report.practice_name || 'Healthcare Practice',
        npi: report.npi,
        websiteUrl: report.website_url || '',
        score,
        complianceStatus: report.compliance_status,
        categoryScores: report.category_scores,
        findings: report.findings || [],
        dataBorderMap: report.data_border_map || [],
        reportId: report.report_id,
        reportDate: report.report_date,
        engineVersion: report.engine_version || 'SENTRY-3.3.0',
        checksRun: report.scan_meta?.checksRun || report.findings?.length || 0,
        scanDuration: report.scan_meta?.duration || undefined,
        cdnDetection: report.scan_meta?.cdnDetected ? {
          detected: true,
          provider: report.scan_meta?.cdnProvider || undefined,
          detectedVia: report.scan_meta?.cdnDetectedVia || undefined,
        } : undefined,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('PDF generation failed. Please try again or contact support.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Widget embed code ──
  const getWidgetCode = () => {
    const npiVal = purchaseInfo?.npi || 'YOUR_NPI';
    return `<!-- KairoLogic Sentry Shield Widget -->\n<script\n  src="https://kairologic.net/sentry.js"\n  data-npi="${npiVal}"\n  data-theme="light"\n  async>\n</script>\n<noscript>\n  <a href="https://kairologic.net/scan?npi=${npiVal}">\n    Compliance verified by KairoLogic\n  </a>\n</noscript>`;
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
  const hasReport = ['report', 'safe-harbor', 'shield'].includes(product);
  const hasSafeHarbor = ['safe-harbor'].includes(product);
  // Every product now gets Shield monitoring (report/safe-harbor via trial, shield directly)
  const hasMonitoring = ['report', 'safe-harbor', 'shield', 'watch'].includes(product);
  const monitoringMode: 'watch' | 'shield' = product === 'watch' ? 'watch' : 'shield';
  const reportFresh = purchaseInfo?.reportData && purchaseInfo.reportAge <= REPORT_MAX_AGE_DAYS;
  const isTrialShield = purchaseInfo?.includesShieldTrial || false;
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
            {config.subtitle && (
              <p className="text-xs text-green-600 font-bold mt-2">{config.subtitle}</p>
            )}
          </div>
        </div>

        {/* ═══ SHIELD TRIAL BANNER ═══ */}
        {isTrialShield && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-sm mb-1">Sentry Shield Activated — 90 Days FREE</h3>
                <p className="text-xs text-green-700 leading-relaxed">
                  Your purchase includes 3 months of Sentry Shield continuous compliance monitoring at no extra cost. 
                  This includes a live dashboard, website compliance widget, drift alerts, and quarterly reports.
                  After your trial, you can continue Shield at $79/mo, switch to Watch at $39/mo, or cancel anytime.
                </p>
              </div>
            </div>
          </div>
        )}

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
                            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors">Run Fresh Scan &rarr; Generate Report</button>
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
                <p className="text-sm text-gray-600 mb-4">Your complete remediation kit. Each document is ready to use &mdash; no customization required.</p>
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

          {/* ── SENTRY SHIELD / WATCH — DASHBOARD + WIDGET CODE ── */}
          {hasMonitoring && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className={`px-6 py-4 border-b flex items-center gap-3 ${monitoringMode === 'shield' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                <Shield className={`w-5 h-5 ${monitoringMode === 'shield' ? 'text-green-600' : 'text-blue-600'}`} />
                <h2 className="font-bold text-navy text-sm">
                  Sentry {monitoringMode === 'shield' ? 'Shield' : 'Watch'} — {isTrialShield ? '90-Day Trial' : 'Active'}
                </h2>
                <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {isTrialShield ? 'TRIAL ACTIVE' : 'ACTIVE'}
                </span>
              </div>
              <div className="p-6 space-y-6">

                {/* Dashboard Access */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2">Your Compliance Dashboard</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Access your live compliance dashboard to monitor your practice&apos;s data sovereignty status in real time.
                  </p>
                  <a href={`/dashboard/${purchaseInfo?.npi || ''}?token=${purchaseInfo?.dashboardToken || ''}`}
                    className={`inline-flex items-center gap-2 font-semibold py-3 px-5 rounded-lg text-sm transition-colors ${
                      monitoringMode === 'shield'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    <ExternalLink className="w-4 h-4" />
                    Open Compliance Dashboard
                  </a>
                </div>

                {/* Widget Code */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2">Website Widget Code</h3>
                  <p className="text-xs text-gray-600 mb-3">Add this code to your website to display your live compliance status badge.</p>
                  <div className="relative">
                    <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
                      {getWidgetCode()}
                    </pre>
                    <button onClick={() => handleCopyCode(getWidgetCode())}
                      className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-md transition-colors" title="Copy to clipboard">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copied && <p className="text-xs text-green-600 font-semibold mt-2">&check; Copied to clipboard</p>}

                  <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Installation Guide</h4>
                    <div className="space-y-2 text-xs text-slate-600">
                      {['Copy the code snippet above', 'Paste it into your website\u2019s HTML \u2014 just before the closing </body> tag', 'A small shield icon will appear in the corner of your site \u2014 patients can click it to see your compliance status'].map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="bg-navy text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3">Works with WordPress, Squarespace, Wix, custom HTML, and any website platform.</p>
                  </div>

                  <div className="mt-3">
                    <Link href={`/widget/test?npi=${purchaseInfo?.npi || ''}`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                      <ExternalLink className="w-3 h-3" /> Preview how the widget looks on your site &rarr;
                    </Link>
                  </div>
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

          {/* ── POST-PURCHASE MESSAGING ── */}
          {(() => {
            // Report or Safe Harbor buyer (already has Shield trial) → reinforce value, no upsell needed
            if (product === 'report' || product === 'safe-harbor') return (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <h3 className="text-green-800 font-bold text-sm mb-1">Your Sentry Shield is active for 90 days</h3>
                <p className="text-green-600 text-xs max-w-lg mx-auto mb-3">
                  Your website is now being monitored 24/7. You&apos;ll receive drift alerts if anything changes.
                  After 90 days, continue Shield at $79/mo, switch to Watch at $39/mo, or cancel anytime.
                </p>
                <a href={`/dashboard/${purchaseInfo?.npi || ''}?token=${purchaseInfo?.dashboardToken || ''}`}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors">
                  View Your Dashboard &rarr;
                </a>
              </div>
            );

            // Shield subscriber → reinforcement
            if (product === 'shield') return (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-green-800 font-bold text-sm mb-1">You have the highest level of protection</h3>
                <p className="text-green-600 text-xs max-w-lg mx-auto">
                  Sentry Shield provides continuous monitoring, quarterly forensic reports, live dashboard access, and annual certification. Your compliance is in expert hands.
                </p>
              </div>
            );

            // Watch subscriber → upsell to Shield
            if (product === 'watch') return (
              <div className="bg-gradient-to-r from-green-900 to-slate-900 rounded-xl p-6 text-center">
                <h3 className="text-white font-bold text-sm mb-1">Want full visibility? Upgrade to Shield.</h3>
                <p className="text-slate-400 text-xs mb-4 max-w-lg mx-auto">
                  Get a live compliance dashboard, quarterly forensic reports, annual certification seal, and priority support.
                </p>
                {/* TODO: Replace with live Shield payment link */}
                <a href="https://buy.stripe.com/SHIELD_LINK_PLACEHOLDER"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors">
                  Upgrade to Sentry Shield &mdash; $79/mo
                </a>
                <p className="text-[10px] text-slate-500 mt-2">Only $40/mo more for enterprise-grade compliance management</p>
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
