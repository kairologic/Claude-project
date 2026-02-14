'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

// ═══ CONFIG ═══
const PAGE_SIZE = 50;

const CITY_TABS = [
  { key: 'all' as const, label: 'All Regions', filter: [] as string[] },
  { key: 'austin' as const, label: 'Austin', filter: ['austin', 'round rock', 'cedar park', 'pflugerville', 'leander', 'georgetown'] },
  { key: 'houston' as const, label: 'Houston', filter: ['houston', 'sugar land', 'katy', 'pearland', 'the woodlands', 'pasadena'] },
  { key: 'dallas' as const, label: 'Dallas–Fort Worth', filter: ['dallas', 'fort worth', 'plano', 'irving', 'arlington', 'frisco', 'mckinney', 'garland', 'denton'] },
  { key: 'san-antonio' as const, label: 'San Antonio', filter: ['san antonio', 'new braunfels', 'schertz'] },
];

type CityTab = typeof CITY_TABS[number]['key'];
type TierFilter = 'all' | 'sovereign' | 'drift' | 'violation' | 'pending';

// ═══ HELPERS ═══
function getTier(score: number | null | undefined) {
  if (!score || score === 0) return { label: 'Pending', color: '#64748b', cssColor: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  if (score >= 80) return { label: 'Sovereign', color: '#34d399', cssColor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (score >= 60) return { label: 'Drift', color: '#fbbf24', cssColor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { label: 'Violation', color: '#f87171', cssColor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

function getResidencySignal(scanResult: any) {
  const ds = scanResult?.category_scores?.data_sovereignty?.percentage
    ?? scanResult?.categoryScores?.data_sovereignty?.percentage;
  if (ds === undefined || ds === null) return { icon: '◌', label: 'Pending', color: 'text-slate-500' };
  if (ds >= 80) return { icon: '●', label: 'Anchored', color: 'text-emerald-400' };
  if (ds >= 60) return { icon: '●', label: 'Partial', color: 'text-amber-400' };
  return { icon: '●', label: 'Exposed', color: 'text-red-400' };
}

function getTransparencySeal(scanResult: any) {
  const ai = scanResult?.category_scores?.ai_transparency?.percentage
    ?? scanResult?.categoryScores?.ai_transparency?.percentage;
  if (ai === undefined || ai === null) return { icon: '◌', label: 'Pending', color: 'text-slate-500' };
  if (ai >= 80) return { icon: '🛡', label: 'Compliant', color: 'text-emerald-400' };
  if (ai >= 60) return { icon: '⚠', label: 'Partial', color: 'text-amber-400' };
  return { icon: '✗', label: 'Missing', color: 'text-red-400' };
}

function maskName(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length <= 1) return name[0] + '●'.repeat(Math.min(name.length - 1, 6));
  return parts[0] + ' ' + parts.slice(1).map(p => p[0] + '●'.repeat(Math.min(p.length - 1, 4))).join(' ');
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

function generateFindingsSummary(scanResult: any) {
  const findings = scanResult?.findings || scanResult?.raw_findings || [];
  const critical = findings.filter((f: any) => f.status === 'fail' && f.severity === 'critical');
  const high = findings.filter((f: any) => f.status === 'fail' && f.severity === 'high');
  const warnings = findings.filter((f: any) => f.status === 'warn');
  const passes = findings.filter((f: any) => f.status === 'pass');
  return { critical, high, warnings, passes, total: findings.length };
}

// ═══ ICONS (inline SVG to avoid lucide dependency issues) ═══
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const AlertTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const Loader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
);

// ═══ MAIN PAGE ═══
export default function RegistryPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [activeCity, setActiveCity] = useState<CityTab>('all');
  const [activeTier, setActiveTier] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({ sovereign: 0, drift: 0, violation: 0, pending: 0 });
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});

  // Claim modal
  const [claimModal, setClaimModal] = useState<any>(null);
  const [claimStep, setClaimStep] = useState<'verify' | 'results'>('verify');
  const [claimForm, setClaimForm] = useState({ name: '', email: '' });
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimedNpis, setClaimedNpis] = useState<Set<string>>(new Set());

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load stats (one-time, lightweight)
  const loadStats = useCallback(async () => {
    try {
      const supabase = createClientComponentClient();
      const { data } = await supabase
        .from('registry')
        .select('risk_score,city')
        .eq('is_visible', true);

      if (!data) return;
      setTotalCount(data.length);

      setStats({
        sovereign: data.filter(p => (p.risk_score ?? 0) >= 80).length,
        drift: data.filter(p => (p.risk_score ?? 0) >= 60 && (p.risk_score ?? 0) < 80).length,
        violation: data.filter(p => (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60).length,
        pending: data.filter(p => !p.risk_score || p.risk_score === 0).length,
      });

      const counts: Record<string, number> = { all: data.length };
      CITY_TABS.forEach(tab => {
        if (tab.key === 'all') return;
        counts[tab.key] = data.filter(p =>
          tab.filter.some(c => (p.city || '').toLowerCase().includes(c))
        ).length;
      });
      setCityCounts(counts);
    } catch (e) { console.error('Stats error:', e); }
  }, []);

  // Load paginated providers
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();

      let query = supabase
        .from('registry')
        .select('id,npi,name,url,city,zip,risk_score,risk_level,status_label,last_scan_timestamp,last_scan_result,updated_at,is_paid,is_visible,subscription_status', { count: 'exact' })
        .eq('is_visible', true);

      // City filter
      if (activeCity !== 'all') {
        const cityTab = CITY_TABS.find(t => t.key === activeCity);
        if (cityTab && cityTab.filter.length > 0) {
          const cityFilter = cityTab.filter.map(c => `city.ilike.%${c}%`).join(',');
          query = query.or(cityFilter);
        }
      }

      // Tier filter
      if (activeTier === 'sovereign') query = query.gte('risk_score', 80);
      else if (activeTier === 'drift') query = query.gte('risk_score', 60).lt('risk_score', 80);
      else if (activeTier === 'violation') query = query.gt('risk_score', 0).lt('risk_score', 60);
      else if (activeTier === 'pending') query = query.or('risk_score.is.null,risk_score.eq.0');

      // Search
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%,zip.ilike.%${s}%,npi.ilike.%${s}%`);
      }

      const { data, error, count } = await query
        .order('risk_score', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      setProviders(data || []);
      if (count !== null) setTotalCount(count);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, activeCity, activeTier, debouncedSearch]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { setPage(0); }, [activeCity, activeTier, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showFrom = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  // ═══ CLAIM HANDLERS ═══
  const handleClaimOpen = (provider: any) => {
    setClaimModal(provider);
    setClaimStep('verify');
    setClaimForm({ name: '', email: '' });
    setClaimError('');
  };

  const handleClaimSubmit = async () => {
    if (!claimForm.name.trim() || !claimForm.email.trim()) {
      setClaimError('Name and email are required.');
      return;
    }

    // Email domain validation against provider URL
    const providerDomain = extractDomain(claimModal?.url);
    const emailDomain = claimForm.email.split('@')[1]?.toLowerCase();

    if (providerDomain && emailDomain) {
      // Allow if email domain matches or is a subdomain of provider domain
      const domainMatch = emailDomain === providerDomain
        || emailDomain.endsWith('.' + providerDomain)
        || providerDomain.endsWith('.' + emailDomain);

      if (!domainMatch) {
        setClaimError(`Email domain must match the provider website (${providerDomain}). Use your organization email.`);
        return;
      }
    }

    setClaimSubmitting(true);
    setClaimError('');

    try {
      const supabase = createClientComponentClient();
      const score = claimModal.risk_score || 0;

      await supabase.from('prospects').insert({
        practice_name: claimModal.name,
        contact_name: claimForm.name,
        email: claimForm.email,
        npi: claimModal.npi,
        source: 'registry_claim',
        priority: score < 60 ? 'high' : 'medium',
        temperature: score < 60 ? 'hot' : 'warm',
        status: 'new',
        notes: `Claimed from public registry. Score: ${score}. City: ${claimModal.city || 'N/A'}.`,
      });

      setClaimedNpis(prev => new Set(prev).add(claimModal.npi));
      setClaimStep('results');
    } catch (e: any) {
      setClaimError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // ═══ RENDER ═══
  return (
    <div className="min-h-screen" style={{ background: '#070d1b' }}>

      {/* ═══ HEADER ═══ */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
                  <span className="text-emerald-400"><ShieldIcon /></span>
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Texas Healthcare Compliance Registry
                </h1>
              </div>
              <p className="text-slate-500 text-xs ml-11" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                SB 1188 &middot; HB 149 &middot; Automated Compliance Monitoring
              </p>
            </div>
            <Link href="/" className="text-slate-500 hover:text-white text-xs transition-colors">
              &larr; KairoLogic Home
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ SIGNAL SUMMARY BAR ═══ */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'sovereign' as TierFilter, label: 'Sovereign', count: stats.sovereign, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
              { key: 'drift' as TierFilter, label: 'Drift Detected', count: stats.drift, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
              { key: 'violation' as TierFilter, label: 'Violation', count: stats.violation, color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
              { key: 'pending' as TierFilter, label: 'Pending Audit', count: stats.pending, color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setActiveTier(activeTier === s.key ? 'all' : s.key)}
                className={`rounded-xl p-3 text-left transition-all border ${
                  activeTier === s.key ? 'border-white/20 ring-1 ring-white/10' : 'border-transparent hover:border-white/10'
                }`}
                style={{ background: activeTier === s.key ? s.bg : 'transparent' }}
              >
                <div className="text-2xl font-black" style={{ color: s.color, fontFamily: "'DM Sans', sans-serif" }}>
                  {s.count.toLocaleString()}
                </div>
                <div className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search by name, city, ZIP, or NPI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {/* City Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {CITY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCity(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCity === tab.key
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {tab.label}
                {cityCounts[tab.key] !== undefined && (
                  <span className="ml-1.5 text-slate-600">{cityCounts[tab.key]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ REGISTRY TABLE ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b"
            style={{ color: 'rgba(148,163,184,0.6)', borderColor: 'rgba(255,255,255,0.06)', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
            <div className="col-span-3">Practice</div>
            <div className="col-span-2">Sovereignty Status</div>
            <div className="col-span-2">Data Residency</div>
            <div className="col-span-2">AI Transparency</div>
            <div className="col-span-1">Scanned</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500 text-sm">
              <Loader /> Loading registry...
            </div>
          )}

          {/* Empty */}
          {!loading && providers.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm">No providers found matching your filters.</p>
              <button onClick={() => { setSearch(''); setActiveCity('all'); setActiveTier('all'); }}
                className="mt-3 text-emerald-400 text-xs hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          {/* Rows */}
          {!loading && providers.map((p, i) => {
            const score = p.risk_score || 0;
            const tier = getTier(score);
            const residency = getResidencySignal(p.last_scan_result);
            const transparency = getTransparencySeal(p.last_scan_result);
            const isHighRisk = score > 0 && score < 60;
            const isClaimed = claimedNpis.has(p.npi);
            const isPaid = p.is_paid || p.subscription_status === 'active';

            return (
              <div
                key={p.id || i}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b transition-colors hover:bg-white/[0.02] items-center"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                {/* Practice Name + City */}
                <div className="col-span-3">
                  <div className="text-white text-sm font-semibold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {isHighRisk ? maskName(p.name || '') : (p.name || 'Unknown')}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {p.city || ''}{p.zip ? `, ${p.zip}` : ''}
                    {p.npi && <span className="ml-2 text-slate-600" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>NPI: {p.npi}</span>}
                  </div>
                </div>

                {/* Sovereignty Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tier.bg} ${tier.border} border`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                    <span className={tier.cssColor}>{tier.label}</span>
                  </span>
                </div>

                {/* Data Residency */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${residency.color}`}>{residency.icon}</span>
                    <span className={`text-xs font-medium ${residency.color}`}>{residency.label}</span>
                  </div>
                </div>

                {/* AI Transparency */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${transparency.color}`}>{transparency.icon}</span>
                    <span className={`text-xs font-medium ${transparency.color}`}>{transparency.label}</span>
                  </div>
                </div>

                {/* Last Scanned */}
                <div className="col-span-1">
                  <span className="text-slate-400 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                    {timeAgo(p.last_scan_timestamp || p.updated_at)}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-2 text-right">
                  {isPaid ? (
                    <Link href={`/scan/results?npi=${p.npi}&mode=verified`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all">
                      View Audit
                    </Link>
                  ) : isClaimed ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-400 border border-blue-500/20 bg-blue-500/5">
                      ✓ Claimed
                    </span>
                  ) : isHighRisk ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-500/10 bg-slate-500/5">
                      🔒 Restricted
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaimOpen(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={{
                        color: '#d4a017',
                        background: 'rgba(212,160,23,0.08)',
                        border: '1px solid rgba(212,160,23,0.2)',
                      }}
                    >
                      Claim &amp; Verify
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ PAGINATION ═══ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-slate-500 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Showing {showFrom}–{showTo} of {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === pageNum ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ═══ LEGAL FOOTER ═══ */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <p className="text-slate-600 text-[10px] leading-relaxed max-w-3xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            PUBLIC-INTEREST DISCLOSURE — Data is collected and analyzed by the SENTRY engine in accordance with SB&nbsp;1188 (Data Sovereignty)
            and HB&nbsp;149 (AI Transparency) statutory frameworks. This registry does not constitute a legal endorsement, certification, or guarantee
            of compliance. Signals marked &ldquo;Pending&rdquo; indicate automated preliminary analysis only. Healthcare entities may claim their listing
            to initiate a verified forensic audit. &copy;&nbsp;{new Date().getFullYear()} KairoLogic. Independent auditor of the Texas medical digital supply chain.
          </p>
        </div>
      </div>

      {/* ═══ CLAIM & VERIFY MODAL ═══ */}
      {claimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setClaimModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: '#0c1425', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >

            {claimStep === 'verify' ? (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
                        <span className="text-amber-400"><ShieldIcon /></span>
                      </div>
                      <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Verification Required</span>
                    </div>
                    <button onClick={() => setClaimModal(null)} className="text-slate-500 hover:text-white p-1"><XIcon /></button>
                  </div>
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>{claimModal.name}</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {claimModal.city}{claimModal.zip ? `, ${claimModal.zip}` : ''}
                    {claimModal.npi && <span className="ml-2 text-slate-500">NPI: {claimModal.npi}</span>}
                  </p>
                </div>

                {/* Alert */}
                <div className="px-6 py-5">
                  <div className="rounded-lg p-4 mb-5" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-amber-400 flex-shrink-0 mt-0.5"><AlertTriangle /></span>
                      <div>
                        <p className="text-amber-200 text-sm font-semibold">
                          We have identified potential statutory exposures for this entity.
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          To protect the privacy of forensic data, verify your identity using your organization email to unlock the Preliminary Forensic Scan.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1.5">Your Name</label>
                      <input
                        type="text"
                        value={claimForm.name}
                        onChange={e => setClaimForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full name"
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1.5">Organization Email</label>
                      <input
                        type="email"
                        value={claimForm.email}
                        onChange={e => setClaimForm(f => ({ ...f, email: e.target.value }))}
                        placeholder={claimModal.url ? `you@${extractDomain(claimModal.url) || 'yourpractice.com'}` : 'you@yourpractice.com'}
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      {claimModal.url && (
                        <p className="text-slate-600 text-[10px] mt-1">
                          Must match provider domain: {extractDomain(claimModal.url)}
                        </p>
                      )}
                    </div>
                  </div>

                  {claimError && (
                    <div className="mt-3 rounded-lg p-3 text-xs text-red-300" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      {claimError}
                    </div>
                  )}

                  <button
                    onClick={handleClaimSubmit}
                    disabled={claimSubmitting || !claimForm.name || !claimForm.email}
                    className="w-full mt-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.1))',
                      border: '1px solid rgba(212,160,23,0.3)',
                      color: '#d4a017',
                    }}
                  >
                    {claimSubmitting ? <><Loader /> Verifying...</> : 'Unlock Preliminary Scan'}
                  </button>
                </div>
              </>
            ) : (
              /* ═══ STEP 2: PERSONALIZED RESULTS ═══ */
              <>
                <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>{claimModal.name}</h3>
                    <button onClick={() => setClaimModal(null)} className="text-slate-500 hover:text-white p-1"><XIcon /></button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  {/* Score Ring */}
                  {(() => {
                    const score = claimModal.risk_score || 0;
                    const tier = getTier(score);
                    return (
                      <div className="flex items-center gap-5 mb-6">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="34" fill="none" stroke={tier.color} strokeWidth="6"
                              strokeDasharray={`${(score / 100) * 213.6} 213.6`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black text-white">{score}</span>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tier.bg} ${tier.border} border`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                            <span className={tier.cssColor}>{tier.label}</span>
                          </span>
                          <p className="text-slate-400 text-xs mt-2">Composite compliance score based on SB 1188 and HB 149 analysis.</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category Breakdown */}
                  {(() => {
                    const cs = claimModal.last_scan_result?.category_scores
                      || claimModal.last_scan_result?.categoryScores || {};
                    const categories = [
                      { key: 'data_sovereignty', label: 'Data Residency (SB 1188)', weight: 45 },
                      { key: 'ai_transparency', label: 'AI Transparency (HB 149)', weight: 30 },
                      { key: 'clinical_integrity', label: 'Clinical Integrity', weight: 25 },
                    ];
                    return (
                      <div className="space-y-2 mb-6">
                        {categories.map(cat => {
                          const pct = cs[cat.key]?.percentage ?? 0;
                          const catTier = getTier(pct);
                          return (
                            <div key={cat.key} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-white text-xs font-semibold">{cat.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold" style={{ color: catTier.color }}>{pct}%</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${catTier.bg} ${catTier.cssColor}`}>{catTier.label}</span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: catTier.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Personalized Findings Summary */}
                  {(() => {
                    const { critical, high, warnings, passes, total } = generateFindingsSummary(claimModal.last_scan_result);
                    if (total === 0) return null;
                    return (
                      <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Scan Findings</div>
                        {critical.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-red-300 py-1">
                            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                            <span><strong className="text-red-400">{critical.length} critical</strong> exposure{critical.length !== 1 ? 's' : ''} requiring immediate attention</span>
                          </div>
                        )}
                        {high.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-orange-300 py-1">
                            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                            <span><strong className="text-orange-400">{high.length} high-severity</strong> finding{high.length !== 1 ? 's' : ''} detected</span>
                          </div>
                        )}
                        {warnings.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-amber-300 py-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            <span><strong className="text-amber-400">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</strong> — recommended review</span>
                          </div>
                        )}
                        {passes.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-emerald-300 py-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                            <span><strong className="text-emerald-400">{passes.length} check{passes.length !== 1 ? 's' : ''} passed</strong></span>
                          </div>
                        )}
                        <p className="text-slate-600 text-[10px] mt-2 italic">
                          Full remediation roadmap available in the Audit Report.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Confirmation */}
                  <p className="text-slate-400 text-xs mb-5">
                    A summary has been sent to <strong className="text-white">{claimForm.email}</strong>. To access detailed forensic findings, remediation roadmap, and data border map:
                  </p>

                  {/* CTAs */}
                  <div className="space-y-2.5">
                    <a href={`/#scan`}
                      className="flex items-center justify-between w-full rounded-xl p-4 transition-all group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div className="text-white font-bold text-sm">Full Audit Report</div>
                        <div className="text-slate-500 text-xs">Deep forensic analysis with legal evidence mapping</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black" style={{ color: '#d4a017' }}>$149</div>
                      </div>
                    </a>

                    <a href={`/#scan`}
                      className="flex items-center justify-between w-full rounded-xl p-4 transition-all relative overflow-hidden"
                      style={{ background: 'rgba(212,160,23,0.05)', border: '1px solid rgba(212,160,23,0.2)' }}>
                      <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,160,23,0.15)', color: '#d4a017' }}>
                        RECOMMENDED
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Safe Harbor™ + Audit</div>
                        <div className="text-slate-500 text-xs">Full audit + compliance remediation package</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black" style={{ color: '#d4a017' }}>$249</div>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
