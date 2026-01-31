'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Shield, CheckCircle, AlertTriangle, Clock, FileText, Users } from 'lucide-react';

// Dynamically import the Risk Scan Widget (client-side only)
const RiskScanWidget = dynamic(() => import('@/components/RiskScanWidget'), {
  ssr: false,
  loading: () => <div className="text-center py-12">Loading scanner...</div>
});

// Supabase config for fetching verified provider data
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

interface VerifiedProviderData {
  npi: string;
  name: string;
  risk_score: number;
  last_scan_timestamp: string;
  top_issues?: Array<{ id: string; name: string; }>;
}

function ScanResultsContent() {
  const searchParams = useSearchParams();
  const npi = searchParams.get('npi');
  const mode = searchParams.get('mode'); // 'verified' = from widget, null = from scan form
  
  const [scanData, setScanData] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const [verifiedData, setVerifiedData] = useState<VerifiedProviderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // If mode=verified, fetch from database (coming from widget link)
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
        // Normal flow - from scan form
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

  // Loading state
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

  // VERIFIED MODE - Coming from widget link (public report view)
  if (mode === 'verified' && verifiedData) {
    return (
      <div>
        {/* Hero - Verified Green Theme */}
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
              NPI: {verifiedData.npi} • Texas SB 1188 & HB 149 Compliant
            </p>
          </div>
        </section>

        {/* Verified Status Card */}
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
              {/* Score Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 text-center border-b border-green-100">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-4">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <div className="text-6xl font-display font-bold text-green-600 mb-2">
                  {verifiedData.risk_score || 85}%
                </div>
                <div className="text-lg font-semibold text-green-700">
                  Compliance Score
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-green-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Last verified: {verifiedData.last_scan_timestamp 
                      ? new Date(verifiedData.last_scan_timestamp).toLocaleDateString('en-US', { 
                          month: 'long', day: 'numeric', year: 'numeric' 
                        })
                      : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Compliance Badges */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                  Verified Compliance Areas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Data Sovereignty</div>
                      <div className="text-xs text-gray-500">SB 1188 Compliant</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">AI Transparency</div>
                      <div className="text-xs text-gray-500">HB 149 Compliant</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">EHR Integrity</div>
                      <div className="text-xs text-gray-500">Records Verified</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">US Data Residency</div>
                      <div className="text-xs text-gray-500">Domestic Hosting</div>
                    </div>
                  </div>
                </div>

                {/* Top Issues (if any minor ones exist) */}
                {verifiedData.top_issues && verifiedData.top_issues.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Minor Items Noted
                    </h3>
                    <ul className="space-y-2">
                      {verifiedData.top_issues.slice(0, 3).map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{issue.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Powered by KairoLogic */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500 mb-4">
                Compliance verification powered by
              </p>
              <Link href="/" className="inline-flex items-center gap-2 text-navy font-bold hover:text-gold transition-colors">
                <Shield className="w-5 h-5" />
                KairoLogic Sentry Standard
              </Link>
            </div>
          </div>
        </section>

        {/* CTA for providers who want their own verification */}
        <section className="py-16 bg-navy text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-display font-bold mb-4">
              Want This Badge on Your Website?
            </h2>
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
                  View Service Plans
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // NORMAL MODE - No scan data found
  if (!scanData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No scan data found</p>
          <Link href="/scan">
            <button className="btn-primary">Start New Scan</button>
          </Link>
        </div>
      </div>
    );
  }

  // NORMAL MODE - Full scan flow from form submission
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-display font-bold mb-2">
            Compliance Scan Results
          </h1>
          <p className="text-xl text-gray-300">
            {scanData.name} (NPI: {scanData.npi})
          </p>
        </div>
      </section>

      {/* Scan Widget */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RiskScanWidget 
            initialNPI={scanData.npi}
            initialURL={scanData.url}
            onScanComplete={handleScanComplete}
          />
        </div>
      </section>

      {/* Results Display */}
      {scanResults && (
        <>
          {/* Risk Score Card */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-navy">
                      Compliance Score
                    </h2>
                    <p className="text-gray-600">NPI: {scanData.npi}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-6xl font-display font-bold ${
                      scanResults.riskScore >= 75 ? 'text-green-500' : 
                      scanResults.riskScore >= 50 ? 'text-orange' : 'text-red-500'
                    }`}>
                      {scanResults.riskScore}%
                    </div>
                    <div className={`text-sm font-semibold ${
                      scanResults.riskScore >= 75 ? 'text-green-600' : 
                      scanResults.riskScore >= 50 ? 'text-orange' : 'text-red-600'
                    }`}>
                      {scanResults.riskMeterLevel}
                    </div>
                  </div>
                </div>

                {/* Top Issues (Critical Only) */}
                {scanResults.topIssues && scanResults.topIssues.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-xl font-display font-bold text-navy mb-4">
                      Top Issues:
                    </h3>
                    <ul className="space-y-2">
                      {scanResults.topIssues.map((issue: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">⚠</span>
                          <span className="text-gray-700">
                            <strong>{issue.id}:</strong> {issue.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl font-display font-bold text-navy mb-6">
                Get Your Full Compliance Report
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                This scan shows only high-priority violations. Access the complete technical remediation plan with step-by-step fixes for all 12 compliance checks.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                <div className="card text-left">
                  <div className="text-3xl mb-3">📄</div>
                  <h3 className="text-xl font-display font-bold text-navy mb-2">
                    Full PDF Report
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Complete violation details, technical fixes, and remediation roadmap
                  </p>
                  <div className="text-3xl font-display font-bold text-navy mb-4">
                    $1,250
                  </div>
                  <Link href={`/checkout?product=pdf_report&npi=${scanData.npi}`}>
                    <button className="btn-primary w-full">
                      Purchase Report
                    </button>
                  </Link>
                </div>

                <div className="card text-left border-2 border-orange">
                  <div className="text-3xl mb-3">👨‍💻</div>
                  <h3 className="text-xl font-display font-bold text-navy mb-2">
                    Technical Consultation
                  </h3>
                  <p className="text-gray-600 mb-4">
                    90-minute briefing with remediation strategy and 30-day support
                  </p>
                  <div className="text-3xl font-display font-bold text-navy mb-4">
                    $3,000
                  </div>
                  <Link href={`/consultation?npi=${scanData.npi}`}>
                    <button className="btn-primary w-full">
                      Schedule Consultation
                    </button>
                  </Link>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Or <Link href="/contact" className="text-orange hover:underline">contact us</Link> for full-service implementation
              </p>
            </div>
          </section>
        </>
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
