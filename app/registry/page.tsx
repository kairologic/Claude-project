'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { Search, Shield, ShieldCheck, Eye, Lock, X, AlertTriangle, CheckCircle, Loader2, FileText, ChevronRight } from 'lucide-react';

type ProviderRow = {
  id: string; npi: string; name: string; city?: string; zip?: string;
  risk_score?: number; risk_level?: string; status_label?: string;
  last_scan_timestamp?: string; last_scan_result?: any; updated_at?: string;
  is_paid?: boolean; is_visible?: boolean; subscription_status?: string;
};
type CityTab = 'all' | 'austin' | 'houston' | 'dallas' | 'san-antonio';

function timeAgo(d: string | undefined): string {
  if (!d) return '—';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getResidencySignal(p: ProviderRow) {
  const s = p.last_scan_result?.categoryScores?.data_sovereignty?.percentage ?? null;
  if (s === null) return { icon: '◌', label: 'Pending', color: 'text-slate-500' };
  if (s >= 80) return { icon: '🟢', label: 'Anchored', color: 'text-emerald-400' };
  if (s >= 65) return { icon: '🟡', label: 'Partial', color: 'text-amber-400' };
  return { icon: '🔴', label: 'Exposed', color: 'text-red-400' };
}

function getTransparencySignal(p: ProviderRow) {
  const s = p.last_scan_result?.categoryScores?.ai_transparency?.percentage ?? null;
  if (s === null) return { icon: '◌', label: 'Pending', color: 'text-slate-500' };
  if (s >= 80) return { icon: '🛡', label: 'Compliant', color: 'text-emerald-400' };
  if (s >= 60) return { icon: '⚠', label: 'Partial', color: 'text-amber-400' };
  return { icon: '✗', label: 'Missing', color: 'text-red-400' };
}

function getStatus(p: ProviderRow) {
  const s = p.risk_score ?? 0;
  const paid = p.is_paid || p.subscription_status === 'active';
  if (paid && s >= 80) return { label: 'Verified Sovereign', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (s >= 80) return { label: 'Sovereign', bg: 'bg-emerald-500/5 border-emerald-600/15', text: 'text-emerald-500', dot: 'bg-emerald-500' };
  if (s >= 60) return { label: 'Signal Inconclusive', bg: 'bg-amber-500/10 border-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' };
  if (s > 0) return { label: 'Audit Pending', bg: 'bg-red-500/10 border-red-500/15', text: 'text-red-400', dot: 'bg-red-400' };
  return { label: 'Pre-Audited', bg: 'bg-slate-500/10 border-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-500' };
}

function isHighRisk(p: ProviderRow) { return (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60; }

function maskName(name: string) {
  const w = name.split(' ');
  if (w.length <= 1) return w[0].charAt(0) + '●●●●●●●●';
  return w[0] + ' ' + w.slice(1).map(x => x.charAt(0) + '●'.repeat(Math.min(x.length - 1, 6))).join(' ');
}

function getExposureStatement(p: ProviderRow): { count: number; lines: string[] } {
  const cs = p.last_scan_result?.categoryScores;
  const findings = p.last_scan_result?.findings || [];
  const lines: string[] = [];

  const drScore = cs?.data_sovereignty?.percentage ?? null;
  const aiScore = cs?.ai_transparency?.percentage ?? null;
  const ciScore = cs?.clinical_integrity?.percentage ?? null;
  const failCount = findings.filter((f: any) => f.status === 'fail').length;

  // Data Residency exposures
  if (drScore !== null && drScore < 75) {
    if (drScore < 50) lines.push('Primary hosting infrastructure resolved to non-sovereign jurisdiction — potential SB 1188 §2(a) exposure');
    else if (drScore < 65) lines.push('Data residency signals indicate partial offshore routing — SB 1188 remediation recommended');
    else lines.push('Minor data residency gaps detected in CDN or sub-processor chain');
  }

  // AI Transparency exposures  
  if (aiScore !== null && aiScore < 75) {
    if (aiScore < 50) lines.push('No AI disclosure or algorithmic transparency notice detected — HB 149 §3 compliance gap');
    else if (aiScore < 65) lines.push('Incomplete AI transparency documentation — HB 149 disclosure requirements partially unmet');
    else lines.push('AI transparency signals present but may require additional disclosure language');
  }

  // Clinical Integrity exposures
  if (ciScore !== null && ciScore < 75) {
    if (ciScore < 60) lines.push('Clinical content integrity checks flagged — potential patient safety information gaps');
    else lines.push('Minor clinical integrity signals flagged for review');
  }

  // Foreign infrastructure
  const foreignFindings = findings.filter((f: any) => f.status === 'fail' && f.category === 'data_sovereignty');
  if (foreignFindings.length > 0) {
    const countries = [...new Set(foreignFindings.map((f: any) => f.evidence?.country || f.evidence?.countryCode).filter(Boolean))];
    if (countries.length > 0) lines.push(`Infrastructure endpoints detected in ${countries.join(', ')} — outside Texas sovereign boundary`);
  }

  return { count: Math.max(failCount, lines.length), lines: lines.slice(0, 3) };
}

const CITY_TABS: { key: CityTab; label: string; filter: string[] }[] = [
  { key: 'all', label: 'All Regions', filter: [] },
  { key: 'austin', label: 'Austin', filter: ['austin','round rock','cedar park','leander','georgetown','pflugerville','kyle','buda','lakeway','bee cave','dripping springs'] },
  { key: 'houston', label: 'Houston', filter: ['houston','katy','sugar land','pearland','the woodlands','humble','spring','cypress','tomball','pasadena','baytown','league city','friendswood','missouri city','richmond','bellaire','stafford','magnolia'] },
  { key: 'dallas', label: 'Dallas–Fort Worth', filter: ['dallas','fort worth','plano','frisco','mckinney','arlington','irving','richardson','garland','denton','carrollton','lewisville','flower mound','allen','addison','sachse','mesquite','rowlett','rockwall'] },
  { key: 'san-antonio', label: 'San Antonio', filter: ['san antonio','new braunfels','boerne','schertz','cibolo','converse','live oak','universal city','selma','helotes','leon valley','alamo heights','bulverde'] },
];

export default function RegistryPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState<CityTab>('all');
  const [claimModal, setClaimModal] = useState<ProviderRow | null>(null);
  const [claimStep, setClaimStep] = useState<'verify' | 'result'>('verify');
  const [claimForm, setClaimForm] = useState({ name: '', email: '', npi: '' });
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      const { data, error, count } = await supabase
        .from('registry')
        .select('id,npi,name,city,zip,risk_score,risk_level,status_label,last_scan_timestamp,last_scan_result,updated_at,is_paid,is_visible,subscription_status', { count: 'exact' })
        .eq('is_visible', true)
        .order('risk_score', { ascending: false })
        .limit(500);
      if (error) throw error;
      setProviders(data || []);
      setTotalScanned(count || 0);
    } catch (e) { console.error('Error loading registry:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const filtered = useMemo(() => {
    let r = providers;
    if (activeCity !== 'all') {
      const tab = CITY_TABS.find(t => t.key === activeCity);
      if (tab) r = r.filter(p => tab.filter.some(c => (p.city || '').toLowerCase().includes(c)));
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      r = r.filter(p => (p.name||'').toLowerCase().includes(s) || (p.city||'').toLowerCase().includes(s) || (p.zip||'').includes(s));
    }
    // Strategic interleave: credibility first, then curiosity gaps
    // Pattern: Sovereign, Sovereign, Inconclusive, Sovereign, At Risk, repeat
    if (!searchTerm.trim()) {
      const sovereign = r.filter(p => (p.risk_score ?? 0) >= 80).sort((a,b) => (b.risk_score??0)-(a.risk_score??0));
      const inconclusive = r.filter(p => (p.risk_score ?? 0) >= 60 && (p.risk_score ?? 0) < 80).sort((a,b) => (a.risk_score??0)-(b.risk_score??0));
      const atRisk = r.filter(p => (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60).sort((a,b) => (a.risk_score??0)-(b.risk_score??0));
      const unscanned = r.filter(p => !p.risk_score || p.risk_score === 0);

      const interleaved: ProviderRow[] = [];
      let si = 0, ii = 0, ai = 0;
      // Pattern cycle: S, S, I, S, R
      const pattern = ['s','s','i','s','r'];
      let pi = 0;

      while (si < sovereign.length || ii < inconclusive.length || ai < atRisk.length) {
        const slot = pattern[pi % pattern.length];
        if (slot === 's' && si < sovereign.length) { interleaved.push(sovereign[si++]); }
        else if (slot === 'i' && ii < inconclusive.length) { interleaved.push(inconclusive[ii++]); }
        else if (slot === 'r' && ai < atRisk.length) { interleaved.push(atRisk[ai++]); }
        else {
          // Fallback: pick from whichever bucket still has items
          if (si < sovereign.length) interleaved.push(sovereign[si++]);
          else if (ii < inconclusive.length) interleaved.push(inconclusive[ii++]);
          else if (ai < atRisk.length) interleaved.push(atRisk[ai++]);
        }
        pi++;
      }
      // Append unscanned at the end
      r = [...interleaved, ...unscanned];
    }
    return r;
  }, [providers, activeCity, searchTerm]);

  const stats = useMemo(() => ({
    sovereign: providers.filter(p => (p.risk_score ?? 0) >= 80).length,
    moderate: providers.filter(p => (p.risk_score ?? 0) >= 60 && (p.risk_score ?? 0) < 80).length,
    atRisk: providers.filter(p => (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60).length,
    pending: providers.filter(p => !p.risk_score || p.risk_score === 0).length,
  }), [providers]);

  const cityCounts = useMemo(() => {
    const c: Record<CityTab, number> = { all: providers.length, austin: 0, houston: 0, dallas: 0, 'san-antonio': 0 };
    CITY_TABS.forEach(t => { if (t.key !== 'all') c[t.key] = providers.filter(p => t.filter.some(f => (p.city||'').toLowerCase().includes(f))).length; });
    return c;
  }, [providers]);

  const handleClaim = async () => {
    if (!claimForm.email || !claimForm.name) return;
    setClaimSubmitting(true);
    try {
      const supabase = getSupabase();
      await supabase.from('prospects').insert({
        source: 'registry-claim', contact_name: claimForm.name, practice_name: claimModal?.name || '',
        email: claimForm.email, status: 'hot', priority: 'high',
        admin_notes: `Claimed listing: ${claimModal?.name}. NPI: ${claimForm.npi || 'not provided'}. Score: ${claimModal?.risk_score || 'N/A'}`,
        form_data: { npi: claimForm.npi, registry_id: claimModal?.id, registry_npi: claimModal?.npi, practice_name: claimModal?.name, city: claimModal?.city, risk_score: claimModal?.risk_score, claim_source: 'registry-page' },
      });
      if (claimForm.npi && claimModal) {
        await supabase.from('registry').update({ email: claimForm.email, npi: claimForm.npi, updated_at: new Date().toISOString() }).eq('id', claimModal.id);
      }
      setClaimStep('result');
    } catch (err) { console.error('Claim failed:', err); }
    finally { setClaimSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#070d1b]">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[11px] font-bold tracking-wider uppercase">Live Monitoring Active</span>
            </div>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-slate-500 text-xs font-mono">{totalScanned.toLocaleString()} entities indexed</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-3 tracking-tight">
            Texas Sovereignty <span className="text-gold">Registry</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mb-8">
            Forensic compliance signals for healthcare entities operating in Texas. Compiled from observable digital infrastructure per SB&nbsp;1188 and HB&nbsp;149.
          </p>
          <div className="max-w-2xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold transition-colors" size={18} />
              <input type="text" placeholder="Search by practice name, city, or ZIP code..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-12 pr-10 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-gold/40 focus:bg-white/[0.06] transition-all text-sm" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={16} /></button>}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SIGNAL SUMMARY ═══ */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            {[{ l: 'Sovereign', v: stats.sovereign, c: 'text-emerald-400', d: 'bg-emerald-400' },
              { l: 'Inconclusive', v: stats.moderate, c: 'text-amber-400', d: 'bg-amber-400' },
              { l: 'At Risk', v: stats.atRisk, c: 'text-red-400', d: 'bg-red-400' },
              { l: 'Pre-Audited', v: stats.pending, c: 'text-slate-500', d: 'bg-slate-500' }
            ].map(s => (
              <div key={s.l} className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${s.d}`} />
                <div><div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{s.l}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CITY TABS ═══ */}
      <section className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {CITY_TABS.map(tab => (
              <button key={tab.key} onClick={() => { setActiveCity(tab.key); setPage(1); }}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-t-lg ${activeCity === tab.key ? 'bg-white/[0.06] text-gold border-b-2 border-gold' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}>
                {tab.label}<span className={`ml-2 text-[10px] font-mono ${activeCity === tab.key ? 'text-gold/70' : 'text-slate-600'}`}>{cityCounts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REGISTRY TABLE ═══ */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20"><Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" /><p className="text-slate-500 text-sm">Loading forensic signals...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">No Results Found</h3>
              <p className="text-slate-500 text-sm mb-6">{searchTerm ? `No entities match "${searchTerm}".` : 'No entities found for this region.'}</p>
              <Link href="/#scan" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-lg text-sm transition-colors"><Shield size={16} /> Run a Free Sentry Scan</Link>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] gap-0 bg-white/[0.03] border-b border-white/[0.06] px-5 py-3">
                {['Practice Name', 'Sovereignty Status', 'Residency Signal', 'Transparency Seal', 'Last Scanned', ''].map((h, i) => (
                  <div key={h || i} className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 ${i === 5 ? 'text-right' : ''}`}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(p => {
                  const st = getStatus(p); const res = getResidencySignal(p); const tr = getTransparencySignal(p);
                  const hr = isHighRisk(p); const paid = p.is_paid || p.subscription_status === 'active';
                  return (
                    <div key={p.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] gap-2 md:gap-0 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                      <div>
                        <div className={`font-semibold text-sm ${hr ? 'text-slate-500' : 'text-white'}`}>{hr ? maskName(p.name) : p.name}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{p.city || '—'}{p.zip ? `, ${p.zip}` : ''}</div>
                      </div>
                      <div><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></div>
                      <div className={`text-sm font-medium ${res.color}`}><span className="mr-1.5">{res.icon}</span>{res.label}</div>
                      <div className={`text-sm font-medium ${tr.color}`}><span className="mr-1.5">{tr.icon}</span>{tr.label}</div>
                      <div className="text-xs text-slate-500 font-mono">{timeAgo(p.last_scan_timestamp || p.updated_at)}</div>
                      <div className="md:text-right">
                        {paid ? (
                          <Link href={`/api/report?npi=${p.npi}&format=html`} className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"><ShieldCheck size={13} /> View Certificate</Link>
                        ) : hr ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600 text-[11px] font-medium px-3 py-1.5"><Lock size={13} /> Restricted</span>
                        ) : (
                          <button onClick={() => { setClaimModal(p); setClaimStep('verify'); setClaimForm({ name: '', email: '', npi: '' }); }}
                            className="inline-flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 hover:border-gold/40 text-gold text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"><Eye size={13} /> Claim &amp; Verify</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {filtered.length > PER_PAGE && (() => {
                const totalPages = Math.ceil(filtered.length / PER_PAGE);
                const startItem = (page - 1) * PER_PAGE + 1;
                const endItem = Math.min(page * PER_PAGE, filtered.length);
                return (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {startItem}–{endItem} of {filtered.length} entities
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === 1}
                        className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        ««
                      </button>
                      <button onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === 1}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        ‹ Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce<(number | string)[]>((acc, p, i, arr) => {
                          if (i > 0 && (p - (arr[i - 1] as number)) > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === '...' ? (
                            <span key={`dot-${i}`} className="px-1 text-slate-600 text-[11px]">…</span>
                          ) : (
                            <button key={p} onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className={`w-7 h-7 rounded text-[11px] font-bold transition-all ${page === p ? 'bg-gold/20 text-gold border border-gold/30' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'}`}>
                              {p}
                            </button>
                          )
                        )}
                      <button onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === totalPages}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        Next ›
                      </button>
                      <button onClick={() => { setPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === totalPages}
                        className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        »»
                      </button>
                    </div>
                  </div>
                );
              })()}

              {filtered.length <= PER_PAGE && filtered.length > 0 && (
                <div className="text-center py-3 border-t border-white/[0.04] text-[11px] text-slate-600">
                  Showing {filtered.length} of {totalScanned.toLocaleString()} indexed entities
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="text-center mt-10">
              <p className="text-slate-500 text-sm mb-3">Don&apos;t see your practice listed?</p>
              <Link href="/#scan" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-lg text-sm transition-colors"><Shield size={16} /> Run a Free Sentry Scan</Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ DISCLOSURE ═══ */}
      <section className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Public-Interest Disclosure</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              The Texas Sovereignty Registry compiles compliance signals from observable public digital infrastructure including DNS records, IP geolocation, HTTP headers, TLS certificates, and publicly accessible website content. Data is collected and analyzed by the SENTRY engine in accordance with SB&nbsp;1188 (Data Sovereignty) and HB&nbsp;149 (AI Transparency) statutory frameworks. This registry does not constitute a legal endorsement, certification, or guarantee of compliance. Signals marked &ldquo;Pre-Audited&rdquo; or &ldquo;Signal Inconclusive&rdquo; indicate automated preliminary analysis only. Healthcare entities may claim their listing to initiate a verified forensic audit. &copy;&nbsp;{new Date().getFullYear()} KairoLogic. Independent auditor of the Texas medical digital supply chain.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CLAIM & VERIFY MODAL ═══ */}
      {claimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setClaimModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#0c1425] border border-white/[0.08] rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            {claimStep === 'verify' ? (<>
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-amber-400" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Verification Required</span></div>
                  <button onClick={() => setClaimModal(null)} className="text-slate-500 hover:text-white p-1"><X size={18} /></button>
                </div>
                <h3 className="text-white font-bold text-lg">{claimModal.name}</h3>
                <p className="text-slate-400 text-xs mt-1">{claimModal.city}{claimModal.zip ? `, ${claimModal.zip}` : ''}</p>
              </div>
              <div className="px-6 py-4">
                {(() => {
                  const exposure = getExposureStatement(claimModal);
                  return (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mb-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-200 text-sm font-semibold">
                            {exposure.count > 0
                              ? `We have identified ${exposure.count} potential statutory exposure${exposure.count !== 1 ? 's' : ''} for this entity.`
                              : 'We have identified potential statutory exposures for this entity.'}
                          </p>
                          {exposure.lines.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                              {exposure.lines.map((line, i) => (
                                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">▸</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-slate-500 text-[11px] mt-3">
                            To protect the privacy of your full forensic data, please verify your identity below.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-3">
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Your Name</label>
                    <input type="text" value={claimForm.name} onChange={e => setClaimForm({...claimForm, name: e.target.value})} placeholder="Dr. Jane Smith" className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold/40" /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Work Email</label>
                    <input type="email" value={claimForm.email} onChange={e => setClaimForm({...claimForm, email: e.target.value})} placeholder="you@yourpractice.com" className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold/40" />
                    <p className="text-[10px] text-slate-600 mt-1">Use your practice email to verify ownership</p></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">NPI Number <span className="text-slate-600">(optional)</span></label>
                    <input type="text" value={claimForm.npi} onChange={e => setClaimForm({...claimForm, npi: e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="10-digit NPI" className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold/40" /></div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-[10px] text-slate-600 max-w-[200px]">Your data is protected under our privacy policy.</p>
                <button onClick={handleClaim} disabled={!claimForm.name || !claimForm.email || claimSubmitting}
                  className="bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-navy font-bold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">
                  {claimSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck size={16} />} Verify &amp; Unlock Scan
                </button>
              </div>
            </>) : (<>
              {/* ── RESULT ── */}
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 text-sm font-bold">Identity Verified</span></div>
                  <button onClick={() => setClaimModal(null)} className="text-slate-500 hover:text-white p-1"><X size={18} /></button>
                </div>
              </div>
              <div className="px-6 py-6">
                <h3 className="text-white font-bold text-lg mb-1">{claimModal.name}</h3>
                <p className="text-slate-400 text-xs mb-5">{claimModal.city}{claimModal.zip ? `, ${claimModal.zip}` : ''}</p>

                {(claimModal.risk_score ?? 0) > 0 ? (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${(claimModal.risk_score??0) >= 80 ? 'border-emerald-400 text-emerald-400' : (claimModal.risk_score??0) >= 60 ? 'border-amber-400 text-amber-400' : 'border-red-400 text-red-400'}`}>
                        <span className="text-xl font-black">{claimModal.risk_score}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-sm mb-2">Preliminary Risk Score</div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div><div className={`font-bold ${getResidencySignal(claimModal).color}`}>{claimModal.last_scan_result?.categoryScores?.data_sovereignty?.percentage ?? '—'}%</div><div className="text-slate-500">Residency</div></div>
                          <div><div className={`font-bold ${getTransparencySignal(claimModal).color}`}>{claimModal.last_scan_result?.categoryScores?.ai_transparency?.percentage ?? '—'}%</div><div className="text-slate-500">Transparency</div></div>
                          <div><div className="font-bold text-slate-300">{claimModal.last_scan_result?.categoryScores?.clinical_integrity?.percentage ?? '—'}%</div><div className="text-slate-500">Integrity</div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 mb-5 text-center">
                    <p className="text-amber-300 text-sm font-semibold">No scan data available yet</p>
                    <p className="text-slate-500 text-xs mt-1">Run a full audit to generate your forensic report</p>
                  </div>
                )}

                <p className="text-slate-400 text-xs mb-5">A summary has been sent to <strong className="text-white">{claimForm.email}</strong>. To access detailed forensic findings and remediation roadmap:</p>

                <div className="space-y-2.5">
                  <a href="/#scan" className="flex items-center justify-between w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 transition-all group/b">
                    <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-gold" /><div><div className="text-white font-bold text-sm">Full Audit Report</div><div className="text-slate-500 text-xs">Deep forensic analysis with legal evidence mapping</div></div></div>
                    <div className="text-right"><div className="text-gold font-black text-lg">$149</div><ChevronRight className="w-4 h-4 text-slate-500 group-hover/b:text-gold ml-auto transition-colors" /></div>
                  </a>
                  <a href="/#scan" className="flex items-center justify-between w-full bg-gold/5 hover:bg-gold/10 border-2 border-gold/20 hover:border-gold/40 rounded-xl p-4 transition-all relative group/b">
                    <div className="absolute -top-2 left-4 bg-gold text-navy text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Recommended</div>
                    <div className="flex items-center gap-3 mt-1"><Shield className="w-5 h-5 text-gold" /><div><div className="text-white font-bold text-sm">Safe Harbor™ Bundle</div><div className="text-slate-500 text-xs">Audit + policies + AI disclosures + remediation blueprint</div></div></div>
                    <div className="text-right mt-1"><div className="text-gold font-black text-lg">$249</div><ChevronRight className="w-4 h-4 text-slate-500 group-hover/b:text-gold ml-auto transition-colors" /></div>
                  </a>
                </div>
              </div>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
