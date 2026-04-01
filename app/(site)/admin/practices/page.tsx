'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────

interface PracticeHealth {
  id: string;
  name: string | null;
  url: string;
  npi: string | null;
  state: string | null;
  city: string | null;
  organization_id: string | null;
  status: 'active' | 'pending' | 'error' | 'unclaimed';
  claimed_at: string | null;
  scan_status: string;
  last_scan_at: string | null;
  scan_tier: string;
  consecutive_errors: number;
  provider_count: number;
  mismatch_count: number;
  accepted_payers: string[] | null;
  providers_total: number;
  providers_active: number;
  providers_unverified: number;
  providers_departed: number;
  delta_events_total: number;
  delta_events_unresolved: number;
  payer_snapshots_total: number;
  payer_snapshots_listed: number;
  payer_snapshots_not_listed: number;
  payer_mismatches_open: number;
  last_payer_sync_at: string | null;
  workflows_total: number;
  workflows_action_needed: number;
  workflows_resolved: number;
  alerts_total: number;
  alerts_unread: number;
  dashboard_issues: { type: string; severity: string; message: string }[];
}

// ── Colors (inline to match existing admin patterns) ──────

const C = {
  navy: '#0F1E2E', navyMid: '#1A3249', navyLight: '#8BA3B8',
  gold: '#D4A017', goldPale: '#FDF6E3',
  green: '#1A9E6D', greenPale: '#E6F7F2',
  red: '#D64545', redPale: '#FDEEEE',
  blue: '#185FA5', bluePale: '#EEF4FF',
  gray100: '#F4F5F7', gray200: '#E8EAED', gray400: '#9AA3AE', gray600: '#5A6472',
  white: '#FFFFFF',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: C.greenPale, text: C.green,  dot: C.green },
  pending:   { bg: C.goldPale,  text: C.gold,   dot: C.gold },
  error:     { bg: C.redPale,   text: C.red,    dot: C.red },
  unclaimed: { bg: C.bluePale,  text: C.blue,   dot: C.blue },
};

// ── Main Page Component ───────────────────────────────────

export default function AdminPracticesPage() {
  const router = useRouter();
  const [practices, setPractices] = useState<PracticeHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'unclaimed' | 'error'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'name' | 'providers' | 'status' | 'last_scan'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Auth check
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin');
    }
  }, [router]);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const fetchPractices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/practice-health');
      if (res.ok) {
        const data = await res.json();
        if (data.practices) {
          setPractices(data.practices);
          return;
        }
      }
      // Fallback: query practice_websites directly if API auth fails
      const fallback = await fetch(
        `${SUPABASE_URL}/rest/v1/practice_websites?select=*&order=name.asc&limit=500`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (!fallback.ok) {
        throw new Error('Failed to load practices');
      }
      const rows = await fallback.json();
      const mapped: PracticeHealth[] = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        npi: r.npi,
        state: r.state,
        city: r.city ?? null,
        organization_id: r.organization_id ?? null,
        status: r.organization_id ? 'active' : 'unclaimed',
        claimed_at: r.claimed_at ?? null,
        scan_status: r.scan_status || 'pending',
        last_scan_at: r.last_scan_at ?? null,
        scan_tier: r.scan_tier || 'standard',
        consecutive_errors: r.consecutive_errors || 0,
        provider_count: r.provider_count || 0,
        mismatch_count: r.mismatch_count || 0,
        accepted_payers: r.accepted_payers ?? null,
        providers_total: r.provider_count || 0,
        providers_active: r.provider_count || 0,
        providers_unverified: 0,
        providers_departed: 0,
        delta_events_total: 0,
        delta_events_unresolved: 0,
        payer_snapshots_total: 0,
        payer_snapshots_listed: 0,
        payer_snapshots_not_listed: r.mismatch_count || 0,
        payer_mismatches_open: r.mismatch_count || 0,
        last_payer_sync_at: null,
        workflows_total: 0,
        workflows_action_needed: 0,
        workflows_resolved: 0,
        alerts_total: 0,
        alerts_unread: 0,
        dashboard_issues: [],
      }));
      setPractices(mapped);
    } catch (err) {
      setError('Failed to load practices');
    } finally {
      setLoading(false);
    }
  }, [SUPABASE_URL, SUPABASE_ANON]);

  useEffect(() => { fetchPractices(); }, [fetchPractices]);

  // ── Filter + Search ──
  const filtered = practices.filter(p => {
    if (filter !== 'all' && p.status !== filter) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q) ||
        (p.npi || '').includes(q) ||
        (p.state || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Sort ──
  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = (a.name || '').localeCompare(b.name || '');
    else if (sortCol === 'providers') cmp = a.providers_active - b.providers_active;
    else if (sortCol === 'status') cmp = (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1);
    else if (sortCol === 'last_scan') {
      const ta = a.last_scan_at ? new Date(a.last_scan_at).getTime() : 0;
      const tb = b.last_scan_at ? new Date(b.last_scan_at).getTime() : 0;
      cmp = ta - tb;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ── Actions ──
  const triggerAction = async (practiceId: string, action: 'scan' | 'payer_sync' | 'both') => {
    setActionLoading(`${practiceId}_${action}`);
    try {
      const res = await fetch('/api/admin/practice-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, action }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh after a short delay
        setTimeout(fetchPractices, 1000);
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  // ── Stats ──
  const stats = {
    total: practices.length,
    active: practices.filter(p => p.status === 'active').length,
    unclaimed: practices.filter(p => p.status === 'unclaimed').length,
    errors: practices.filter(p => p.status === 'error').length,
    withIssues: practices.filter(p => p.dashboard_issues.some(i => i.severity === 'error' || i.severity === 'warning')).length,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.gray100 }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: 0 }}>Practice Management</h1>
          <p style={{ fontSize: 13, color: C.gray400, margin: '4px 0 0' }}>Monitor health, issues, and onboarding across all practices</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: C.gold, color: C.navy, border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          + Add Practice
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ padding: '20px 32px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: stats.total, color: C.navy, filterVal: 'all' as const },
          { label: 'Active', value: stats.active, color: C.green, filterVal: 'active' as const },
          { label: 'Unclaimed', value: stats.unclaimed, color: C.blue, filterVal: 'unclaimed' as const },
          { label: 'Errors', value: stats.errors, color: C.red, filterVal: 'error' as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.filterVal)}
            style={{
              background: filter === s.filterVal ? C.navy : C.white,
              color: filter === s.filterVal ? C.white : C.navy,
              border: `1px solid ${C.gray200}`,
              borderRadius: 10, padding: '12px 24px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: filter === s.filterVal ? C.gold : s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.label}</span>
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search by name, URL, NPI, city, or state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 10,
              border: `1px solid ${C.gray200}`, fontSize: 14, outline: 'none',
              background: C.white,
            }}
          />
        </div>
      </div>

      {/* Practice Grid */}
      <div style={{ padding: '0 32px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray400 }}>Loading practices...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.red }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray400 }}>
            {practices.length === 0 ? 'No practices found. Add one to get started.' : 'No practices match your filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Column Headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 90px 90px 90px 90px 90px 110px 70px',
              padding: '8px 20px', gap: 8,
            }}>
              {([
                ['name', 'Name'],
                ['providers', 'Providers'],
                ['status', 'Status'],
                ['last_scan', 'Last Scan'],
                [null, 'Payer Listed'],
                [null, 'Open'],
                [null, 'Issues'],
                [null, ''],
              ] as [typeof sortCol | null, string][]).map(([col, label]) => (
                <div key={label} style={{ textAlign: col === 'name' ? 'left' : 'center' }}>
                  {col ? (
                    <button
                      onClick={() => toggleSort(col)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700, color: sortCol === col ? C.navy : C.gray400,
                        padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}
                    >
                      {label}
                      <span style={{ fontSize: 10, color: sortCol === col ? C.navy : C.gray200 }}>
                        {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(p => (
                <PracticeRow
                  key={p.id}
                  practice={p}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onAction={triggerAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Practice Modal */}
      {showAddModal && (
        <AddPracticeModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchPractices(); }}
        />
      )}
    </div>
  );
}

// ── Practice Row Component ────────────────────────────────

function PracticeRow({
  practice: p,
  expanded,
  onToggle,
  onAction,
  actionLoading,
}: {
  practice: PracticeHealth;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: string, action: 'scan' | 'payer_sync' | 'both') => void;
  actionLoading: string | null;
}) {
  const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
  const hasIssues = p.dashboard_issues.length > 0;
  const errorIssues = p.dashboard_issues.filter(i => i.severity === 'error');
  const warnIssues = p.dashboard_issues.filter(i => i.severity === 'warning');

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
      {/* Summary Row */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '2fr 90px 90px 90px 90px 90px 110px 70px',
          alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 8,
        }}
      >
        {/* Name + URL + NPI */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: C.navy, fontSize: 15 }}>{p.name || 'Unnamed'}</span>
            {(p.city || p.state) && <span style={{ fontSize: 11, color: C.gray400, fontWeight: 500 }}>{[p.city, p.state].filter(Boolean).join(', ')}</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, marginLeft: 16 }}>
            <span style={{ fontSize: 12, color: C.gray400 }}>{p.url?.replace(/https?:\/\//, '').replace(/\/$/, '')}</span>
            {p.npi && <span style={{ fontSize: 12, color: C.navyLight }}>NPI: {p.npi}</span>}
          </div>
        </div>

        {/* Providers */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: 600, color: C.navy, fontSize: 16 }}>{p.providers_active}</span>
        </div>

        {/* Status (Live / Unclaimed) */}
        <div style={{ textAlign: 'center' }}>
          {p.status === 'active' ? (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 700, background: C.greenPale, color: C.green }}>
              Live
            </span>
          ) : p.status === 'error' ? (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 700, background: '#FEE2E2', color: C.red }}>
              Error
            </span>
          ) : (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 700, background: C.gray200, color: C.gray600 }}>
              Unclaimed
            </span>
          )}
        </div>

        {/* Scan */}
        <div style={{ textAlign: 'center' }}>
          <ScanBadge status={p.scan_status} />
          <div style={{ fontSize: 10, color: C.gray400, marginTop: 2 }}>
            {p.last_scan_at ? timeAgo(p.last_scan_at) : 'Never'}
          </div>
        </div>

        {/* Payer Sync */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: 600, color: p.payer_snapshots_not_listed > 0 ? C.red : C.green, fontSize: 14 }}>
            {p.payer_snapshots_listed}/{p.payer_snapshots_total || 0}
          </span>
          <div style={{ fontSize: 10, color: C.gray400 }}>Listed</div>
        </div>

        {/* Mismatches */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontWeight: 600, fontSize: 14,
            color: p.payer_mismatches_open > 0 ? C.red : p.delta_events_unresolved > 0 ? C.gold : C.green,
          }}>
            {p.payer_mismatches_open + p.delta_events_unresolved}
          </span>
          <div style={{ fontSize: 10, color: C.gray400 }}>Open</div>
        </div>

        {/* Issues */}
        <div style={{ textAlign: 'center' }}>
          {errorIssues.length > 0 && (
            <span style={{ background: C.redPale, color: C.red, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              {errorIssues.length} error{errorIssues.length > 1 ? 's' : ''}
            </span>
          )}
          {warnIssues.length > 0 && errorIssues.length === 0 && (
            <span style={{ background: C.goldPale, color: C.gold, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              {warnIssues.length} warn
            </span>
          )}
          {!hasIssues && (
            <span style={{ color: C.green, fontSize: 13 }}>✓</span>
          )}
        </div>

        {/* Expand */}
        <div style={{ textAlign: 'center', color: C.gray400, fontSize: 18 }}>
          {expanded ? '▾' : '▸'}
        </div>
      </div>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.gray200}`, padding: 20, background: C.gray100 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Providers Section */}
            <DetailCard title="Providers" icon="👥">
              <DetailRow label="Active" value={p.providers_active} color={C.green} />
              <DetailRow label="Unverified" value={p.providers_unverified} color={C.gold} />
              <DetailRow label="Departed" value={p.providers_departed} color={C.gray400} />
              <DetailRow label="Total" value={p.providers_total} color={C.navy} bold />
            </DetailCard>

            {/* Delta Events */}
            <DetailCard title="Delta Events" icon="📊">
              <DetailRow label="Total detected" value={p.delta_events_total} color={C.navy} />
              <DetailRow label="Unresolved" value={p.delta_events_unresolved} color={p.delta_events_unresolved > 0 ? C.red : C.green} />
              <DetailRow label="Workflows" value={p.workflows_total} color={C.navy} />
              <DetailRow label="Action needed" value={p.workflows_action_needed} color={p.workflows_action_needed > 0 ? C.gold : C.green} />
            </DetailCard>

            {/* Payer Directory */}
            <DetailCard title="Payer Directory" icon="🏥">
              <DetailRow label="Snapshots" value={p.payer_snapshots_total} color={C.navy} />
              <DetailRow label="Listed" value={p.payer_snapshots_listed} color={C.green} />
              <DetailRow label="Not listed" value={p.payer_snapshots_not_listed} color={p.payer_snapshots_not_listed > 0 ? C.red : C.green} />
              <DetailRow label="Open mismatches" value={p.payer_mismatches_open} color={p.payer_mismatches_open > 0 ? C.red : C.green} />
              {p.accepted_payers && p.accepted_payers.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {p.accepted_payers.map(code => (
                    <span key={code} style={{ fontSize: 10, background: C.bluePale, color: C.blue, padding: '2px 6px', borderRadius: 6, fontWeight: 500 }}>
                      {code.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </DetailCard>
          </div>

          {/* Dashboard Issues */}
          {p.dashboard_issues.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 8 }}>DASHBOARD ISSUES</div>
              {p.dashboard_issues.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                  fontSize: 13, color: issue.severity === 'error' ? C.red : issue.severity === 'warning' ? C.gold : C.gray600,
                }}>
                  <span>{issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️'}</span>
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ActionButton
              label="Run Scan"
              loading={actionLoading === `${p.id}_scan`}
              onClick={() => onAction(p.id, 'scan')}
              color={C.navy}
            />
            <ActionButton
              label="Payer Sync"
              loading={actionLoading === `${p.id}_payer_sync`}
              onClick={() => onAction(p.id, 'payer_sync')}
              color={C.blue}
            />
            <ActionButton
              label="Scan + Sync"
              loading={actionLoading === `${p.id}_both`}
              onClick={() => onAction(p.id, 'both')}
              color={C.gold}
              textColor={C.navy}
            />
            <a
              href={`/admin/practices/${p.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: C.greenPale, color: C.green, textDecoration: 'none',
                border: `1px solid ${C.green}`,
              }}
            >
              Admin Detail →
            </a>
            <a
              href={`/practice/${p.organization_id || p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'transparent', color: C.gray600, textDecoration: 'none',
                border: `1px solid ${C.gray400}`,
              }}
            >
              User Dashboard ↗
            </a>
            <span style={{ flex: 1 }} />
            <span style={{
              fontSize: 12, color: C.gray400, alignSelf: 'center',
            }}>
              {p.status === 'active' ? `Claimed ${p.claimed_at ? timeAgo(p.claimed_at) : ''}` : p.status.toUpperCase()}
              {' · '}
              ID: {p.id.substring(0, 8)}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-Components ────────────────────────────────────────

function DetailCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, borderRadius: 10, padding: 16, border: `1px solid ${C.gray200}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 10 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
      <span style={{ color: C.gray600 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color }}>{value}</span>
    </div>
  );
}

function ScanBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    healthy:     { bg: C.greenPale, color: C.green,  label: 'Healthy' },
    pending:     { bg: C.goldPale,  color: C.gold,   label: 'Pending' },
    error:       { bg: C.redPale,   color: C.red,    label: 'Error' },
    unreachable: { bg: C.redPale,   color: C.red,    label: 'Unreachable' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ActionButton({
  label, loading, onClick, color, textColor,
}: {
  label: string; loading: boolean; onClick: () => void; color: string; textColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: color, color: textColor || C.white, border: 'none', cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}

// ── Add Practice Modal ────────────────────────────────────

function AddPracticeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [npi, setNpi] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/practice-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npi: npi.trim() || null, url: url.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(data.message);
        setTimeout(onAdded, 1500);
      } else {
        setError(data.error || 'Failed to add practice');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,30,46,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div
        style={{ background: C.white, borderRadius: 16, padding: 32, maxWidth: 480, width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 8px', color: C.navy, fontSize: 20, fontWeight: 700 }}>Add Practice</h2>
        <p style={{ margin: '0 0 24px', color: C.gray600, fontSize: 14 }}>
          Enter NPI and website URL. NPPES data will be pulled automatically.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
              NPI
            </label>
            <input
              type="text"
              value={npi}
              onChange={e => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 1234567890"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                border: `1px solid ${C.gray200}`, fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
              Website URL *
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g. www.example-practice.com"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                border: `1px solid ${C.gray200}`, fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ background: C.redPale, color: C.red, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: C.greenPale, color: C.green, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray600, cursor: 'pointer', fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: C.gold, color: C.navy, fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Adding...' : 'Add Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Utils ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
