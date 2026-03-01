'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Shield, FileText, ArrowRight, XCircle, Globe, Bot, Database } from 'lucide-react';

// Live Stripe Payment Links
const STRIPE_LINK_AUDIT = 'https://buy.stripe.com/4gM5kDdpw0HP18x3057Re08';
const STRIPE_LINK_SAFE_HARBOR = 'https://buy.stripe.com/00w28retAeyF6sRgQV7Re07';

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
}

interface ProviderData {
  npi: string;
  practice_name: string;
  url: string;
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
  is_paid: boolean;
  report_status: string;
  latest_report_url: string | null;
  report_id: string | null;
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
  } catch {
    return url;
  }
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return { ring: '#22c55e', text: 'text-green-400', label: 'SOVEREIGN' };
    if (s >= 60) return { ring: '#f59e0b', text: 'text-amber-400', label: 'DRIFT' };
    return { ring: '#ef4444', text: 'text-red-400', label: 'AT RISK' };
  };
  const { ring, text, label } = getColor(score);
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="55" cy="55" r="44" fill="none" stroke={ring} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        <text x="55" y="52" textAnchor="middle" fill="white" fontSize="28" fontWeight="800" fontFamily="inherit">{score}</text>
        <text x="55" y="68" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="inherit">/100</text>
      </svg>
      <span className={`text-xs font-bold uppercase tracking-widest mt-1 ${text}`}>{label}</span>
    </div>
  );
}

function FindingRow({ finding }: { finding: ScanFinding }) {
  const status = finding.status || 'inconclusive';
  const isFail = status === 'fail';
  const isWarn = status === 'warn' || status === 'inconclusive';
  const isPass = status === 'pass';
  const Icon = isFail ? XCircle : isWarn ? AlertTriangle : CheckCircle;
  const color = isFail ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-green-400';
  const bgColor = isFail ? 'bg-red-400/5' : isWarn ? 'bg-amber-400/5' : 'bg-green-400/5';
  const label = finding.name || finding.title || finding.id || finding.check_id || 'Check';
  const detail = finding.detail || (finding.clause ? `Clause: ${finding.clause}` : '');
  return (
    <div className={`flex items-start gap-3 py-3 px-3 rounded-lg ${bgColor}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-white font-medium">{label}</span>
          {finding.clause && <span className="text-[10px] text-gray-500 font-mono">{finding.clause}</span>}
        </div>
        {detail && !isPass && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${isFail ? 'bg-red-400/10 text-red-400' : isWarn ? 'bg-amber-400/10 text-amber-400' : 'bg-green-400/10 text-green-400'}`}>
        {isFail ? 'FAIL' : isWarn ? (status === 'inconclusive' ? 'N/A' : 'WARN') : 'PASS'}
      </span>
    </div>
  );
}

function FindingsGroup({ title, icon: Icon, iconColor, findings, failCount }: { title: string; icon: React.ElementType; iconColor: string; findings: ScanFinding[]; failCount: number }) {
  if (findings.length === 0) return null;
  const passCount = findings.filter(f => f.status === 'pass').length;
  return (
    <div className="bg-[#0d1a2e] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {failCount > 0 && <span className="text-red-400 font-medium">{failCount} failed</span>}
          <span className="text-green-400 font-medium">{passCount} passed</span>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {findings.sort((a, b) => {
          const order: Record<string, number> = { fail: 0, warn: 1, inconclusive: 2, pass: 3 };
          return (order[a.status || 'inconclusive'] ?? 2) - (order[b.status || 'inconclusive'] ?? 2);
        }).map((f, i) => <FindingRow key={`${f.id || f.check_id || i}`} finding={f} />)}
      </div>
    </div>
  );
}

function ProductCard({ title, price, priceNote, features, stripeLink, npi, recommended }: { title: string; price: string; priceNote?: string; features: string[]; stripeLink: string; npi: string; recommended: boolean }) {
  const link = `${stripeLink}?client_reference_id=${npi}`;
  return (
    <div className={`bg-[#0d1a2e] rounded-2xl p-6 md:p-8 flex flex-col relative ${recommended ? 'border-2 border-[#c9a84c] shadow-[0_0_30px_rgba(201,168,76,0.15)]' : 'border border-white/10'}`}>
      {recommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-[#c9a84c] text-[#0a1628] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">Recommended for You</span>
        </div>
      )}
      <div className={`flex items-center justify-between mb-1 ${recommended ? 'mt-2' : ''}`}>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <span className="text-[#c9a84c] text-2xl font-bold">{price}</span>
      </div>
      {priceNote && <p className="text-xs text-gray-400 mb-5">{priceNote}</p>}
      <ul className="space-y-3 text-sm text-gray-300 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />{f}
          </li>
        ))}
      </ul>
      <a href={link} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 ${recommended ? 'bg-[#c9a84c] hover:bg-[#b8933d] text-[#0a1628]' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}>
        Get Started <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function ReportLandingPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/report-lookup?code=${encodeURIComponent(code)}`);
        if (!res.ok) { setError(true); setLoading(false); return; }
        const json = await res.json();
        setData(json);
      } catch { setError(true); } finally { setLoading(false); }
    };
    fetchData();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0d1a2e] rounded-full mb-6"><Shield className="w-8 h-8 text-gray-500" /></div>
          <h1 className="text-2xl font-bold text-white mb-3">Report Not Found</h1>
          <p className="text-gray-400 mb-6">This report link may be invalid or expired. If you believe this is an error, please contact us for assistance.</p>
          <a href="mailto:ravi@kairologic.net" className="inline-flex items-center gap-2 text-[#c9a84c] hover:text-[#d4b44e] transition-colors font-medium">Contact ravi@kairologic.net <ArrowRight className="w-4 h-4" /></a>
        </div>
      </div>
    );
  }

  if (data.is_paid) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <div className="border-b border-white/10"><div className="max-w-4xl mx-auto px-4 py-4"><Link href="/" className="inline-flex items-center gap-1 text-xl font-extrabold tracking-tight"><span className="text-white">Kairo</span><span className="text-[#c9a84c]">Logic</span></Link></div></div>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6"><CheckCircle className="w-8 h-8 text-green-400" /></div>
          <h1 className="text-3xl font-bold text-white mb-3">You Already Have This Report</h1>
          <p className="text-gray-400 mb-8">Your audit report for {data.practice_name} has already been purchased and is available for download.</p>
          {data.report_id && (
            <a href={`/api/report?reportId=${data.report_id}&download=true`} className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8933d] text-[#0a1628] font-bold py-3 px-8 rounded-xl transition-colors"><FileText className="w-5 h-5" />Download Your Report</a>
          )}
        </div>
      </div>
    );
  }

  const score = data.score ?? 0;
  const sb1188Fails = data.sb1188_findings.filter(f => f.status === 'fail').length;
  const hb149Fails = data.hb149_findings.filter(f => f.status === 'fail').length;
  const npiFails = data.npi_checks.filter(f => f.status === 'fail' || f.status === 'inconclusive').length;
  const totalIssues = sb1188Fails + hb149Fails + npiFails;
  const foreignEndpoints = data.data_border_map.filter(e => !e.sovereign);
  const recommendAudit = score >= 60;
  const recommendSafeHarbor = score < 60;

  const getUrgencyMessage = (s: number) => {
    if (s < 60) return 'Your site has critical compliance gaps under Texas SB 1188 and HB 149. Immediate action is recommended to avoid potential enforcement.';
    if (s < 80) return 'Your site has compliance gaps under Texas SB 1188 and HB 149. Here is how to fix them before enforcement begins.';
    return 'Your site is largely compliant, but we identified areas that need documentation to maintain your standing.';
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1 text-xl font-extrabold tracking-tight"><span className="text-white">Kairo</span><span className="text-[#c9a84c]">Logic</span></Link>
          <span className="text-xs text-gray-500 hidden sm:block">Texas Healthcare Compliance Platform</span>
        </div>
      </div>

      {/* Hero */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Compliance Findings</h1>
            <p className="text-lg text-[#c9a84c]">for {data.practice_name}</p>
          </div>
          <div className="bg-[#0d1a2e] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {data.score !== null && <ScoreGauge score={data.score} />}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3"><span className="text-xs text-gray-500 uppercase tracking-wider w-12 flex-shrink-0">NPI</span><span className="text-sm text-gray-300 font-mono">{data.npi}</span></div>
                {data.url && data.url !== '__NOT_FOUND__' && (<div className="flex items-center gap-3"><span className="text-xs text-gray-500 uppercase tracking-wider w-12 flex-shrink-0">Site</span><span className="text-sm text-gray-300">{cleanUrl(data.url)}</span></div>)}
                <div className="flex items-center gap-3"><span className="text-xs text-gray-500 uppercase tracking-wider w-12 flex-shrink-0">Issues</span><span className="text-sm text-red-400 font-medium">{totalIssues} compliance issue{totalIssues !== 1 ? 's' : ''} found</span></div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center"><p className="text-gray-300 text-base max-w-xl mx-auto leading-relaxed">{getUrgencyMessage(score)}</p></div>
        </div>
      </section>

      {/* Grouped Findings */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <FindingsGroup title="SB 1188 \u2014 Data Sovereignty" icon={Globe} iconColor="text-blue-400" findings={data.sb1188_findings} failCount={sb1188Fails} />
          <FindingsGroup title="HB 149 \u2014 AI Transparency" icon={Bot} iconColor="text-purple-400" findings={data.hb149_findings} failCount={hb149Fails} />
          <FindingsGroup title="NPI Integrity" icon={Database} iconColor="text-cyan-400" findings={data.npi_checks} failCount={npiFails} />
          {foreignEndpoints.length > 0 && (
            <div className="bg-[#0d1a2e] border border-red-400/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 text-sm mb-3"><AlertTriangle className="w-4 h-4" /><span className="font-bold">{foreignEndpoints.length} Foreign Endpoint{foreignEndpoints.length !== 1 ? 's' : ''} Detected</span></div>
              <div className="flex flex-wrap gap-2">
                {foreignEndpoints.map((ep, i) => (<span key={i} className="text-xs bg-red-400/10 text-red-300 px-2.5 py-1 rounded-md font-mono">{ep.domain || 'unknown'} <span className="text-red-400/60">({ep.country || 'Foreign'})</span></span>))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Product Cards */}
      <section className="py-12 bg-[#081320]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white text-center mb-3">Choose Your Compliance Solution</h2>
          <p className="text-gray-400 text-center text-sm mb-10">Both options include 3 months of Sentry Shield continuous monitoring, free.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <ProductCard title="Sovereignty Audit Report" price="$149" priceNote="One-time + 3 months Sentry Shield FREE" features={['Full forensic compliance analysis', 'Evidence documentation package', 'Legal compliance mapping (SB 1188 + HB 149)', 'Remediation roadmap with priorities', '3 months Sentry Shield monitoring included']} stripeLink={STRIPE_LINK_AUDIT} npi={data.npi} recommended={recommendAudit} />
            <ProductCard title="Safe Harbor\u2122 Bundle" price="$249" priceNote="One-time + 3 months Sentry Shield FREE" features={['Everything in the Audit Report, plus:', 'Ready-to-use policy templates', 'AI disclosure kit (HB 149 compliant)', 'Compliance evidence ledger', 'Remediation implementation guides', '3 months Sentry Shield monitoring included']} stripeLink={STRIPE_LINK_SAFE_HARBOR} npi={data.npi} recommended={recommendSafeHarbor} />
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div><div className="text-2xl font-bold text-white">39,760</div><div className="text-xs text-gray-500 mt-1">TX Providers Monitored</div></div>
            <div><div className="text-2xl font-bold text-white">SB 1188</div><div className="text-xs text-gray-500 mt-1">Data Sovereignty</div></div>
            <div><div className="text-2xl font-bold text-white">HB 149</div><div className="text-xs text-gray-500 mt-1">AI Transparency</div></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-xs">Questions? Contact <a href="mailto:ravi@kairologic.net" className="text-[#c9a84c] hover:text-[#d4b44e] transition-colors">ravi@kairologic.net</a></p>
          <p className="text-gray-600 text-xs mt-2">&copy; {new Date().getFullYear()} KairoLogic. All rights reserved.</p>
        </div>
      </section>
    </div>
  );
}
