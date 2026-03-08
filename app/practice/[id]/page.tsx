'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ═══ TYPES ═══════════════════════════════════════════════

interface PracticeWebsite {
  id: string; name: string; url: string; state: string;
  scan_tier: string; last_scan_at: string; scan_status: string;
  provider_count: number; mismatch_count: number;
}

interface PracticeProvider {
  id: string; npi: string; provider_name: string;
  association_source: string; status: string;
  has_address_mismatch: boolean; has_phone_mismatch: boolean;
  has_taxonomy_mismatch: boolean; has_name_mismatch: boolean;
  active_mismatch_count: number;
  web_address: string | null; web_phone: string | null; web_specialty: string | null;
  first_detected_at: string; last_seen_at: string;
  departed_at: string | null; confirmed_at: string | null;
}

interface NppesData {
  npi: string; first_name: string; last_name: string;
  address_line_1: string; city: string; state: string; zip_code: string;
  phone: string; primary_taxonomy_code: string; taxonomy_desc: string;
}

interface DeltaEvent {
  id: string; npi: string; field_name: string;
  old_value: string | null; new_value: string | null;
  detection_source: string; confidence: string; confidence_score: number;
  signal_type: string; corroboration_count: number; detected_at: string;
}

type ViewTab = 'providers' | 'federal' | 'regulatory';

// ═══ SUPABASE ════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function db(path: string): Promise<any> {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return res.json();
}

// ═══ HELPERS ═════════════════════════════════════════════

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  MISMATCH:   { label: 'Mismatch',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  UNVERIFIED: { label: 'Auto-Detected', color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
  ACTIVE:     { label: 'Verified',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  DEPARTED:   { label: 'Departed',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  SUSPENDED:  { label: 'Suspended',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
};

function getStatus(p: PracticeProvider): string {
  if (p.status === 'DEPARTED') return 'DEPARTED';
  if (p.status === 'SUSPENDED') return 'SUSPENDED';
  if (p.active_mismatch_count > 0) return 'MISMATCH';
  if (p.confirmed_at) return 'ACTIVE';
  return 'UNVERIFIED';
}

function timeAgo(d: string | null): string {
  if (!d) return '\u2014';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return m <= 1 ? 'Just now' : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysSince(d: string | null): number {
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// ═══ FINDINGS HEADER (Task 1.14) ═════════════════════════

function FindingsHeader({ providers, practice }: { providers: PracticeProvider[]; practice: PracticeWebsite }) {
  const mismatches = providers.filter(p => p.active_mismatch_count > 0).length;
  const unverified = providers.filter(p => getStatus(p) === 'UNVERIFIED').length;
  const scanDays = daysSince(practice.last_scan_at);
  const risk = mismatches * 118 * 3;

  const cards = [
    {
      label: 'NPPES Mismatches', value: mismatches,
      sub: mismatches > 0 ? `providers \u00B7 ~$${risk.toLocaleString()}/mo risk` : 'All records aligned',
      alert: mismatches > 0, color: mismatches > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'Unverified Records', value: unverified,
      sub: unverified > 0 ? 'auto-detected, awaiting confirmation' : 'All providers confirmed',
      alert: false, color: unverified > 0 ? 'text-slate-300' : 'text-emerald-400',
    },
    {
      label: 'Last Scanned', value: scanDays === 999 ? '\u2014' : `${scanDays}d`,
      sub: `${practice.last_scan_at ? timeAgo(practice.last_scan_at) : 'No scans yet'} \u00B7 ${practice.scan_tier} tier`,
      alert: scanDays > 14, color: scanDays > 14 ? 'text-amber-400' : scanDays > 7 ? 'text-slate-300' : 'text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-xl p-4 border ${c.alert ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
          <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
          <p className="text-slate-500 text-xs">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ═══ PROVIDER ROW ════════════════════════════════════════

function ProviderRow({ provider, nppes, deltas, expanded, onToggle }: {
  provider: PracticeProvider; nppes: NppesData | null;
  deltas: DeltaEvent[]; expanded: boolean; onToggle: () => void;
}) {
  const status = getStatus(provider);
  const cfg = STATUS_MAP[status] || STATUS_MAP.UNVERIFIED;
  const name = provider.provider_name || (nppes ? `${nppes.first_name} ${nppes.last_name}`.trim() : provider.npi);
  const provDeltas = deltas.filter(d => d.npi === provider.npi);

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${cfg.border} ${expanded ? cfg.bg : 'bg-white/[0.02]'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'MISMATCH' ? 'bg-red-400' : status === 'ACTIVE' ? 'bg-emerald-400' : status === 'DEPARTED' ? 'bg-blue-400' : status === 'SUSPENDED' ? 'bg-amber-400' : 'bg-slate-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{name}</p>
          <p className="text-slate-500 text-xs font-mono">{provider.npi}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {provider.has_address_mismatch && <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Address</span>}
          {provider.has_phone_mismatch && <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Phone</span>}
          {provider.has_taxonomy_mismatch && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Taxonomy</span>}
        </div>
        <span className={`${cfg.color} ${cfg.bg} text-[10px] font-bold uppercase px-2 py-1 rounded flex-shrink-0`}>{cfg.label}</span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4">
          {nppes && provider.active_mismatch_count > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Field-Level Comparison</p>
              {provider.has_address_mismatch && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Practice Address</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-slate-600 mb-0.5">NPPES (current)</p><p className="text-red-400 text-xs font-mono bg-red-500/5 px-2 py-1 rounded">{[nppes.address_line_1, nppes.city, nppes.state, nppes.zip_code].filter(Boolean).join(', ') || '\u2014'}</p></div>
                    <div><p className="text-[9px] text-slate-600 mb-0.5">Website (detected)</p><p className="text-emerald-400 text-xs font-mono bg-emerald-500/5 px-2 py-1 rounded">{provider.web_address || '\u2014'}</p></div>
                  </div>
                </div>
              )}
              {provider.has_phone_mismatch && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Phone</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-slate-600 mb-0.5">NPPES</p><p className="text-red-400 text-xs font-mono bg-red-500/5 px-2 py-1 rounded">{nppes.phone || '\u2014'}</p></div>
                    <div><p className="text-[9px] text-slate-600 mb-0.5">Website</p><p className="text-emerald-400 text-xs font-mono bg-emerald-500/5 px-2 py-1 rounded">{provider.web_phone || '\u2014'}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {provDeltas.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Changes</p>
              <div className="space-y-1.5">
                {provDeltas.slice(0, 5).map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.confidence === 'HIGH' ? 'bg-red-400' : d.confidence === 'MEDIUM' ? 'bg-amber-400' : 'bg-slate-400'}`} />
                    <span className="text-slate-400">{d.field_name}:</span>
                    <span className="text-red-400 line-through">{d.old_value || '\u2014'}</span>
                    <span className="text-slate-600">\u2192</span>
                    <span className="text-emerald-400">{d.new_value || '\u2014'}</span>
                    <span className="text-slate-600 ml-auto">{timeAgo(d.detected_at)}</span>
                    {d.corroboration_count >= 2 && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-1 rounded">2-SOURCE</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
            {status === 'MISMATCH' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
                Generate NPPES Update Form
              </button>
            )}
            {status === 'UNVERIFIED' && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                Confirm Association
              </button>
            )}
            <Link href={`/dashboard/${provider.npi}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06] transition-colors ml-auto">
              Full Compliance View \u2192
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ MAIN PAGE ═══════════════════════════════════════════

export default function PracticeManagerDashboard() {
  const params = useParams();
  const practiceId = params.id as string;

  const [practice, setPractice] = useState<PracticeWebsite | null>(null);
  const [providers, setProviders] = useState<PracticeProvider[]>([]);
  const [nppesMap, setNppesMap] = useState<Map<string, NppesData>>(new Map());
  const [deltas, setDeltas] = useState<DeltaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNpi, setExpandedNpi] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'mismatches' | 'status' | 'name'>('mismatches');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const pw: PracticeWebsite[] = await db(`practice_websites?id=eq.${practiceId}&select=*`);
      if (!pw.length) { setError('Practice not found'); setLoading(false); return; }
      setPractice(pw[0]);

      const provs: PracticeProvider[] = await db(`practice_providers?practice_website_id=eq.${practiceId}&select=*&order=active_mismatch_count.desc`);
      setProviders(provs);

      if (provs.length > 0) {
        const npiList = provs.map(p => `"${p.npi}"`).join(',');
        const nppes: NppesData[] = await db(`providers?npi=in.(${npiList})&select=npi,first_name,last_name,address_line_1,city,state,zip_code,phone,primary_taxonomy_code,taxonomy_desc`);
        setNppesMap(new Map(nppes.map(n => [n.npi, n])));

        const d: DeltaEvent[] = await db(`nppes_delta_events?practice_website_id=eq.${practiceId}&order=detected_at.desc&limit=100`);
        setDeltas(d);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
    setLoading(false);
  }, [practiceId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = providers
    .filter(p => !searchQuery || p.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.npi.includes(searchQuery))
    .sort((a, b) => {
      if (sortBy === 'mismatches') return b.active_mismatch_count - a.active_mismatch_count;
      if (sortBy === 'name') return (a.provider_name || '').localeCompare(b.provider_name || '');
      const order: Record<string, number> = { MISMATCH: 0, UNVERIFIED: 1, ACTIVE: 2, DEPARTED: 3 };
      return (order[getStatus(a)] ?? 5) - (order[getStatus(b)] ?? 5);
    });

  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading practice dashboard...</p>
      </div>
    </div>
  );

  if (error || !practice) return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-white/[0.03] border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
        <p className="text-red-400 text-lg font-bold mb-2">Dashboard Error</p>
        <p className="text-slate-400 text-sm mb-4">{error || 'Practice not found'}</p>
        <Link href="/dashboard/login" className="text-gold text-sm font-semibold hover:underline">Back to login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white font-bold text-xl">{practice.name || 'Practice Dashboard'}</h1>
            <p className="text-slate-500 text-sm mt-1">
              <a href={practice.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-gold transition-colors">{practice.url}</a>
              {' \u00B7 '}{practice.state}{' \u00B7 '}{providers.length} provider{providers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={loadData} className="px-4 py-2 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            Refresh
          </button>
        </div>

        <FindingsHeader providers={providers} practice={practice} />

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
          {([
            { key: 'providers' as ViewTab, label: 'Provider Records', count: providers.length },
            { key: 'federal' as ViewTab, label: 'Federal Flags', count: deltas.filter(d => d.signal_type === 'license_status_change' || d.signal_type === 'exclusion_detected').length },
            { key: 'regulatory' as ViewTab, label: 'State Regulatory', count: 0 },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.key ? 'bg-gold/10 text-gold border border-gold/20' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab.label}
              {tab.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-slate-500'}`}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Provider Records Tab */}
        {activeTab === 'providers' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search providers..."
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-gold/30" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-slate-400 text-xs focus:outline-none appearance-none cursor-pointer">
                <option value="mismatches">Most mismatches</option>
                <option value="status">By status</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-slate-400 text-sm">{searchQuery ? 'No providers match your search' : 'No providers detected yet. Run a scan to detect providers.'}</p>
                </div>
              ) : filtered.map(p => (
                <ProviderRow key={p.id} provider={p} nppes={nppesMap.get(p.npi) || null} deltas={deltas}
                  expanded={expandedNpi === p.npi} onToggle={() => setExpandedNpi(expandedNpi === p.npi ? null : p.npi)} />
              ))}
            </div>
          </div>
        )}

        {/* Federal Flags Tab */}
        {activeTab === 'federal' && (
          <div className="space-y-3">
            {deltas.filter(d => d.signal_type === 'license_status_change' || d.signal_type === 'exclusion_detected').length === 0 ? (
              <div className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-emerald-400 text-sm font-semibold">No federal exclusion flags</p>
                <p className="text-slate-600 text-xs mt-1">All providers clear of LEIE and SAM.gov exclusions</p>
              </div>
            ) : deltas.filter(d => d.signal_type === 'license_status_change' || d.signal_type === 'exclusion_detected').map(d => (
              <div key={d.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-white text-sm font-semibold">{d.field_name}: {d.new_value}</p>
                <p className="text-slate-400 text-xs mt-1">NPI: {d.npi} \u00B7 Detected: {timeAgo(d.detected_at)} \u00B7 Source: {d.detection_source}</p>
              </div>
            ))}
          </div>
        )}

        {/* Regulatory Tab */}
        {activeTab === 'regulatory' && (
          <div className="text-center py-12 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <p className="text-slate-400 text-sm">State regulatory findings will appear here after scanning</p>
            <p className="text-slate-600 text-xs mt-1">TX: SB 1188 + HB 149 \u00B7 CA: AB 3030</p>
          </div>
        )}
      </div>
    </div>
  );
}
