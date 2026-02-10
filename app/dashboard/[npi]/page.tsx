'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  Eye, ChevronDown, ChevronUp, TrendingUp, Lock, RefreshCw,
  Bell, ArrowRight, ExternalLink
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
  content_before: string | null;
  content_after: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Heartbeat {
  npi: string;
  page_url: string;
  widget_mode: string;
  last_seen: string;
  page_views_24h: number;
  page_views_total: number;
}

interface ProviderInfo {
  name: string;
  npi: string;
  url: string;
  subscription_tier: string;
  risk_score: number;
  status_label: string;
  last_scan_timestamp: string;
  email: string;
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

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const DRIFT_TYPE_LABELS: Record<string, string> = {
  content_changed: 'Modified',
  content_removed: 'Removed',
  content_added: 'Added',
  widget_removed: 'Widget Removed',
};

export default function ShieldDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const npi = params.npi as string;
  const token = searchParams.get('token') || '';

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'resolved'>('all');

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch provider info + access check
      const provRes = await fetch(`${API_BASE}/api/shield/dashboard?npi=${npi}&token=${encodeURIComponent(token)}`);
      const provData = await provRes.json();

      if (provData.error === 'access_denied' || provData.error === 'provider_not_found') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (provData.provider) {
        setProvider(provData.provider);
      }

      // Fetch drift events
      const driftRes = await fetch(`${API_BASE}/api/widget/drift?npi=${npi}&limit=100`);
      const driftData = await driftRes.json();
      setEvents(driftData.events || []);

      // Heartbeats are included in dashboard response
      setHeartbeats(provData.heartbeats || []);

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [npi, API_BASE]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed Stats ──
  const newEvents = events.filter(e => e.status === 'new');
  const resolvedEvents = events.filter(e => e.status === 'resolved' || e.status === 'false_positive');
  const criticalCount = newEvents.filter(e => e.severity === 'critical').length;
  const highCount = newEvents.filter(e => e.severity === 'high').length;

  const filteredEvents = activeFilter === 'all' ? events :
    activeFilter === 'new' ? newEvents : resolvedEvents;

  const widgetActive = heartbeats.length > 0 &&
    (Date.now() - new Date(heartbeats[0]?.last_seen).getTime()) < 48 * 60 * 60 * 1000;

  // Compliance score trend (simplified — based on event density)
  const last30DaysEvents = events.filter(e =>
    Date.now() - new Date(e.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
  );

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }

  // ══════════════════════════════════════════════
  // ACCESS DENIED
  // ══════════════════════════════════════════════
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Shield Dashboard</h1>
          <p className="text-sm text-slate-500 mb-6">
            The compliance monitoring dashboard is available with an active Sentry Shield subscription.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Shield includes:</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Real-time compliance drift detection</li>
              <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Live monitoring dashboard</li>
              <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Instant email alerts for critical changes</li>
              <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Quarterly forensic reports</li>
              <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Annual certification seal</li>
            </ul>
          </div>
          <a
            href={`https://buy.stripe.com/test_5kQfZh1IveW058j7ZO4ko00?client_reference_id=${npi}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 bg-[#0A192F] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1a365d] transition-colors"
          >
            <Shield size={16} /> Get Sentry Shield — $79/mo
          </a>
          <p className="text-[10px] text-slate-400 mt-3">
            Already a subscriber? <a href={`mailto:support@kairologic.net?subject=Dashboard Access - NPI ${npi}`} className="text-blue-500 underline">Contact support</a>
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">Loading your compliance dashboard...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // MAIN DASHBOARD
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#1a365d] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-[#C5A059]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold">{provider?.name || `NPI: ${npi}`}</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                    <Shield size={8} /> SHIELD ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  KairoLogic Sentry Shield™ — Compliance Monitoring Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {widgetActive ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Widget Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle size={12} />
                  Widget Offline
                </span>
              )}
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance Score</span>
              <TrendingUp size={14} className="text-green-500" />
            </div>
            <div className="text-3xl font-black text-slate-800">{provider?.risk_score || '—'}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {provider?.status_label || 'Not yet scanned'}
            </div>
          </div>

          <div className={`rounded-xl p-5 border shadow-sm ${newEvents.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${newEvents.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Open Alerts</span>
              <Bell size={14} className={newEvents.length > 0 ? 'text-amber-500' : 'text-slate-400'} />
            </div>
            <div className={`text-3xl font-black ${newEvents.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {newEvents.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {criticalCount > 0 && <span className="text-red-600 font-bold">{criticalCount} critical</span>}
              {criticalCount > 0 && highCount > 0 && ' · '}
              {highCount > 0 && <span className="text-orange-600 font-bold">{highCount} high</span>}
              {criticalCount === 0 && highCount === 0 && 'No urgent issues'}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Scan</span>
              <Clock size={14} className="text-slate-400" />
            </div>
            <div className="text-lg font-black text-slate-800">
              {provider?.last_scan_timestamp
                ? timeAgo(provider.last_scan_timestamp)
                : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {provider?.last_scan_timestamp
                ? new Date(provider.last_scan_timestamp).toLocaleDateString()
                : 'No scan performed yet'}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page Views</span>
              <Activity size={14} className="text-blue-500" />
            </div>
            <div className="text-3xl font-black text-slate-800">
              {heartbeats.reduce((sum, h) => sum + (h.page_views_total || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {heartbeats.reduce((sum, h) => sum + (h.page_views_24h || 0), 0)} in last 24 hours
            </div>
          </div>
        </div>

        {/* ── Widget Status ── */}
        {heartbeats.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-green-500" /> Widget Status
              </h2>
              <span className="text-[10px] text-slate-400">
                Monitoring {heartbeats.length} page{heartbeats.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {heartbeats.map((hb, i) => {
                const isStale = Date.now() - new Date(hb.last_seen).getTime() > 48 * 60 * 60 * 1000;
                return (
                  <div key={i} className={`px-5 py-3 flex items-center justify-between ${isStale ? 'bg-amber-50/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      {isStale ? (
                        <AlertTriangle size={14} className="text-amber-500" />
                      ) : (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{hb.page_url}</div>
                        <div className="text-[10px] text-slate-400">
                          Last seen {timeAgo(hb.last_seen)} · {hb.page_views_24h || 0} views today
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold ${isStale ? 'text-amber-600' : 'text-green-600'}`}>
                      {isStale ? 'OFFLINE' : 'ACTIVE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Drift Events ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" /> Compliance Alerts
              </h2>
              <div className="flex items-center gap-1">
                {(['all', 'new', 'resolved'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      activeFilter === filter
                        ? 'bg-[#0A192F] text-white'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {filter === 'all' ? `All (${events.length})` :
                     filter === 'new' ? `Open (${newEvents.length})` :
                     `Resolved (${resolvedEvents.length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-10 text-center">
              <Shield size={36} className="mx-auto text-green-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                {activeFilter === 'new' ? 'No open alerts' : 'No compliance events yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeFilter === 'new'
                  ? 'Your website is currently compliant with all monitored categories.'
                  : 'Drift events will appear here when changes are detected on your website.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredEvents.map(event => {
                const isExpanded = expandedId === event.id;
                const sevStyle = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.medium;

                return (
                  <div key={event.id}>
                    <div
                      className="px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      {/* Severity dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        event.severity === 'critical' ? 'bg-red-500' :
                        event.severity === 'high' ? 'bg-orange-500' :
                        event.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />

                      {/* Category + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[event.category] || '📊'}</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sevStyle}`}>
                            {event.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {DRIFT_TYPE_LABELS[event.drift_type] || event.drift_type} on <code className="text-[10px] bg-slate-100 px-1 rounded">{event.page_url}</code>
                        </p>
                      </div>

                      {/* Status + time */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {event.status === 'new' ? (
                          <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle size={10} /> Open
                          </span>
                        ) : event.status === 'resolved' ? (
                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle size={10} /> Resolved
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Eye size={10} /> {event.status}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {timeAgo(event.created_at)}
                        </span>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-4 bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                          {event.content_before && (
                            <div>
                              <div className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1">Previous State</div>
                              <div className="bg-red-50 rounded-lg p-3 text-[10px] font-mono text-red-800 max-h-24 overflow-y-auto">
                                {event.content_before}
                              </div>
                            </div>
                          )}
                          {event.content_after !== null && (
                            <div>
                              <div className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-1">Current State</div>
                              <div className="bg-green-50 rounded-lg p-3 text-[10px] font-mono text-green-800 max-h-24 overflow-y-auto">
                                {event.content_after || '(content removed)'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">
                          Detected {new Date(event.created_at).toLocaleString()}
                          {event.resolved_at && ` · Resolved ${new Date(event.resolved_at).toLocaleString()}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Monitored Categories ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Eye size={14} className="text-blue-500" /> Monitored Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const categoryEvents = newEvents.filter(e => e.category === key);
              const hasIssue = categoryEvents.length > 0;
              const worstSeverity = categoryEvents.reduce((worst, e) => {
                const order = { critical: 4, high: 3, medium: 2, low: 1 };
                return (order[e.severity as keyof typeof order] || 0) > (order[worst as keyof typeof order] || 0) ? e.severity : worst;
              }, 'low');

              return (
                <div key={key} className={`rounded-lg p-3 border ${
                  hasIssue
                    ? worstSeverity === 'critical' ? 'bg-red-50 border-red-200' :
                      worstSeverity === 'high' ? 'bg-orange-50 border-orange-200' :
                      'bg-amber-50 border-amber-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[key]}</span>
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                    </div>
                    {hasIssue ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${SEVERITY_STYLES[worstSeverity]}`}>
                        {categoryEvents.length} alert{categoryEvents.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <CheckCircle size={14} className="text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
            <Shield size={14} className="text-[#C5A059]" />
            <span className="text-xs font-bold">KairoLogic Sentry Shield™</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Continuous compliance monitoring for TX SB 1188 & HB 149
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href={`${API_BASE}/scan/results?npi=${npi}&mode=verified`} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
              View Full Report <ExternalLink size={8} />
            </a>
            <a href="mailto:support@kairologic.net" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
              Contact Support <ArrowRight size={8} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
