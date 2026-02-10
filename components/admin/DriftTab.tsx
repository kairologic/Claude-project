'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Shield, Activity,
  ChevronDown, ChevronUp, Filter, RefreshCw, Eye, EyeOff,
  ArrowUpRight, Bell, BellOff, Search, X, AlertCircle
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
  ai_disclosure: '🤖',
  privacy_policy: '🔒',
  third_party_scripts: '📜',
  data_collection_forms: '📋',
  cookie_consent: '🍪',
  hipaa_references: '🏥',
  meta_compliance: '🏷️',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  new: { label: 'New', icon: AlertCircle, color: 'text-red-600' },
  acknowledged: { label: 'Acknowledged', icon: Eye, color: 'text-amber-600' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-600' },
  false_positive: { label: 'False Positive', icon: EyeOff, color: 'text-slate-500' },
};

const DRIFT_TYPE_LABELS: Record<string, string> = {
  content_changed: 'Content Modified',
  content_removed: 'Content Removed',
  content_added: 'New Content Detected',
  widget_removed: 'Widget Removed',
  baseline_reset: 'Baseline Reset',
};

export function DriftTab({ showNotification }: DriftTabProps) {
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterNpi, setFilterNpi] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, new: 0, activeWidgets: 0, staleWidgets: 0 });

  const supabase = getSupabase();

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Drift events
      const { data: driftData, error: driftErr } = await supabase
        .from('drift_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (driftErr) throw driftErr;
      setEvents(driftData || []);

      // Heartbeats
      const { data: hbData, error: hbErr } = await supabase
        .from('widget_heartbeats')
        .select('*')
        .order('last_seen', { ascending: false });

      if (hbErr) throw hbErr;
      setHeartbeats(hbData || []);

      // Get unique NPIs from events + heartbeats
      const allNpis = new Set<string>();
      (driftData || []).forEach(e => allNpis.add(e.npi));
      (hbData || []).forEach(h => allNpis.add(h.npi));

      if (allNpis.size > 0) {
        const { data: provData } = await supabase
          .from('registry')
          .select('npi, name, url, subscription_tier')
          .in('npi', Array.from(allNpis));

        const provMap: Record<string, ProviderInfo> = {};
        (provData || []).forEach(p => { provMap[p.npi] = p; });
        setProviders(provMap);
      }

      // Calculate stats
      const now = Date.now();
      const staleThreshold = 48 * 60 * 60 * 1000; // 48 hours
      const activeHb = (hbData || []).filter(h => now - new Date(h.last_seen).getTime() < staleThreshold);
      const staleHb = (hbData || []).filter(h => now - new Date(h.last_seen).getTime() >= staleThreshold);

      setStats({
        total: (driftData || []).length,
        critical: (driftData || []).filter(e => e.severity === 'critical' && e.status === 'new').length,
        high: (driftData || []).filter(e => e.severity === 'high' && e.status === 'new').length,
        new: (driftData || []).filter(e => e.status === 'new').length,
        activeWidgets: activeHb.length,
        staleWidgets: staleHb.length,
      });

    } catch (err: any) {
      showNotification(err.message || 'Failed to load drift data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotification]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Update Event Status ──
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'false_positive') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = 'admin';
      }

      const { error } = await supabase
        .from('drift_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      showNotification(`Event marked as ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Update failed', 'error');
    }
  };

  // ── Bulk Actions ──
  const bulkResolve = async (npi: string) => {
    try {
      const { error } = await supabase
        .from('drift_events')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: 'admin' })
        .eq('npi', npi)
        .eq('status', 'new');

      if (error) throw error;
      showNotification(`All new events for NPI ${npi} resolved`);
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Bulk resolve failed', 'error');
    }
  };

  // ── Filter Events ──
  const filteredEvents = events.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (filterNpi && e.npi !== filterNpi) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const provName = (providers[e.npi]?.name || '').toLowerCase();
      return e.npi.includes(term) || provName.includes(term) || e.category.includes(term);
    }
    return true;
  });

  // ── Group by NPI for summary view ──
  const npiSummary = events.reduce((acc, e) => {
    if (!acc[e.npi]) acc[e.npi] = { total: 0, new: 0, critical: 0, high: 0, categories: new Set() };
    acc[e.npi].total++;
    if (e.status === 'new') acc[e.npi].new++;
    if (e.severity === 'critical' && e.status === 'new') acc[e.npi].critical++;
    if (e.severity === 'high' && e.status === 'new') acc[e.npi].high++;
    acc[e.npi].categories.add(e.category);
    return acc;
  }, {} as Record<string, { total: number; new: number; critical: number; high: number; categories: Set<string> }>);

  // ── Time Ago ──
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

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  return (
    <div className="space-y-4">

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${stats.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-xs font-bold uppercase tracking-wider ${stats.critical > 0 ? 'text-red-500' : 'text-slate-400'}`}>Critical</div>
          <div className={`text-2xl font-black mt-1 ${stats.critical > 0 ? 'text-red-700' : 'text-slate-800'}`}>{stats.critical}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${stats.high > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-xs font-bold uppercase tracking-wider ${stats.high > 0 ? 'text-orange-500' : 'text-slate-400'}`}>High</div>
          <div className={`text-2xl font-black mt-1 ${stats.high > 0 ? 'text-orange-700' : 'text-slate-800'}`}>{stats.high}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unresolved</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.new}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Widgets</div>
          <div className="text-2xl font-black text-green-600 mt-1">{stats.activeWidgets}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${stats.staleWidgets > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-xs font-bold uppercase tracking-wider ${stats.staleWidgets > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Stale (48h+)</div>
          <div className={`text-2xl font-black mt-1 ${stats.staleWidgets > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{stats.staleWidgets}</div>
        </div>
      </div>

      {/* ── Widget Heartbeats ── */}
      {heartbeats.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-green-500" /> Widget Heartbeats
            </h3>
            <span className="text-[10px] text-slate-400">{heartbeats.length} widgets tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="text-left px-4 py-2">Provider</th>
                  <th className="text-left px-4 py-2">Page</th>
                  <th className="text-left px-4 py-2">Mode</th>
                  <th className="text-left px-4 py-2">Last Seen</th>
                  <th className="text-right px-4 py-2">Views (24h)</th>
                  <th className="text-right px-4 py-2">Total Views</th>
                  <th className="text-center px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {heartbeats.map(hb => {
                  const isStale = Date.now() - new Date(hb.last_seen).getTime() > 48 * 60 * 60 * 1000;
                  const provName = providers[hb.npi]?.name || hb.npi;
                  return (
                    <tr key={hb.id} className={`border-b border-slate-50 hover:bg-slate-50 ${isStale ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{provName}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{hb.page_url}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${hb.widget_mode === 'shield' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          <Shield size={8} /> {hb.widget_mode.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{timeAgo(hb.last_seen)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{hb.page_views_24h || 0}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{hb.page_views_total || 0}</td>
                      <td className="px-4 py-2.5 text-center">
                        {isStale ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-bold">
                            <AlertTriangle size={10} /> STALE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by NPI, provider name, or category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">🔴 New</option>
            <option value="acknowledged">🟡 Acknowledged</option>
            <option value="resolved">🟢 Resolved</option>
            <option value="false_positive">⚪ False Positive</option>
          </select>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-400">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* ── Drift Events List ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Loading drift events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <Shield size={32} className="mx-auto text-green-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No drift events found</p>
          <p className="text-xs text-slate-400 mt-1">
            {filterStatus !== 'all' || filterSeverity !== 'all' ? 'Try adjusting your filters' : 'All monitored providers are stable'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map(event => {
            const isExpanded = expandedId === event.id;
            const sevConfig = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.medium;
            const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.new;
            const StatusIcon = statusConfig.icon;
            const provName = providers[event.npi]?.name || `NPI: ${event.npi}`;
            const provTier = providers[event.npi]?.subscription_tier || 'none';

            return (
              <div key={event.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${sevConfig.border}`}>
                {/* Event Header */}
                <div
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-3`}
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  {/* Severity indicator */}
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'high' ? 'bg-orange-500' :
                    event.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />

                  {/* Category icon + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[event.category] || '📊'}</span>
                      <span className="text-xs font-bold text-slate-800">
                        {CATEGORY_LABELS[event.category] || event.category}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sevConfig.bg} ${sevConfig.text}`}>
                        {event.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold truncate">{provName}</span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[10px] text-slate-400">{DRIFT_TYPE_LABELS[event.drift_type] || event.drift_type}</span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[10px] text-slate-400 font-mono">{event.page_url}</span>
                    </div>
                  </div>

                  {/* Status + time */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${statusConfig.color}`}>
                      <StatusIcon size={10} /> {statusConfig.label}
                    </span>
                    {provTier !== 'none' && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        provTier === 'shield' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Shield size={7} /> {provTier.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {/* Content Before */}
                      {event.content_before && (
                        <div>
                          <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Before (Baseline)</div>
                          <div className="bg-red-50 rounded-lg p-3 text-[10px] font-mono text-red-800 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                            {event.content_before || '(empty)'}
                          </div>
                        </div>
                      )}

                      {/* Content After */}
                      {event.content_after !== null && (
                        <div>
                          <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">After (Current)</div>
                          <div className="bg-green-50 rounded-lg p-3 text-[10px] font-mono text-green-800 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                            {event.content_after || '(empty — content removed)'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
                      <span><strong>NPI:</strong> {event.npi}</span>
                      <span><strong>Page:</strong> {event.page_url}</span>
                      <span><strong>Previous Hash:</strong> <code className="font-mono">{(event.previous_hash || 'none').substring(0, 12)}...</code></span>
                      <span><strong>Current Hash:</strong> <code className="font-mono">{(event.current_hash || 'none').substring(0, 12)}...</code></span>
                      <span><strong>Detected:</strong> {new Date(event.created_at).toLocaleString()}</span>
                      {event.resolved_at && <span><strong>Resolved:</strong> {new Date(event.resolved_at).toLocaleString()} by {event.resolved_by}</span>}
                    </div>

                    {/* Actions */}
                    {event.status === 'new' && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(event.id, 'acknowledged'); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors"
                        >
                          <Eye size={10} /> Acknowledge
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(event.id, 'resolved'); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                        >
                          <CheckCircle size={10} /> Resolve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(event.id, 'false_positive'); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <EyeOff size={10} /> False Positive
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); bulkResolve(event.npi); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Resolve All for {providers[event.npi]?.name || event.npi}
                        </button>
                      </div>
                    )}
                    {event.status === 'acknowledged' && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(event.id, 'resolved'); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                        >
                          <CheckCircle size={10} /> Resolve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(event.id, 'false_positive'); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <EyeOff size={10} /> False Positive
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
