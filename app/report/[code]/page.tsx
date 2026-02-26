'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, CheckCircle, Shield, FileText, ArrowRight, XCircle } from 'lucide-react';

const STRIPE_PK = 'pk_live_51SqnMvGg3oiiGF7gMSDPwdLYbU7pLsS5cqc8QGZuZQIIAqWz2xD5NwFBVFLrOiQGyHBV4UeNqwq9f5WgyuGXARsw001mJX03so';

// Stripe Buy Button IDs
const BUY_BTN_AUDIT = 'buy_btn_1Sw4cBGg3oiiGF7gzfOByHpl';
const BUY_BTN_SAFE_HARBOR = 'buy_btn_1Sw5EKGg3oiiGF7gohk7tAL2';
const BUY_BTN_SHIELD = 'buy_btn_1T1pNnGg3oiiGF7gOiPuXc0N';

interface ProviderData {
  npi: string;
  practice_name: string;
  url: string;
  score: number | null;
  compliance_status: string;
  findings: Array<{
    id?: string;
    name?: string;
    status?: string;
    detail?: string;
  }>;
  category_scores: Record<string, { percentage?: number }> | null;
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

function StripeBuyButton({ buyButtonId, clientReferenceId }: { buyButtonId: string; clientReferenceId?: string }) {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const attrs = clientReferenceId
    ? `buy-button-id="${buyButtonId}" publishable-key="${STRIPE_PK}" client-reference-id="${clientReferenceId}"`
    : `buy-button-id="${buyButtonId}" publishable-key="${STRIPE_PK}"`;

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<stripe-buy-button ${attrs}></stripe-buy-button>`
      }}
    />
  );
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 67) return { text: 'text-green-400', bg: 'bg-green-400', border: 'border-green-400' };
    if (s >= 34) return { text: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400' };
    return { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-400' };
  };

  const colors = getColor(score);
  const label = score >= 67 ? 'SOVEREIGN' : score >= 34 ? 'DRIFT' : 'VIOLATION';

  return (
    <div className="flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full border-4 ${colors.border} flex items-center justify-center`}>
        <span className={`text-3xl font-display font-bold ${colors.text}`}>{score}</span>
      </div>
      <span className={`text-xs font-bold uppercase tracking-wider mt-2 ${colors.text}`}>{label}</span>
    </div>
  );
}

function FindingItem({ finding }: { finding: ProviderData['findings'][0] }) {
  const isFail = finding.status === 'fail';
  const isWarn = finding.status === 'warn';
  const isPass = finding.status === 'pass';

  const Icon = isFail ? XCircle : isWarn ? AlertTriangle : CheckCircle;
  const color = isFail ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <span className="text-sm text-white font-medium">{finding.name || finding.id}</span>
        {finding.detail && !isPass && (
          <p className="text-xs text-gray-400 mt-0.5">{finding.detail}</p>
        )}
      </div>
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
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [code]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-light rounded-full mb-6">
            <Shield className="w-8 h-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-3">Report Not Found</h1>
          <p className="text-gray-400 mb-6">
            This report link may be invalid or expired. If you believe this is an error,
            please contact us for assistance.
          </p>
          <a href="mailto:ravi@kairologic.net" className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors font-medium">
            Contact ravi@kairologic.net <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Already purchased state
  if (data.is_paid) {
    return (
      <div className="min-h-screen bg-navy">
        {/* Header */}
        <div className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link href="/">
              <Image src="/logo.svg" alt="KairoLogic" width={150} height={34} className="h-8 w-auto" />
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">You Already Have This Report</h1>
          <p className="text-gray-400 mb-8">
            Your audit report for {data.practice_name} has already been purchased and is available for download.
          </p>
          {data.report_id && (
            <a
              href={`/api/report?reportId=${data.report_id}&download=true`}
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold py-3 px-8 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              Download Your Report
            </a>
          )}
        </div>
      </div>
    );
  }

  const failedFindings = data.findings.filter(f => f.status === 'fail');
  const warnFindings = data.findings.filter(f => f.status === 'warn');
  const foreignEndpoints = data.data_border_map.filter(e => !e.sovereign);

  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <Image src="/logo.svg" alt="KairoLogic" width={150} height={34} className="h-8 w-auto" />
          </Link>
        </div>
      </div>

      {/* Hero — Findings Summary */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              SB 1188 Compliance Findings
            </h1>
            <p className="text-lg text-gold">
              for {data.practice_name}
            </p>
          </div>

          {/* Findings Card */}
          <div className="bg-navy-light border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
              {/* Score */}
              {data.score !== null && (
                <ScoreGauge score={data.score} />
              )}

              {/* Provider Info */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider w-10">NPI</span>
                  <span className="text-sm text-gray-300 font-mono">{data.npi}</span>
                </div>
                {data.url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider w-10">Site</span>
                    <span className="text-sm text-gray-300 truncate">{data.url}</span>
                  </div>
                )}
                {data.score !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider w-10">Score</span>
                    <span className="text-sm text-gray-300">{data.score}/100</span>
                  </div>
                )}
              </div>
            </div>

            {/* Findings List */}
            {(failedFindings.length > 0 || warnFindings.length > 0) && (
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Findings</h3>
                <div className="space-y-1 divide-y divide-white/5">
                  {failedFindings.map((f, i) => (
                    <FindingItem key={`fail-${i}`} finding={f} />
                  ))}
                  {warnFindings.map((f, i) => (
                    <FindingItem key={`warn-${i}`} finding={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Foreign Endpoints Summary */}
            {foreignEndpoints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">
                    {foreignEndpoints.length} foreign endpoint{foreignEndpoints.length !== 1 ? 's' : ''} detected
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {foreignEndpoints.slice(0, 6).map((ep, i) => (
                    <span key={i} className="text-xs bg-red-400/10 text-red-300 px-2 py-1 rounded">
                      {ep.domain || 'unknown'} ({ep.country || ep.city || 'Foreign'})
                    </span>
                  ))}
                  {foreignEndpoints.length > 6 && (
                    <span className="text-xs text-gray-500">+{foreignEndpoints.length - 6} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Urgency Message */}
          <div className="mt-8 text-center">
            <p className="text-gray-300 text-lg max-w-xl mx-auto">
              Your site has compliance gaps under Texas SB 1188. Here&apos;s how to fix them.
            </p>
          </div>
        </div>
      </section>

      {/* Product Cards */}
      <section className="py-12 bg-navy-dark">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-white text-center mb-10">
            Choose Your Compliance Solution
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Audit Report — $149 */}
            <div className="bg-navy-light border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-white">Audit Report</h3>
                <span className="text-gold font-bold">$149</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Full forensic analysis
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Evidence documentation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Legal compliance mapping
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Remediation roadmap
                </li>
              </ul>
              <StripeBuyButton buyButtonId={BUY_BTN_AUDIT} clientReferenceId={data.npi} />
            </div>

            {/* Safe Harbor — $249 (Recommended) */}
            <div className="bg-navy-light border-2 border-gold rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              </div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-lg font-display font-bold text-white">Safe Harbor&trade;</h3>
                <span className="text-gold font-bold">$249</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Everything in Audit, plus:
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Policy templates
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  AI disclosure kit
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Evidence ledger
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  + 3 months Shield FREE
                </li>
              </ul>
              <StripeBuyButton buyButtonId={BUY_BTN_SAFE_HARBOR} clientReferenceId={data.npi} />
            </div>

            {/* Sentry Shield — $79/mo */}
            <div className="bg-navy-light border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-white">Sentry Shield</h3>
                <span className="text-gold font-bold">$79/mo</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Continuous monitoring
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Drift alerts
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Compliance widget
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Free Audit Report included
                </li>
              </ul>
              <StripeBuyButton buyButtonId={BUY_BTN_SHIELD} clientReferenceId={data.npi} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-xs">
            Questions? Contact <a href="mailto:ravi@kairologic.net" className="text-gold hover:text-gold-light transition-colors">ravi@kairologic.net</a>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            &copy; {new Date().getFullYear()} KairoLogic. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
