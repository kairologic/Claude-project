'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ═══ Task 2.1: Read-only preview dashboard at /preview/[token] ═══
// No login required. Shows practice data from the mismatch_summary snapshot.
// Claim banner at top converts to full dashboard access.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

interface MismatchSummary {
  practice_name: string; practice_url: string; practice_state: string;
  total_providers: number; total_mismatches: number;
  providers_with_mismatches: Array<{
    npi: string; name: string;
    address_mismatch: boolean; phone_mismatch: boolean; taxonomy_mismatch: boolean;
    mismatch_count: number;
  }>;
  snapshot_at: string;
}

interface TokenData {
  id: string; token: string; practice_website_id: string;
  expires_at: string; is_claimed: boolean; view_count: number;
  mismatch_summary: MismatchSummary;
}

export default function PreviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<TokenData | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'claimed' | 'not_found'>('loading');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SB_URL}/rest/v1/preview_tokens?token=eq.${encodeURIComponent(token)}&select=*`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        });
        const rows = await res.json();
        if (!rows?.length) { setStatus('not_found'); return; }

        const t = rows[0];
        if (t.is_claimed) { setStatus('claimed'); setData(t); return; }
        if (new Date(t.expires_at) < new Date()) { setStatus('expired'); setData(t); return; }

        setData(t);
        setStatus('valid');

        // Record view
        await fetch(`${SB_URL}/rest/v1/preview_tokens?id=eq.${t.id}`, {
          method: 'PATCH',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ view_count: (t.view_count || 0) + 1, last_viewed_at: new Date().toISOString(), ...(!t.first_viewed_at ? { first_viewed_at: new Date().toISOString() } : {}) }),
        });
      } catch { setStatus('not_found'); }
    }
    load();
  }, [token]);

  const daysLeft = data ? Math.max(0, Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 86400000)) : 0;
  const summary = data?.mismatch_summary;

  const handleClaim = async () => {
    if (!claimEmail || !claimPassword) return;
    setClaiming(true); setClaimError('');

    try {
      const res = await fetch('/api/preview/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: claimEmail, password: claimPassword }),
      });
      const result = await res.json();
      if (res.ok) { setClaimSuccess(true); }
      else { setClaimError(result.error || 'Claim failed'); }
    } catch { setClaimError('Network error'); }

    setClaiming(false);
  };

  // ── Status screens ─────────────────────────────────────

  if (status === 'loading') return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  );

  if (status === 'not_found') return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 max-w-md text-center">
        <p className="text-white font-bold text-lg mb-2">Preview not found</p>
        <p className="text-slate-400 text-sm mb-4">This preview link is invalid or has been removed.</p>
        <Link href="/scan" className="text-gold text-sm font-semibold hover:underline">Run a free scan instead</Link>
      </div>
    </div>
  );

  if (status === 'expired') return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-white/[0.03] border border-amber-500/20 rounded-2xl p-8 max-w-md text-center">
        <p className="text-amber-400 font-bold text-lg mb-2">Preview expired</p>
        <p className="text-slate-400 text-sm mb-4">This preview link has expired. Contact us for a fresh scan of your practice.</p>
        <a href="mailto:support@kairologic.net" className="text-gold text-sm font-semibold hover:underline">support@kairologic.net</a>
      </div>
    </div>
  );

  if (claimSuccess) return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-white font-bold text-lg mb-2">Dashboard claimed!</p>
        <p className="text-slate-400 text-sm mb-4">Your practice dashboard is now active. You'll receive weekly monitoring alerts at {claimEmail}.</p>
        <Link href={`/practice/${data?.practice_website_id}`}
          className="inline-block bg-gold text-navy font-bold px-6 py-3 rounded-lg hover:bg-gold-dark transition-colors">
          Open Your Dashboard
        </Link>
      </div>
    </div>
  );

  // ── Main preview ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy">
      {/* Claim banner */}
      <div className="bg-gradient-to-r from-gold/10 to-gold/5 border-b border-gold/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-gold text-sm font-bold">
              {status === 'claimed' ? 'This preview has been claimed' : `Preview expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p className="text-slate-400 text-xs">Claim your dashboard to keep access and start fixing mismatches.</p>
          </div>
          {!showClaim && status === 'valid' && (
            <button onClick={() => setShowClaim(true)}
              className="bg-gold text-navy font-bold px-5 py-2 rounded-lg text-sm hover:bg-gold-dark transition-colors">
              Claim Dashboard
            </button>
          )}
        </div>

        {showClaim && (
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email</label>
                <input type="email" value={claimEmail} onChange={e => setClaimEmail(e.target.value)}
                  placeholder="your@practice-email.com"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-gold/40" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Password</label>
                <input type="password" value={claimPassword} onChange={e => setClaimPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-gold/40" />
              </div>
              <button onClick={handleClaim} disabled={claiming || !claimEmail || !claimPassword}
                className="bg-gold text-navy font-bold px-6 py-2 rounded-lg text-sm hover:bg-gold-dark transition-colors disabled:opacity-50 whitespace-nowrap">
                {claiming ? 'Claiming...' : 'Claim Now'}
              </button>
            </div>
            {claimError && <p className="text-red-400 text-xs mt-2">{claimError}</p>}
          </div>
        )}
      </div>

      {/* Preview content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gold text-[10px] font-bold uppercase tracking-widest mb-1">Preview Report</p>
            <h1 className="text-white font-bold text-xl">{summary?.practice_name || 'Practice Dashboard'}</h1>
            <p className="text-slate-500 text-sm mt-1">{summary?.practice_url} {'\u00B7'} {summary?.practice_state}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Scanned {summary?.snapshot_at ? new Date(summary.snapshot_at).toLocaleDateString() : ''}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4 border bg-white/[0.02] border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Providers</p>
            <p className="text-3xl font-black mt-1 text-white">{summary?.total_providers || 0}</p>
          </div>
          <div className={`rounded-xl p-4 border ${(summary?.total_mismatches || 0) > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">NPPES Mismatches</p>
            <p className={`text-3xl font-black mt-1 ${(summary?.total_mismatches || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {summary?.total_mismatches || 0}
            </p>
            {(summary?.total_mismatches || 0) > 0 && (
              <p className="text-slate-500 text-xs">~${((summary?.total_mismatches || 0) * 118 * 3).toLocaleString()}/mo estimated claim risk</p>
            )}
          </div>
          <div className="rounded-xl p-4 border bg-white/[0.02] border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolution Cost</p>
            <p className="text-3xl font-black mt-1 text-gold">$118</p>
            <p className="text-slate-500 text-xs">avg manual NPPES correction cost</p>
          </div>
        </div>

        {/* Provider mismatch list */}
        {summary?.providers_with_mismatches && summary.providers_with_mismatches.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Providers with NPPES Mismatches</p>
            {summary.providers_with_mismatches.map((p, i) => (
              <div key={i} className="bg-white/[0.02] border border-red-500/10 rounded-xl p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{p.name || p.npi}</p>
                  <p className="text-slate-500 text-xs font-mono">{p.npi}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.address_mismatch && <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Address</span>}
                  {p.phone_mismatch && <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Phone</span>}
                  {p.taxonomy_mismatch && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Taxonomy</span>}
                </div>
                <span className="text-red-400 bg-red-500/10 text-[10px] font-bold uppercase px-2 py-1 rounded">
                  {p.mismatch_count} mismatch{p.mismatch_count > 1 ? 'es' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <p className="text-emerald-400 font-semibold">No mismatches detected</p>
            <p className="text-slate-600 text-xs mt-1">All provider records appear aligned with NPPES</p>
          </div>
        )}

        {/* CTA */}
        {status === 'valid' && !showClaim && (
          <div className="mt-8 text-center">
            <button onClick={() => setShowClaim(true)}
              className="bg-gold text-navy font-bold px-8 py-3 rounded-lg text-sm hover:bg-gold-dark transition-colors">
              Claim Your Dashboard {'\u2192'} Start Fixing Mismatches
            </button>
            <p className="text-slate-600 text-xs mt-3">Free to claim. Monitoring alerts included.</p>
          </div>
        )}
      </div>
    </div>
  );
}
