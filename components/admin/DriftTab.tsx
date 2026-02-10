'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Shield, Activity,
  ChevronDown, ChevronUp, RefreshCw, Eye, EyeOff,
  Search, X, AlertCircle, ExternalLink, ArrowLeft, Globe
} from 'lucide-react';

// ── Types ──
interface DriftEvent {
  id: string;
  npi: string;
  page_url: string;
  category: string;
  drift_type: string;
  severity: string;
  status: string;
  previous_hash: string | null;
  current_hash: string | null;
  content_before: string | null;
  content_after: string | null;
  metadata: any;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface Heartbeat {
  id: string;
  npi: string;
  page_url: string;
  widget_mode: string;
  last_seen: string;
  page_views_24h: number;
  page_views_total: number;
}

interface ProviderInfo {
  npi: string;
  name: string;
  url: string;
  subscription_tier: string;
  dashboard_token: string;
}

interface ProviderSummary {
  npi: string;
  name: string;
  url: string;
  tier: string;
  dashboardToken: string;
  heartbeats: Heartbeat[];
  events: DriftEvent[];
  newCount: number;
  criticalCount: number;
  highCount: number;
  lastSeen: string | null;
  widgetActive: boolean;
}

interface DriftTabProps {
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ── Constants ──
const CATEGORY_LABELS: Record<string, string> = {
  ai_disclosure: 'AI Disclosure',
  privacy_policy: 'Privacy Policy',
  third_party_scripts: 'Third-Party Scripts',
  data_collection_forms: 'Data Collection Forms',
  cookie_consent: 'Cookie Consent',
  hipaa_references: 'HIPAA References',
  meta_compliance: 'Compliance Meta Tags',
};

const CATEGORY_ICONS: Record<string, string> = {
  ai_disclosure: '🤖', privacy_policy: '🔒', third_party_scripts: '📜',
  data_collection_forms: '📋', cookie_consent: '🍪', hipaa_references: '🏥', meta_compliance: '🏷️',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const DRIFT_TYPE_LABELS: Record<string, string> = {
  content_changed: 'Content Modified', content_removed: 'Content Removed',
  content_added: 'New Content Detected', widget_removed: 'Widget Removed',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function DriftTab({ showNotification }: DriftTabProps) {
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [loading, setLoading] = useState(true);

  // View state
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const supabase = getSupabase();

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: driftData } = await supabase
        .from('drift_events').select('*').order('created_at', { ascending: false }).limit(500);
      setEvents(driftData || []);

      const { data: hbData } = await supabase
        .from('widget_heartbeats').select('*').order('last_seen', { ascending: false });
      setHeartbeats(hbData || []);

      // Get provider info
      const allNpis = new Set<string>();
      (driftData || []).forEach(e => allNpis.add(e.npi));
      (hbData || []).forEach(h => allNpis.add(h.npi));

      if (allNpis.size > 0) {
        const { data: provData } = await supabase
          .from('registry')
          .select('npi, name, url, subscription_tier, dashboard_token')
          .in('npi', Array.from(allNpis));
        const provMap: Record<string, ProviderInfo> = {};
        (provData || []).forEach(p => { provMap[p.npi] = p; });
        setProviders(provMap);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotification]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Build Provider Summaries ──
  const providerSummaries: ProviderSummary[] = (() => {
    const map = new Map<string, ProviderSummary>();

    // Seed from heartbeats
    heartbeats.forEach(hb => {
      if (!map.has(hb.npi)) {
        const prov = providers[hb.npi];
        map.set(hb.npi, {
          npi: hb.npi,
          name: prov?.name || hb.npi,
          url: prov?.url || '',
          tier: prov?.subscription_tier || 'none',
          dashboardToken: prov?.dashboard_token || '',
          heartbeats: [], events: [],
          newCount: 0, criticalCount: 0, highCount: 0,
          lastSeen: null, widgetActive: false,
        });
      }
      const s = map.get(hb.npi)!;
      s.heartbeats.push(hb);
      if (!s.lastSeen || hb.last_seen > s.lastSeen) s.lastSeen = hb.last_seen;
      s.widgetActive = Date.now() - new Date(hb.last_seen).getTime() < 48 * 60 * 60 * 1000;
    });

    // Add from events
    events.forEach(e => {
      if (!map.has(e.npi)) {
        const prov = providers[e.npi];
        map.set(e.npi, {
          npi: e.npi,
          name: prov?.name || e.npi,
          url: prov?.url || '',
          tier: prov?.subscription_tier || 'none',
          dashboardToken: prov?.dashboard_token || '',
          heartbeats: [], events: [],
          newCount: 0, criticalCount: 0, highCount: 0,
          lastSeen: null, widgetActive: false,
        });
      }
      const s = map.get(e.npi)!;
      s.events.push(e);
      if (e.status === 'new') {
        s.newCount++;
        if (e.severity === 'critical') s.criticalCount++;
        if (e.severity === 'high') s.highCount++;
      }
    });

    // Sort: most critical first, then by new count
    return Array.from(map.values()).sort((a, b) => {
      if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
      if (a.highCount !== b.highCount) return b.highCount - a.highCount;
      return b.newCount - a.newCount;
    });
  })();

  // Filter summaries by search
  const filteredSummaries = providerSummaries.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.npi.includes(term);
  });

  // Global stats
  const totalNew = providerSummaries.reduce((sum, s) => sum + s.newCount, 0);
  const totalCritical = providerSummaries.reduce((sum, s) => sum + s.criticalCount, 0);
  const totalHigh = providerSummaries.reduce((sum, s) => sum + s.highCount, 0);
  const activeWidgets = providerSummaries.filter(s => s.widgetActive).length;
  const staleWidgets = providerSummaries.filter(s => s.heartbeats.length > 0 && !s.widgetActive).length;

  // ── Actions ──
  const updateEventStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'false_positive') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = 'admin';
      }
      const { error } = await supabase.from('drift_events').update(updates).eq('id', id);
      if (error) throw error;
      showNotification(`Event marked as ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const bulkResolveProvider = async (npi: string) => {
    try {
      const { error } = await supabase
        .from('drift_events')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: 'admin' })
        .eq('npi', npi).eq('status', 'new');
      if (error) throw error;
      showNotification(`All events resolved for ${providers[npi]?.name || npi}`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const generateDashboardToken = async (npi: string) => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(36).padStart(2, '0')).join('').substring(0, 32);
    try {
      const { error } = await supabase.from('registry').update({ dashboard_token: token }).eq('npi', npi);
      if (error) throw error;
      showNotification(`Dashboard token generated. URL: /dashboard/${npi}?token=${token}`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // ── Selected provider's events ──
  const selectedProvider = selectedNpi ? providerSummaries.find(s => s.npi === selectedNpi) : null;
  const selectedEvents = selectedProvider
    ? selectedProvider.events.filter(e => {
        if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
        return true;
      })
    : [];

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw size={24} className="animate-spin mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">Loading drift data...</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // PROVIDER DETAIL VIEW
  // ══════════════════════════════════════════════
  if (selectedProvider) {
    const sp = selectedProvider;
    return (
      <div className="space-y-4">
        {/* Back + Provider Header */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedNpi(null); setExpandedEventId(null); }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                <ArrowLeft size={14} /> All Providers
              </button>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">{sp.name}</h2>
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    sp.tier === 'shield' ? 'bg-green-100 text-green-700' :
                    sp.tier === 'watch' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    <Shield size={7} /> {(sp.tier || 'NONE').toUpperCase()}
                  </span>
                  {sp.widgetActive ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
                    </span>
                  ) : sp.heartbeats.length > 0 ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                      <AlertTriangle size={10} /> OFFLINE
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  NPI: {sp.npi}
                  {sp.url && <> · <a href={sp.url} target="_blank" rel="noopener" className="text-blue-500 hover:underline">{sp.url}</a></>}
                  {sp.lastSeen && <> · Last seen {timeAgo(sp.lastSeen)}</>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sp.tier === 'shield' && (
                <button onClick={() => generateDashboardToken(sp.npi)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">
                  <ExternalLink size={10} /> Generate Dashboard Link
                </button>
              )}
              {sp.dashboardToken && (
                <a href={`/dashboard/${sp.npi}?token=${sp.dashboardToken}`} target="_blank"
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg">
                  <Eye size={10} /> View Provider Dashboard
                </a>
              )}
              {sp.newCount > 0 && (
                <button onClick={() => bulkResolveProvider(sp.npi)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg">
                  <CheckCircle size={10} /> Resolve All ({sp.newCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Provider Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Events', value: sp.events.length, color: 'text-slate-800' },
            { label: 'Critical', value: sp.criticalCount, color: sp.criticalCount > 0 ? 'text-red-700' : 'text-slate-800', alert: sp.criticalCount > 0 },
            { label: 'High', value: sp.highCount, color: sp.highCount > 0 ? 'text-orange-700' : 'text-slate-800', alert: sp.highCount > 0 },
            { label: 'Open', value: sp.newCount, color: sp.newCount > 0 ? 'text-amber-700' : 'text-slate-800' },
            { label: 'Pages Tracked', value: sp.heartbeats.length, color: 'text-slate-800' },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-4 border shadow-sm ${
              stat.alert ? (stat.label === 'Critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') : 'bg-white border-slate-100'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Heartbeats */}
        {sp.heartbeats.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <Activity size={12} className="text-green-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Widget Heartbeats</span>
            </div>
            <div className="divide-y divide-slate-50">
              {sp.heartbeats.map((hb, i) => {
                const stale = Date.now() - new Date(hb.last_seen).getTime() > 48 * 60 * 60 * 1000;
                return (
                  <div key={i} className={`px-4 py-2.5 flex items-center justify-between text-xs ${stale ? 'bg-amber-50/50' : ''}`}>
                    <div className="flex items-center gap-2">
                      {stale ? <AlertTriangle size={10} className="text-amber-500" /> : <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                      <span className="font-mono text-slate-600">{hb.page_url}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${hb.widget_mode === 'shield' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {hb.widget_mode.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>{timeAgo(hb.last_seen)}</span>
                      <span>{hb.page_views_24h || 0} today</span>
                      <span>{hb.page_views_total || 0} total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Filter:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
            <button key={sev} onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                filterSeverity === sev ? 'bg-[#0A192F] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}>
              {sev === 'all' ? `All (${sp.events.length})` : `${sev} (${sp.events.filter(e => e.severity === sev).length})`}
            </button>
          ))}
        </div>

        {/* Events List */}
        {selectedEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center">
            <Shield size={28} className="mx-auto text-green-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No events match filter</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(event => {
              const isExpanded = expandedEventId === event.id;
              const sevConfig = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.medium;
              return (
                <div key={event.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${sevConfig.border}`}>
                  <div className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-3`}
                    onClick={() => setExpandedEventId(isExpanded ? null : event.id)}>
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
                      event.severity === 'critical' ? 'bg-red-500' : event.severity === 'high' ? 'bg-orange-500' :
                      event.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{CATEGORY_ICONS[event.category] || '📊'}</span>
                        <span className="text-xs font-bold text-slate-800">{CATEGORY_LABELS[event.category] || event.category}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sevConfig.bg} ${sevConfig.text}`}>{event.severity}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {DRIFT_TYPE_LABELS[event.drift_type] || event.drift_type} · <span className="font-mono">{event.page_url}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${
                        event.status === 'new' ? 'text-red-600' : event.status === 'resolved' ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {event.status === 'new' ? '● Open' : event.status === 'resolved' ? '✓ Resolved' : event.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{timeAgo(event.created_at)}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {event.content_before && (
                          <div>
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Before (Baseline)</div>
                            <div className="bg-red-50 rounded-lg p-3 text-[10px] font-mono text-red-800 max-h-28 overflow-y-auto whitespace-pre-wrap break-all">{event.content_before}</div>
                          </div>
                        )}
                        {event.content_after !== null && (
                          <div>
                            <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">After (Current)</div>
                            <div className="bg-green-50 rounded-lg p-3 text-[10px] font-mono text-green-800 max-h-28 overflow-y-auto whitespace-pre-wrap break-all">{event.content_after || '(content removed)'}</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
                        <span><strong>Hash:</strong> <code className="font-mono">{(event.previous_hash || '').substring(0, 12)}→{(event.current_hash || '').substring(0, 12)}</code></span>
                        <span><strong>Detected:</strong> {new Date(event.created_at).toLocaleString()}</span>
                        {event.resolved_at && <span><strong>Resolved:</strong> {new Date(event.resolved_at).toLocaleString()} by {event.resolved_by}</span>}
                      </div>
                      {event.status === 'new' && (
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={e2 => { e2.stopPropagation(); updateEventStatus(event.id, 'acknowledged'); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg">
                            <Eye size={10} /> Acknowledge
                          </button>
                          <button onClick={e2 => { e2.stopPropagation(); updateEventStatus(event.id, 'resolved'); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">
                            <CheckCircle size={10} /> Resolve
                          </button>
                          <button onClick={e2 => { e2.stopPropagation(); updateEventStatus(event.id, 'false_positive'); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg">
                            <EyeOff size={10} /> False Positive
                          </button>
                        </div>
                      )}
                      {event.status === 'acknowledged' && (
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={e2 => { e2.stopPropagation(); updateEventStatus(event.id, 'resolved'); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">
                            <CheckCircle size={10} /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // PROVIDER LIST VIEW (default)
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Providers</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{providerSummaries.length}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${totalCritical > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${totalCritical > 0 ? 'text-red-500' : 'text-slate-400'}`}>Critical</div>
          <div className={`text-2xl font-black mt-1 ${totalCritical > 0 ? 'text-red-700' : 'text-slate-800'}`}>{totalCritical}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${totalNew > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${totalNew > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Unresolved</div>
          <div className={`text-2xl font-black mt-1 ${totalNew > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{totalNew}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Widgets</div>
          <div className="text-2xl font-black text-green-600 mt-1">{activeWidgets}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${staleWidgets > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${staleWidgets > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Stale (48h+)</div>
          <div className={`text-2xl font-black mt-1 ${staleWidgets > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{staleWidgets}</div>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search providers by name or NPI..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Provider Cards */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <Shield size={32} className="mx-auto text-green-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">
            {searchTerm ? 'No providers match your search' : 'No monitored providers yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Drift events will appear when widgets are installed and baselines are seeded.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSummaries.map(summary => {
            const hasIssues = summary.newCount > 0;
            const borderColor = summary.criticalCount > 0 ? 'border-red-200' :
              summary.highCount > 0 ? 'border-orange-200' :
              hasIssues ? 'border-amber-200' : 'border-slate-100';

            return (
              <div key={summary.npi}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${borderColor}`}
                onClick={() => setSelectedNpi(summary.npi)}>
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Health indicator */}
                  <div className={`w-3 h-12 rounded-full flex-shrink-0 ${
                    summary.criticalCount > 0 ? 'bg-red-500' :
                    summary.highCount > 0 ? 'bg-orange-500' :
                    summary.newCount > 0 ? 'bg-amber-400' : 'bg-green-500'
                  }`} />

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 truncate">{summary.name}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        summary.tier === 'shield' ? 'bg-green-100 text-green-700' :
                        summary.tier === 'watch' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <Shield size={7} /> {(summary.tier || 'NONE').toUpperCase()}
                      </span>
                      {summary.widgetActive ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
                        </span>
                      ) : summary.heartbeats.length > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                          <AlertTriangle size={10} /> OFFLINE
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      NPI: {summary.npi}
                      {summary.lastSeen && <> · Last seen {timeAgo(summary.lastSeen)}</>}
                      {summary.heartbeats.length > 0 && <> · {summary.heartbeats.length} page{summary.heartbeats.length !== 1 ? 's' : ''} monitored</>}
                    </div>
                  </div>

                  {/* Alert counts */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {summary.criticalCount > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-black text-red-700">{summary.criticalCount}</div>
                        <div className="text-[8px] font-bold text-red-500 uppercase">Critical</div>
                      </div>
                    )}
                    {summary.highCount > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-black text-orange-700">{summary.highCount}</div>
                        <div className="text-[8px] font-bold text-orange-500 uppercase">High</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className={`text-lg font-black ${summary.newCount > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                        {summary.newCount > 0 ? summary.newCount : '✓'}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase">
                        {summary.newCount > 0 ? 'Open' : 'Clear'}
                      </div>
                    </div>
                    <div className="text-center border-l border-slate-200 pl-3">
                      <div className="text-lg font-black text-slate-600">{summary.events.length}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase">Total</div>
                    </div>

                    <ChevronDown size={16} className="text-slate-400 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
