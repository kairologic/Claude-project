'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Shield, CheckCircle, AlertTriangle, Clock, FileText, ArrowRight } from 'lucide-react';

const RiskScanWidget = dynamic(() => import('@/components/RiskScanWidget'), {
  ssr: false,
  loading: () => <div className="text-center py-12">Loading scanner...</div>
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const STRIPE_PK = 'pk_live_51SqnMvGg3oiiGF7gMSDPwdLYbU7pLsS5cqc8QGZuZQIIAqWz2xD5NwFBVFLrOiQGyHBV4UeNqwq9f5WgyuGXARsw001mJX03so';

interface VerifiedProviderData {
  npi: string;
  name: string;
  risk_score: number;
  last_scan_timestamp: string;
  top_issues?: Array<{ id: string; name: string; }>;
}

/** Stripe Buy Button component - renders inline Stripe checkout */
function StripeBuyButton({ buyButtonId }: { buyButtonId: string }) {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<stripe-buy-button buy-button-id="${buyButtonId}" publishable-key="${STRIPE_PK}"></stripe-buy-button>`
      }}
    />
  );
}

/** Score-based CTA block */
function DynamicCTA({ score, npi }: { score: number; npi: string }) {
  const isLowScore = score < 67;

  // Fire email notification after results are displayed
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: 'immediate-summary',
          npi: npi,
          score: score
        })
      }).catch(() => { /* non-critical */ });
    }, 3000);
    return () => clearTimeout(timer);
  }, [npi, score]);

  if (isLowScore) {
    // LOW SCORE VIEW (< 67): Clean layout with orange accent
    return (
      <section className="py-16 bg-gray-50 border-t-4 border-orange">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-orange/10 px-4 py-2 rounded-full mb-4">
              <AlertTriangle className="w-5 h-5 text-orange" />
              <span className="text-orange font-bold text-sm uppercase tracking-wider">Immediate Action Required</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-3">
              Compliance Gaps Detected
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your practice scored <strong className="text-orange">{score}/100</strong>. Statutory penalties for knowing violations can reach $250,000.
              Get your full remediation roadmap before your next audit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Primary: Download Forensic Report */}
            <div className="bg-white rounded-2xl p-8 text-left shadow-lg border border-gray-200 hover:border-orange/40 transition-colors">
              <div className="text-3xl mb-3">&#x1F4C4;</div>
              <h3 className="text-xl font-display font-bold text-navy mb-2">
                Sovereignty Audit &amp; Forensic Report
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Complete forensic evidence, technical fixes, and prioritized remediation roadmap for your IT team.
              </p>
              <StripeBuyButton buyButtonId="buy_btn_1Sw4cBGg3oiiGF7gzfOByHpl" />
            </div>

            {/* Secondary: Request Briefing */}
            <div className="bg-navy rounded-2xl p-8 text-left shadow-lg">
              <div className="text-3xl mb-3">&#x1F4C5;</div>
              <h3 className="text-xl font-display font-bold text-white mb-2">
                Request Briefing
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                15-minute session with our engineering desk to walk through your OCONUS drift points and migration requirements.
              </p>
              <div className="bg-white/10 rounded-lg px-3 py-2 mb-6">
                <span className="text-gold text-xs font-bold uppercase tracking-wider">
                  Statutory Risk Briefing (Value: $250 &mdash; Waived for NPI holders)
                </span>
              </div>
              <a
                href="https://schedule.fillout.com/t/927Gv1zpdpus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-navy font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors w-full justify-center"
              >
                Schedule Briefing
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // HIGH SCORE VIEW (>= 75): Deep Navy header
  return (
    <section className="py-16 bg-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-green-400/20 px-4 py-2 rounded-full mb-6">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Strong Posture Detected</span>
        </div>
        <h2 className="text-4xl font-display font-bold text-white mb-4">
          Sovereignty Standard Met
        </h2>
        <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
          Your practice scored <strong className="text-green-400">{score}/100</strong>. Close remaining gaps with targeted remediation to achieve full Sovereign status.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Primary: Quick-Fix Blueprint */}
          <div className="bg-white rounded-2xl p-8 text-left shadow-xl">
            <div className="text-3xl mb-3">&#x26A1;</div>
            <h3 className="text-xl font-display font-bold text-navy mb-2">
              Quick-Fix Blueprint&trade;
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Targeted remediation scripts, Safe Harbor checklist, and disclosure templates to close your remaining gaps.
            </p>
            <StripeBuyButton buyButtonId="buy_btn_1Sw5EKGg3oiiGF7gohk7tAL2" />
          </div>

          {/* Secondary: Activate SentryGuard */}
          <div className="bg-white/5 border-2 border-white/20 rounded-2xl p-8 text-left">
            <div className="text-3xl mb-3">&#x1F6E1;</div>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Activate SentryGuard&trade;
            </h3>
            <p className="text-gray-300 text-sm mb-6">
              Lock in your compliance with continuous monitoring, automated pulse scans, and the KairoLogic Trust Seal.
            </p>
            <StripeBuyButton buyButtonId="buy_btn_1Sw4QQGg3oiiGF7gZFOHeTTM" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScanResultsContent() {
  const searchParams = useSearchParams();
  const npi = searchParams.get('npi');
  const mode = searchParams.get('mode');

  const [scanData, setScanData] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const [verifiedData, setVerifiedData] = useState<VerifiedProviderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (mode === 'verified' && npi) {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&select=npi,name,risk_score,last_scan_timestamp,topIssues`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }
            }
          );
          const data = await response.json();
          if (data && data.length > 0) {
            setVerifiedData(data[0]);
          }
        } catch (error) {
          console.error('Failed to fetch verified data:', error);
        }
      } else {
        const stored = sessionStorage.getItem('scanData');
        if (stored) {
          setScanData(JSON.parse(stored));
        }
      }
      setLoading(false);
    };
    loadData();
  }, [npi, mode]);

  const handleScanComplete = (results: any) => {
    setScanResults(results);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-navy border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  // VERIFIED MODE
  if (mode === 'verified' && verifiedData) {
    return (
      <div>
        <section className="bg-gradient-to-br from-green-700 to-green-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">COMPLIANCE VERIFIED</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {verifiedData.name || 'Healthcare Provider'}
            </h1>
            <p className="text-xl text-green-100">
              NPI: {verifiedData.npi} &bull; Texas SB 1188 &amp; HB 149 Compliant
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 text-center border-b border-green-100">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-4">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <div className="text-6xl font-display font-bold text-green-600 mb-2">
                  {verifiedData.risk_score || 85}%
                </div>
                <div className="text-lg font-semibold text-green-700">Compliance Score</div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-green-600">
                  <Clock className="w-4 h-4" />
                  <span>Last verified: {verifiedData.last_scan_timestamp
                    ? new Date(verifiedData.last_scan_timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Recently'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Verified Compliance Areas</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['Data Sovereignty', 'AI Transparency', 'EHR Integrity', 'US Data Residency'].map((area) => (
                    <div key={area} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div className="text-sm font-semibold text-gray-800">{area}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-navy text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-display font-bold mb-4">Want This Badge on Your Website?</h2>
            <p className="text-lg text-gray-300 mb-8">
              Join hundreds of Texas healthcare providers displaying their compliance status with the KairoLogic Sentry Widget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/scan">
                <button className="bg-orange text-white font-semibold px-8 py-3 rounded-lg hover:bg-orange-dark transition-colors">
                  Run Free Compliance Scan
                </button>
              </Link>
              <Link href="/services">
                <button className="bg-white/10 text-white font-semibold px-8 py-3 rounded-lg border border-white/30 hover:bg-white/20 transition-colors">
                  View Services
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // NO SCAN DATA
  if (!scanData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No scan data found</p>
          <Link href="/scan">
            <button className="bg-navy text-white font-bold px-6 py-3 rounded-lg">Start New Scan</button>
          </Link>
        </div>
      </div>
    );
  }

  // NORMAL MODE - Full scan flow
  return (
    <div>
      <section className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-display font-bold mb-2">Compliance Scan Results</h1>
          <p className="text-xl text-gray-300">{scanData.name} (NPI: {scanData.npi})</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RiskScanWidget
            initialNPI={scanData.npi}
            initialURL={scanData.url}
            onScanComplete={handleScanComplete}
          />
        </div>
      </section>

      {/* Dynamic CTA based on score */}
      {scanResults && (
        <DynamicCTA score={scanResults.riskScore || 0} npi={scanData.npi} />
      )}
    </div>
  );
}

export default function ScanResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScanResultsContent />
    </Suspense>
  );
}

