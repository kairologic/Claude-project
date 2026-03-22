'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const RiskScanWidget = dynamic(() => import('@/components/RiskScanWidget'), {
  ssr: false,
  loading: () => <div className="text-center py-12">Loading scanner...</div>
});

function ScanContent() {
  const searchParams = useSearchParams();
  const npi = searchParams.get('npi') || '';
  const url = searchParams.get('url') || '';
  const autoStart = !!(npi && url);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[#00234E] mb-3">
            Texas Healthcare Compliance Scanner
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            SB1188 &amp; HB149 Compliance Verification
          </p>
        </div>
        <RiskScanWidget 
          initialNPI={npi} 
          initialURL={url} 
          autoStart={autoStart} 
        />
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <ScanContent />
    </Suspense>
  );
}

