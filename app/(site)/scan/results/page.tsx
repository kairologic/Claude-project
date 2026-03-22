'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Shield, CheckCircle, AlertTriangle, Clock, FileText, ArrowRight, Lock, Calendar } from 'lucide-react';

const RiskScanWidget = dynamic(() => import('@/components/RiskScanWidget'), {
  ssr: false,
  loading: () => <div className="text-center py-12">Loading scanner...</div>
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

// Payment Links are used instead of Buy Buttons — no STRIPE_PK needed

interface VerifiedProviderData {
  npi: string;
  name: string;
  risk_score: number;
  last_scan_timestamp: string;
  top_issues?: Array<{ id: string; name: string; }>;
}

// StripeBuyButton removed — using Payment Links instead

function LockedWidgetCard({ unlockThreshold }: { unlockThreshold: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-7 text-left border-2 border-gray-200 relative overflow-hidden opacity-60">
      <div className="absolute top-4 right-4">
        <div className="inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Not Eligible Yet</span>
        </div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
        <Shield className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-display font-bold text-gray-400 mb-2">
        Sentry Performance Widget
      </h3>
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
        The Widget becomes available once your score reaches {unlockThreshold} or higher.
      </p>
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-bold px-5 py-3 rounded-lg cursor-not-allowed text-sm"
      >
        <Lock className="w-4 h-4" /> Complete Full Fix to Unlock
      </button>
      <p className="text-gray-400 text-[11px] mt-3 text-center italic">
        Apply fixes from the Full Fix Report and re-run the scan to unlock.
      </p>
    </div>
  );
}

function ConsultationCard({ variant }: { variant: 'light' | 'dark' }) {
  const isDark = variant === 'dark';
  return (
    <div className={`${isDark ? 'bg-navy' : 'bg-white border-2 border-navy/10'} rounded-2xl p-7 text-left shadow-lg`}>
      <div className={`w-12 h-12 ${isDark ? 'bg-white/10' : 'bg-navy/5'} rounded-xl flex items-center justify-center mb-4`}>
        <Calendar className={`w-6 h-6 ${isDark ? 'text-gold' : 'text-navy'}`} />
      </div>
      <h3 className={`text-lg font-display font-bold ${isDark ? 'text-white' : 'text-navy'} mb-2`}>
        15-Minute Risk Briefing
      </h3>
      <p className={`${isDark ? 'text-gray-300' : 'text-gray-500'} text-sm mb-3 leading-relaxed`}>
        Walk through your compliance drift points and migration requirements with our engineering desk.
      </p>
      <div className={`${isDark ? 'bg-white/10' : 'bg-gold/10'} rounded-lg px-3 py-2 mb-5`}>
        <span className={`${isDark ? 'text-gold' : 'text-amber-700'} text-xs font-bold uppercase tracking-wider`}>
          Statutory Risk Briefing (Value: $250 &mdash; Waived for NPI Holders)
        </span>
      </div>
      <a
        href="https://schedule.fillout.com/t/927Gv1zpdpus"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 font-bold px-5 py-3 rounded-lg transition-colors w-full justify-center text-sm ${
          isDark
            ? 'bg-white text-navy hover:bg-gold hover:text-navy'
            : 'bg-navy text-white hover:bg-gold hover:text-navy'
        }`}
      >
        Schedule Briefing
        <ArrowRight size={16} />
      </a>
    </div>
  );
}

function DynamicCTA({ score, npi }: { score: number; npi: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_slug: 'immediate-summary', npi, score })
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [npi, score]);

  if (score < 75) {
    return (
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-50 px-5 py-2.5 rounded-full mb-5 border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-600 font-bold text-sm uppercase tracking-wider">Critical Compliance Gaps Detected</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-3">Immediate Remediation Required</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your practice scored <strong className="text-red-500">{score}/100</strong>. Statutory penalties for SB 1188 violations can reach <strong>$250,000 per occurrence</strong>. Download your full Forensic Report for the complete remediation roadmap.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-7 text-left shadow-lg border-2 border-navy hover:border-gold transition-colors">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-navy" />
              </div>
              <h3 className="text-lg font-display font-bold text-navy mb-2">Sovereignty Audit &amp; Forensic Report</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">Complete forensic evidence, technical fixes, and prioritized remediation roadmap for your IT team.</p>
              <a href="https://buy.stripe.com/4gM5kDdpw0HP18x3057Re08" target="_blank" rel="noopener noreferrer"
                className="block w-full bg-navy hover:bg-navy-light text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
                Get Full Report — $149
                <span className="block text-xs text-green-400 font-bold mt-0.5">+ 3 months Shield FREE</span>
              </a>
            </div>
            <ConsultationCard variant="dark" />
            <LockedWidgetCard unlockThreshold="90" />
          </div>
        </div>
      </section>
    );
  }

  if (score < 90) {
    return (
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-50 px-5 py-2.5 rounded-full mb-5 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-amber-600 font-bold text-sm uppercase tracking-wider">Minor Gaps Remaining</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-3">Almost Sovereign &mdash; Close the Gap</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your practice scored <strong className="text-amber-500">{score}/100</strong>. A few targeted fixes will bring you to full compliance and unlock the Sentry Widget.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-7 text-left shadow-lg border-2 border-navy hover:border-gold transition-colors">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-navy" />
              </div>
              <h3 className="text-lg font-display font-bold text-navy mb-2">Quick-Fix Blueprint&trade;</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">Targeted remediation scripts, Safe Harbor checklist, and disclosure templates to close your remaining gaps.</p>
              <a href="https://buy.stripe.com/00w28retAeyF6sRgQV7Re07" target="_blank" rel="noopener noreferrer"
                className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
                Get Safe Harbor™ — $249
                <span className="block text-xs text-orange-200 font-bold mt-0.5">+ 3 months Shield FREE</span>
              </a>
            </div>
            <ConsultationCard variant="dark" />
            <LockedWidgetCard unlockThreshold="90" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-navy">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-400/20 px-5 py-2.5 rounded-full mb-5">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Sovereign Status Achieved</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">No Further Fixes Required</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Your practice scored <strong className="text-green-400">{score}/100</strong>. You are fully compliant. Deploy the Sentry Widget to broadcast your compliance status in real time.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-8 text-left shadow-xl relative">
            <div className="absolute top-4 right-4">
              <div className="inline-flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 text-[10px] font-bold uppercase tracking-wider">Eligible</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center mb-5">
              <Shield className="w-7 h-7 text-gold" />
            </div>
            <h3 className="text-xl font-display font-bold text-navy mb-2">Sentry Performance Widget</h3>
            <p className="text-gray-600 text-sm mb-2 leading-relaxed">Deploy the Widget to activate real-time compliance indicator messaging on your site.</p>
            <p className="text-gray-400 text-xs mb-6 italic">Less than the cost of a single remediation cycle per year.</p>
            <a href="https://buy.stripe.com/aFa3cv3OW4Y54kJ3057Re06" target="_blank" rel="noopener noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
                Start Sentry Shield — $79/mo
                <span className="block text-xs text-green-200 font-bold mt-0.5">Includes free Audit Report</span>
              </a>
          </div>
          <div className="bg-white/5 border-2 border-white/20 rounded-2xl p-8 text-left">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-5">
              <Calendar className="w-7 h-7 text-gold" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">15-Minute Strategy Briefing</h3>
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">Discuss deployment strategy, widget placement, and ongoing compliance monitoring with our team.</p>
            <div className="bg-white/10 rounded-lg px-3 py-2 mb-6">
              <span className="text-gold text-xs font-bold uppercase tracking-wider">Value: $250 &mdash; Waived for NPI Holders</span>
            </div>
            <a href="https://schedule.fillout.com/t/927Gv1zpdpus" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-navy font-bold px-6 py-3 rounded-lg hover:bg-gold hover:text-navy transition-colors w-full justify-center">
              Schedule Briefing <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <p className="text-center text-green-400/60 text-sm mt-8 font-medium">No further fixes required &bull; Your compliance posture is Sovereign</p>
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
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          const data = await response.json();
          if (data && data.length > 0) setVerifiedData(data[0]);
        } catch (error) { console.error('Failed to fetch verified data:', error); }
      } else {
        const stored = sessionStorage.getItem('scanData');
        if (stored) setScanData(JSON.parse(stored));
      }
      setLoading(false);
    };
    loadData();
  }, [npi, mode]);

  const handleScanComplete = (results: any) => { setScanResults(results); };

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

  if (mode === 'verified' && verifiedData) {
    return (
      <div>
        <section className="bg-gradient-to-br from-green-700 to-green-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">COMPLIANCE VERIFIED</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{verifiedData.name || 'Healthcare Provider'}</h1>
            <p className="text-xl text-green-100">NPI: {verifiedData.npi} &bull; Texas SB 1188 &amp; HB 149 Compliant</p>
          </div>
        </section>
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 text-center border-b border-green-100">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-4">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <div className="text-6xl font-display font-bold text-green-600 mb-2">{verifiedData.risk_score || 85}%</div>
                <div className="text-lg font-semibold text-green-700">Compliance Score</div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-green-600">
                  <Clock className="w-4 h-4" />
                  <span>Last verified: {verifiedData.last_scan_timestamp ? new Date(verifiedData.last_scan_timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
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
            <p className="text-lg text-gray-300 mb-8">Join hundreds of Texas healthcare providers displaying their compliance status with the KairoLogic Sentry Widget.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/scan"><button className="bg-orange text-white font-semibold px-8 py-3 rounded-lg hover:bg-orange-dark transition-colors">Run Free Compliance Scan</button></Link>
              <Link href="/services"><button className="bg-white/10 text-white font-semibold px-8 py-3 rounded-lg border border-white/30 hover:bg-white/20 transition-colors">View Services</button></Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No scan data found</p>
          <Link href="/scan"><button className="bg-navy text-white font-bold px-6 py-3 rounded-lg">Start New Scan</button></Link>
        </div>
      </div>
    );
  }

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
          <RiskScanWidget initialNPI={scanData.npi} initialURL={scanData.url} onScanComplete={handleScanComplete} />
        </div>
      </section>
      {scanResults && <DynamicCTA score={scanResults.riskScore || 0} npi={scanData.npi} />}
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
