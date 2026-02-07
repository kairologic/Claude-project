'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';

const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

interface ProviderData {
  name: string;
  npi: string;
  url: string;
  risk_score: number;
  compliance_status: string;
  widget_status: string;
}

function WidgetTestInner() {
  const searchParams = useSearchParams();
  const npi = searchParams.get('npi') || '';
  const mode = (searchParams.get('mode') || 'watch') as 'watch' | 'shield';
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!npi) { setLoading(false); return; }
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&limit=1`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.length > 0) setProvider(data[0]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProvider();
  }, [npi]);

  const score = provider?.risk_score || 85;
  const status = provider?.compliance_status || (score >= 80 ? 'Sovereign' : score >= 50 ? 'Drift' : 'Violation');
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const practiceName = provider?.name || 'Sample Healthcare Practice';

  const viewportWidth = viewport === 'desktop' ? 'max-w-4xl' : viewport === 'tablet' ? 'max-w-lg' : 'max-w-sm';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/payment/success?npi=${npi}&product=${mode === 'shield' ? 'safe-harbor-shield' : 'safe-harbor-watch'}`}
            className="text-slate-500 hover:text-navy transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-navy">Widget Preview</h1>
            <p className="text-[10px] text-slate-400">Sentry {mode === 'shield' ? 'Shield' : 'Watch'} • NPI: {npi || 'Demo'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { key: 'desktop' as const, icon: Monitor, label: 'Desktop' },
            { key: 'tablet' as const, icon: Tablet, label: 'Tablet' },
            { key: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
          ].map((v) => (
            <button key={v.key} onClick={() => setViewport(v.key)}
              className={`p-1.5 rounded-md transition-colors ${viewport === v.key ? 'bg-white shadow-sm text-navy' : 'text-slate-400 hover:text-slate-600'}`}
              title={v.label}>
              <v.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Simulated website */}
      <div className={`mx-auto ${viewportWidth} transition-all duration-300 py-8 px-4`}>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Fake browser chrome */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono ml-2">
              {provider?.url || 'https://yourpractice.com'}
            </div>
          </div>

          {/* Simulated page content */}
          <div className="p-6 sm:p-10">
            {/* Fake header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{practiceName}</h2>
                <p className="text-sm text-slate-400">Your Trusted Healthcare Provider</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-100 rounded px-3 py-1.5 text-xs text-slate-500">Home</div>
                <div className="bg-slate-100 rounded px-3 py-1.5 text-xs text-slate-500">Services</div>
                <div className="bg-slate-100 rounded px-3 py-1.5 text-xs text-slate-500">Contact</div>
              </div>
            </div>

            {/* Fake content blocks */}
            <div className="space-y-4 mb-10">
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-4/6" />
              <div className="h-32 bg-slate-50 rounded-lg border border-slate-100" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>

            {/* ═══ THE WIDGET ═══ */}
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/30 relative">
              <div className="absolute -top-3 left-4 bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Your Widget Appears Here
              </div>

              <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 mt-2">
                <div className="flex items-center gap-3">
                  {/* Score badge */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `3px solid ${scoreColor}` }}>
                    <span className="text-xl font-black" style={{ color: scoreColor }}>{score}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <svg className="w-4 h-4 text-navy flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
                      </svg>
                      <span className="text-sm font-bold text-navy truncate">
                        KAIRO<span className="text-orange-500">LOGIC</span> Verified
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {status} Compliant • SB 1188 & HB 149
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Last verified: {new Date().toLocaleDateString()} •{' '}
                      {mode === 'shield' ? 'Sentry Shield' : 'Sentry Watch'}
                    </div>
                  </div>

                  {/* Status dot */}
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: scoreColor }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Fake footer */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-300">
                <span>&copy; 2026 {practiceName}</span>
                <span>Privacy Policy • Terms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-navy text-white py-3 px-4 text-center text-xs">
        This is a preview. The actual widget will be rendered by the script tag on your live website.
        <Link href={`/payment/success?npi=${npi}&product=${mode}`} className="text-gold hover:underline ml-2">
          ← Back to your deliverables
        </Link>
      </div>
    </div>
  );
}

export default function WidgetTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WidgetTestInner />
    </Suspense>
  );
}
