'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface Provider {
  npi: string; name: string; url: string; city: string; zip: string;
  email: string; risk_score: number; risk_level: string;
  widget_status: string; subscription_status: string; subscription_tier: string;
  last_scan_timestamp: string; latest_report_url: string; updated_at: string;
  dashboard_token: string;
}

interface CategoryScore {
  name: string; score: number; percentage: number; level: string;
  passed: number; failed: number;
}

interface BorderMapEntry {
  domain: string; ip?: string; country: string; countryCode: string;
  city: string; isSovereign: boolean; purpose?: string;
}

interface ScanRecord {
  id: string; scan_date: string; risk_score: number;
  risk_level: string; scan_type: string; findings_count: number;
}

interface CheckResult {
  id: string; check_id: string; check_name: string; category: string;
  status: string; severity: string; detail: string;
  npi_value?: string; site_value?: string; recommendation?: string;
  created_at: string;
}

interface MismatchAlert {
  id: string; npi: string; dimension: string; check_id: string;
  severity: string; npi_value: string; site_value: string;
  delta_detail: string; status: string; risk_score: number;
  first_seen: string; last_seen: string; occurrence_count: number;
}

interface DriftEvent {
  id: string; type: string; severity: string; title: string;
  description: string; timestamp: string; resolved: boolean;
  category?: string; page_url?: string;
}

interface DashboardData {
  provider: Provider;
  categories: Record<string, CategoryScore>;
  borderMap: BorderMapEntry[];
  scanHistory: ScanRecord[];
  checkResults: CheckResult[];
  mismatchAlerts: MismatchAlert[];
  driftEvents: DriftEvent[];
  subscription: {
    tier: string; status: string; is_trial: boolean;
    trial_end: string | null; trial_days_remaining: number;
  };
}

type TabKey = 'overview' | 'npi-integrity' | 'border-map' | 'drift' | 'scan-history' | 'documents' | 'settings';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function getTier(score: number | null) {
  if (!score || score === 0) return { label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
  if (score >= 80) return { label: 'Sovereign', color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
  if (score >= 60) return { label: 'Drift', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  return { label: 'Violation', color: '#f87171', bg: 'rgba(248,113,113,0.1)' };
}

function timeAgo(d: string | null): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 1 ? 'Just now' : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function severityColor(s: string) {
  if (s === 'critical') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400' };
  if (s === 'high') return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400' };
  if (s === 'medium') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' };
  return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' };
}

function isShield(data: DashboardData | null): boolean {
  return data?.subscription?.tier === 'shield';
}

function isWatch(data: DashboardData | null): boolean {
  return data?.subscription?.tier === 'watch';
}

// ═══════════════════════════════════════════════════════════
// INLINE SVG ICONS
// ═══════════════════════════════════════════════════════════
const icons = {
  shield: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
  alert: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  check: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  x: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  clock: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  map: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3Z"/><path d="m9 4v13"/><path d="m15 7v13"/></svg>,
  activity: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>,
  file: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>,
  settings: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  bar: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>,
  lock: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  refresh: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  globe: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
  user: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  download: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  copy: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
};

// ═══════════════════════════════════════════════════════════
// NAV CONFIG
// ═══════════════════════════════════════════════════════════
const NAV_ITEMS: { key: TabKey; label: string; icon: (c?: string, s?: number) => JSX.Element; shieldOnly?: boolean }[] = [
  { key: 'overview', label: 'Dashboard', icon: icons.bar },
  { key: 'npi-integrity', label: 'NPI Integrity', icon: icons.user },
  { key: 'border-map', label: 'Data Border Map', icon: icons.map },
  { key: 'drift', label: 'Drift Monitor', icon: icons.activity, shieldOnly: true },
  { key: 'scan-history', label: 'Scan History', icon: icons.clock },
  { key: 'documents', label: 'Documents', icon: icons.file },
  { key: 'settings', label: 'Settings', icon: icons.settings },
];

// ═══════════════════════════════════════════════════════════
// LOCKED PANEL (for Watch-tier users on Shield features)
// ═══════════════════════════════════════════════════════════
function LockedPanel({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mb-4 text-slate-500">{icons.lock('#64748b', 32)}</div>
      <h3 className="text-white font-bold text-base mb-2">{feature} — Shield Only</h3>
      <p className="text-slate-400 text-sm mb-4">Upgrade to Sentry Shield for live monitoring, drift detection, and real-time alerts.</p>
      <a href="/#services" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
        Upgrade to Shield — $79/mo
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
function OverviewTab({ data }: { data: DashboardData }) {
  const score = data.provider.risk_score || 0;
  const tier = getTier(score);
  const cats = data.categories || {};
  const openAlerts = [
    ...data.mismatchAlerts.filter(a => a.status === 'open'),
    ...data.driftEvents.filter(e => !e.resolved),
  ];
  const recentScans = (data.scanHistory || []).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Score + Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Ring */}
        <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                <circle cx="48" cy="48" r="40" fill="none" stroke={tier.color} strokeWidth="7"
                  strokeDasharray={`${(score / 100) * 251.3} 251.3`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{score}</span>
                <span className="text-[9px] text-slate-500">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-sm mb-1">Composite Score</div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                {tier.label}
              </span>
              <div className="text-slate-500 text-[10px] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Last scan: {timeAgo(data.provider.last_scan_timestamp)}
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        {[
          { key: 'data_sovereignty', label: 'Data Residency', sub: 'SB 1188' },
          { key: 'ai_transparency', label: 'AI Transparency', sub: 'HB 149' },
        ].map(cat => {
          const c = cats[cat.key];
          const pct = c?.percentage ?? 0;
          const t = getTier(pct);
          return (
            <div key={cat.key} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-white font-bold text-sm">{cat.label}</div>
                  <div className="text-slate-500 text-[10px]">{cat.sub}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black" style={{ color: t.color }}>{pct}%</div>
                  <span className="text-[9px] font-bold" style={{ color: t.color }}>{t.label}</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.color }} />
              </div>
              {c && (
                <div className="flex gap-3 mt-2 text-[10px]">
                  <span className="text-emerald-400">{c.passed} passed</span>
                  {c.failed > 0 && <span className="text-red-400">{c.failed} failed</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Open Alerts */}
      {openAlerts.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-bold text-sm">Open Alerts ({openAlerts.length})</div>
            <span className="text-[10px] text-slate-500">Requires attention</span>
          </div>
          <div className="space-y-2">
            {openAlerts.slice(0, 5).map((alert, i) => {
              const sev = severityColor('dimension' in alert ? alert.severity : (alert as DriftEvent).severity);
              const title = 'dimension' in alert
                ? (alert as MismatchAlert).delta_detail
                : (alert as DriftEvent).title;
              const time = 'dimension' in alert
                ? (alert as MismatchAlert).last_seen
                : (alert as DriftEvent).timestamp;
              return (
                <div key={i} className={`flex items-center gap-3 rounded-lg p-3 ${sev.bg} border ${sev.border}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold truncate ${sev.text}`}>{title}</div>
                    <div className="text-slate-500 text-[10px]">{timeAgo(time)}</div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase ${sev.text}`}>
                    {'dimension' in alert ? (alert as MismatchAlert).severity : (alert as DriftEvent).severity}
                  </span>
                </div>
              );
            })}
            {openAlerts.length > 5 && (
              <p className="text-slate-500 text-xs text-center pt-1">+ {openAlerts.length - 5} more alerts</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Scans */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white font-bold text-sm mb-3">Recent Scans</div>
        {recentScans.length === 0 ? (
          <p className="text-slate-500 text-sm">No scan history yet.</p>
        ) : (
          <div className="space-y-2">
            {recentScans.map((s, i) => {
              const t = getTier(s.risk_score);
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold" style={{ color: t.color }}>{s.risk_score}</span>
                    <span className="text-slate-400 text-xs">{s.scan_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px]">{s.findings_count} findings</span>
                    <span className="text-slate-600 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(s.scan_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NPI INTEGRITY TAB
// ═══════════════════════════════════════════════════════════
function NpiIntegrityTab({ data }: { data: DashboardData }) {
  const npiChecks = (data.checkResults || []).filter(c => c.category === 'npi-integrity' || c.check_id?.startsWith('NPI'));
  const rosterChecks = (data.checkResults || []).filter(c => c.category === 'provider-roster' || c.check_id?.startsWith('RST'));
  const alerts = data.mismatchAlerts || [];
  const shield = isShield(data);

  return (
    <div className="space-y-5">
      {/* NPI Check Results */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white font-bold text-sm">NPI Registry Verification</div>
          <div className="text-slate-500 text-[10px]">Comparing NPPES data against your website</div>
        </div>

        {npiChecks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No NPI integrity checks have been run yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {npiChecks.map((check, i) => {
              const passed = check.status === 'pass';
              const sev = severityColor(check.severity || 'medium');
              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={passed ? 'text-emerald-400' : 'text-red-400'}>
                        {passed ? icons.check('#34d399') : icons.x('#f87171')}
                      </span>
                      <span className="text-white text-sm font-semibold">{check.check_name || check.check_id}</span>
                      <span className="text-slate-600 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{check.check_id}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${sev.bg} ${sev.text} border ${sev.border}`}>
                      {check.status}
                    </span>
                  </div>

                  {/* Side-by-side comparison */}
                  {(check.npi_value || check.site_value) && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">NPI Registry</div>
                        <div className="text-slate-300 text-xs">{check.npi_value || '—'}</div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Your Website</div>
                        <div className="text-slate-300 text-xs">{check.site_value || '—'}</div>
                      </div>
                    </div>
                  )}

                  {check.detail && (
                    <p className="text-slate-400 text-xs mt-2">{check.detail}</p>
                  )}
                  {check.recommendation && (
                    <p className="text-emerald-400/70 text-xs mt-1">💡 {check.recommendation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provider Roster */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white font-bold text-sm">Provider Roster Integrity</div>
          <div className="text-slate-500 text-[10px]">Credentialing & directory consistency</div>
        </div>

        {!shield ? (
          <div className="p-6">
            <LockedPanel feature="Provider Roster Monitoring" />
          </div>
        ) : rosterChecks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No roster checks have been run yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {rosterChecks.map((check, i) => {
              const passed = check.status === 'pass';
              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={passed ? 'text-emerald-400' : 'text-amber-400'}>
                      {passed ? icons.check('#34d399') : icons.alert('#fbbf24')}
                    </span>
                    <span className="text-white text-sm font-semibold">{check.check_name || check.check_id}</span>
                  </div>
                  {check.detail && <p className="text-slate-400 text-xs mt-2 ml-6">{check.detail}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mismatch Alerts Timeline */}
      {alerts.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-white font-bold text-sm">Mismatch History</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {alerts.map((a, i) => {
              const sev = severityColor(a.severity);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                  <div className="flex-1">
                    <div className={`text-xs font-semibold ${sev.text}`}>{a.delta_detail}</div>
                    <div className="text-slate-500 text-[10px]">{a.dimension} &middot; {a.check_id} &middot; Seen {a.occurrence_count}x</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${a.status === 'open' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {a.status}
                  </span>
                  <span className="text-slate-600 text-[10px]">{timeAgo(a.last_seen)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BORDER MAP TAB
// ═══════════════════════════════════════════════════════════
function BorderMapTab({ data }: { data: DashboardData }) {
  const entries = data.borderMap || [];
  const sovereign = entries.filter(e => e.isSovereign).length;
  const foreign = entries.filter(e => !e.isSovereign).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <div className="text-3xl font-black text-emerald-400">{sovereign}</div>
          <div className="text-emerald-400/60 text-xs">US-Sovereign Endpoints</div>
        </div>
        <div className="rounded-xl p-5" style={{ background: foreign > 0 ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)', border: `1px solid ${foreign > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}` }}>
          <div className={`text-3xl font-black ${foreign > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{foreign}</div>
          <div className={`text-xs ${foreign > 0 ? 'text-red-400/60' : 'text-emerald-400/60'}`}>Foreign Endpoints</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: "'JetBrains Mono', monospace" }}>
          <div className="col-span-3">Domain</div>
          <div className="col-span-2">Country</div>
          <div className="col-span-2">City</div>
          <div className="col-span-2">Purpose</div>
          <div className="col-span-3 text-right">Status</div>
        </div>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No border map data available yet.</div>
        ) : (
          entries.map((e, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3 items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="col-span-3 text-white text-xs font-medium truncate">{e.domain}</div>
              <div className="col-span-2 text-slate-400 text-xs">{e.country} {e.countryCode && `(${e.countryCode})`}</div>
              <div className="col-span-2 text-slate-400 text-xs">{e.city || '—'}</div>
              <div className="col-span-2 text-slate-500 text-xs">{e.purpose || '—'}</div>
              <div className="col-span-3 text-right">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                  e.isSovereign ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {e.isSovereign ? '🇺🇸 US Sovereign' : `⚠️ ${e.country}`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DRIFT MONITOR TAB
// ═══════════════════════════════════════════════════════════
function DriftTab({ data }: { data: DashboardData }) {
  if (!isShield(data)) return <LockedPanel feature="Drift Monitor" />;

  const events = [
    ...data.driftEvents.map(e => ({ ...e, source: 'drift' as const })),
    ...data.mismatchAlerts.map(a => ({
      id: a.id, type: a.dimension, severity: a.severity,
      title: a.delta_detail, description: `${a.check_id}: NPI says "${a.npi_value}" but website shows "${a.site_value}"`,
      timestamp: a.last_seen, resolved: a.status !== 'open', source: 'mismatch' as const,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white font-bold text-sm">Compliance Drift Timeline</div>
          <div className="text-slate-500 text-[10px]">Changes detected between scans</div>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-emerald-400 mb-2">{icons.check('#34d399', 24)}</div>
            <p className="text-slate-400 text-sm">No drift events detected. Your compliance posture is stable.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {events.map((e, i) => {
              const sev = severityColor(e.severity);
              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sev.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${sev.text}`}>{e.title}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>{e.severity}</span>
                        {e.resolved && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">RESOLVED</span>}
                      </div>
                      {e.description && <p className="text-slate-400 text-xs mt-1">{e.description}</p>}
                    </div>
                    <span className="text-slate-600 text-[10px] flex-shrink-0">{timeAgo(e.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCAN HISTORY TAB
// ═══════════════════════════════════════════════════════════
function ScanHistoryTab({ data }: { data: DashboardData }) {
  const scans = data.scanHistory || [];
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white font-bold text-sm">Scan History</div>
      </div>
      {scans.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No scans recorded yet.</div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {scans.map((s, i) => {
            const t = getTier(s.risk_score);
            return (
              <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3 items-center">
                <div className="col-span-2">
                  <span className="text-lg font-black" style={{ color: t.color }}>{s.risk_score}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: t.bg, color: t.color }}>{t.label}</span>
                </div>
                <div className="col-span-2 text-slate-400 text-xs">{s.scan_type}</div>
                <div className="col-span-2 text-slate-400 text-xs">{s.findings_count} findings</div>
                <div className="col-span-4 text-right text-slate-500 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(s.scan_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════
function DocumentsTab({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      {data.provider.latest_report_url ? (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icons.file('#34d399')}
              <div>
                <div className="text-white font-bold text-sm">Compliance Audit Report</div>
                <div className="text-slate-500 text-[10px]">Generated {timeAgo(data.provider.last_scan_timestamp)}</div>
              </div>
            </div>
            <a href={data.provider.latest_report_url} target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-emerald-400"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              {icons.download('#34d399')} Download PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-slate-500 text-sm">No reports generated yet. Your first audit report will appear here after a full scan.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function SettingsTab({ data }: { data: DashboardData }) {
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="https://kairologic.net/sentry.js" data-npi="${data.provider.npi}" data-mode="${data.subscription.tier === 'shield' ? 'shield' : 'watch'}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Widget Embed */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white font-bold text-sm mb-1">Widget Embed Code</div>
        <p className="text-slate-500 text-xs mb-3">Add this to your website's HTML, just before the closing &lt;/body&gt; tag.</p>
        <div className="relative">
          <pre className="rounded-lg p-4 text-xs text-emerald-300 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'JetBrains Mono', monospace" }}>
            {embedCode}
          </pre>
          <button onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
            {copied ? icons.check('#34d399') : icons.copy()}
          </button>
        </div>
        {copied && <p className="text-emerald-400 text-xs mt-2">Copied to clipboard!</p>}
      </div>

      {/* Subscription Info */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white font-bold text-sm mb-3">Subscription</div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-500 mb-0.5">Plan</div>
            <div className="text-white font-bold capitalize">{data.subscription.tier || 'None'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Status</div>
            <div className="text-white font-bold capitalize">{data.subscription.status}</div>
          </div>
          {data.subscription.is_trial && (
            <>
              <div>
                <div className="text-slate-500 mb-0.5">Trial Ends</div>
                <div className="text-amber-400 font-bold">{data.subscription.trial_end ? new Date(data.subscription.trial_end).toLocaleDateString() : '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Days Remaining</div>
                <div className="text-amber-400 font-bold">{data.subscription.trial_days_remaining}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD (inner component)
// ═══════════════════════════════════════════════════════════
function DashboardInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const npi = params?.npi as string;
  const token = searchParams?.get('token') || '';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const loadDashboard = useCallback(async () => {
    if (!npi) return;
    try {
      setLoading(true);
      const supabase = getSupabase();

      // Verify token
      const { data: provider, error: pErr } = await supabase
        .from('registry')
        .select('*')
        .eq('npi', npi)
        .single();

      if (pErr || !provider) { setError('Provider not found.'); return; }
      if (provider.dashboard_token !== token) { setError('access_denied'); return; }

      // Load check results
      const { data: checks } = await supabase
        .from('check_results')
        .select('*')
        .eq('npi', npi)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load mismatch alerts
      const { data: mismatches } = await supabase
        .from('mismatch_alerts')
        .select('*')
        .eq('npi', npi)
        .order('last_seen', { ascending: false })
        .limit(50);

      // Load drift events
      const { data: drifts } = await supabase
        .from('drift_events')
        .select('*')
        .eq('npi', npi)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load scan sessions
      const { data: scans } = await supabase
        .from('scan_sessions')
        .select('*')
        .eq('npi', npi)
        .order('created_at', { ascending: false })
        .limit(20);

      // Build category scores from last scan result
      const lastScan = provider.last_scan_result || {};
      const catScores = lastScan.category_scores || lastScan.categoryScores || {};

      // Build border map from last scan
      const borderMap = lastScan.border_map || lastScan.borderMap || [];

      // Determine subscription
      const sub = {
        tier: provider.subscription_tier || 'none',
        status: provider.subscription_status || 'inactive',
        is_trial: false,
        trial_end: null as string | null,
        trial_days_remaining: 0,
      };

      setData({
        provider,
        categories: catScores,
        borderMap,
        scanHistory: (scans || []).map((s: any) => ({
          id: s.id,
          scan_date: s.created_at,
          risk_score: s.risk_score || 0,
          risk_level: s.risk_level || '',
          scan_type: s.triggered_by || 'manual',
          findings_count: (s.pass_count || 0) + (s.fail_count || 0) + (s.warn_count || 0),
        })),
        checkResults: checks || [],
        mismatchAlerts: mismatches || [],
        driftEvents: (drifts || []).map((d: any) => ({
          id: d.id,
          type: d.drift_type || d.type || '',
          severity: d.severity || 'medium',
          title: d.category || d.drift_type || 'Change detected',
          description: d.content_after ? `Content changed on ${d.page_url || 'unknown page'}` : '',
          timestamp: d.created_at,
          resolved: d.status === 'resolved',
          category: d.category,
          page_url: d.page_url,
        })),
        subscription: sub,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [npi, token]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1b' }}>
        <div className="text-center">
          <div className="text-slate-500 mb-3">{icons.refresh('#64748b', 24)}</div>
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── ACCESS DENIED ──
  if (error === 'access_denied') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1b' }}>
        <div className="text-center max-w-md">
          <div className="mb-4">{icons.lock('#64748b', 40)}</div>
          <h1 className="text-white text-xl font-bold mb-2">Dashboard Access Restricted</h1>
          <p className="text-slate-400 text-sm mb-6">
            This dashboard requires a valid access token. If you're a KairoLogic subscriber, check your email for the dashboard link or contact support.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-emerald-400"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            Go to KairoLogic Home
          </Link>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1b' }}>
        <div className="text-center">
          <p className="text-red-400 text-sm">{error || 'Failed to load dashboard data.'}</p>
          <button onClick={loadDashboard} className="mt-3 text-emerald-400 text-xs hover:underline">Try again</button>
        </div>
      </div>
    );
  }

  // ── Count open alerts ──
  const openCritical = [
    ...data.mismatchAlerts.filter(a => a.status === 'open' && a.severity === 'critical'),
    ...data.driftEvents.filter(e => !e.resolved && e.severity === 'critical'),
  ].length;
  const openHigh = [
    ...data.mismatchAlerts.filter(a => a.status === 'open' && a.severity === 'high'),
    ...data.driftEvents.filter(e => !e.resolved && e.severity === 'high'),
  ].length;
  const totalOpen = [
    ...data.mismatchAlerts.filter(a => a.status === 'open'),
    ...data.driftEvents.filter(e => !e.resolved),
  ].length;

  // ═══ RENDER ═══
  return (
    <div className="min-h-screen" style={{ background: '#070d1b' }}>
      {/* ── CRITICAL ALERT BANNER ── */}
      {(openCritical > 0 || openHigh > 0) && (
        <div className="px-4 py-3" style={{ background: openCritical > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)', borderBottom: `1px solid ${openCritical > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <span className={openCritical > 0 ? 'text-red-400' : 'text-amber-400'}>{icons.alert(openCritical > 0 ? '#f87171' : '#fbbf24', 18)}</span>
            <span className={`text-sm font-semibold ${openCritical > 0 ? 'text-red-300' : 'text-amber-300'}`}>
              {totalOpen} open alert{totalOpen !== 1 ? 's' : ''}
              {openCritical > 0 && ` — ${openCritical} critical`}
              {openHigh > 0 && ` — ${openHigh} high severity`}
            </span>
            <button onClick={() => setActiveTab('npi-integrity')}
              className={`ml-auto text-xs font-bold px-3 py-1 rounded-lg ${openCritical > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              View Details
            </button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
              {icons.shield('#34d399', 18)}
            </div>
            <div>
              <h1 className="text-white font-bold text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>{data.provider.name}</h1>
              <div className="text-slate-500 text-[10px] flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span>NPI: {data.provider.npi}</span>
                <span>&middot;</span>
                <span className={`font-bold uppercase ${isShield(data) ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {data.subscription.tier || 'Free'}
                </span>
              </div>
            </div>
          </div>
          <Link href="/" className="text-slate-500 hover:text-white text-xs transition-colors">&larr; Home</Link>
        </div>
      </div>

      {/* ── LAYOUT: SIDEBAR + CONTENT ── */}
      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <nav className="w-52 flex-shrink-0 py-4 pr-4 hidden md:block" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="space-y-0.5 sticky top-4">
            {NAV_ITEMS.map(item => {
              const locked = item.shieldOnly && !isShield(data);
              return (
                <button
                  key={item.key}
                  onClick={() => !locked && setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                    activeTab === item.key
                      ? 'bg-white/10 text-white'
                      : locked
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={activeTab === item.key ? 'text-emerald-400' : locked ? 'text-slate-600' : 'text-slate-500'}>
                    {item.icon(activeTab === item.key ? '#34d399' : locked ? '#334155' : '#64748b')}
                  </span>
                  {item.label}
                  {locked && <span className="ml-auto text-slate-600">{icons.lock('#334155', 12)}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden w-full overflow-x-auto border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1 px-4 py-2">
            {NAV_ITEMS.filter(i => !i.shieldOnly || isShield(data)).map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  activeTab === item.key ? 'bg-white/10 text-white' : 'text-slate-500'
                }`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 py-5 px-4 md:pl-6 min-w-0">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'npi-integrity' && <NpiIntegrityTab data={data} />}
          {activeTab === 'border-map' && <BorderMapTab data={data} />}
          {activeTab === 'drift' && <DriftTab data={data} />}
          {activeTab === 'scan-history' && <ScanHistoryTab data={data} />}
          {activeTab === 'documents' && <DocumentsTab data={data} />}
          {activeTab === 'settings' && <SettingsTab data={data} />}
        </main>
      </div>

      {/* ── FOOTER ── */}
      <div className="max-w-6xl mx-auto px-4 py-6 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-slate-600 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Powered by KairoLogic Sentry {isShield(data) ? 'Shield' : 'Watch'}™ &middot; &copy; {new Date().getFullYear()} KairoLogic
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXPORT WITH SUSPENSE BOUNDARY
// ═══════════════════════════════════════════════════════════
export default function ShieldDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1b' }}>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
