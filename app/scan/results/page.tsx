'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the Risk Scan Widget (client-side only)
const RiskScanWidget = dynamic(() => import('@/components/RiskScanWidget'), {
  ssr: false,
  loading: () => <div className="text-center py-12">Loading scanner...</div>
});

function ScanResultsContent() {
  const searchParams = useSearchParams();
  const npi = searchParams.get('npi');
  const [scanData, setScanData] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('scanData');
    if (stored) {
      setScanData(JSON.parse(stored));
    }
  }, []);

  const handleScanComplete = (results: any) => {
    setScanResults(results);
    // Send email with results would happen here
  };

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
