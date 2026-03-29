'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────

interface PracticeHealth {
  id: string;
  name: string | null;
  url: string;
  npi: string | null;
  state: string | null;
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
  dashboard_issues: DashboardIssue[];
}

interface DashboardIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// ── Design tokens (matching admin theme) ──────────────────
const navy = '#0F1E2E';
const gold = '#D4A017';
const green = '#1A9E6D';
const red = '#D64545';
const gray100 = '#f3f4f6';
const gray200 = '#e5e7eb';
const gray400 = '#9ca3af';
const gray600 = '#4b5563';
const gray800 = '#1f2937';

// ── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function severityColor(sev: string): string {
  return sev === 'error' ? red : sev === 'warning' ? gold : '#3b82f6';
}

function statusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'active': return { bg: '#dcfce7', text: green, label: 'Active' };
    case 'unclaimed': return { bg: '#fef3c7', text: '#92400e', label: 'Unclaimed' };
    case 'error': return { bg: '#fee2e2', text: red, label: 'Error' };
    default: return { bg: gray200, text: gray600, label: status };
  }
}

function scanStatusBadge(s: string): { bg: string; text: string } {
  if (s === 'completed' || s === 'success') return { bg: '#dcfce7', text: green };
  if (s === 'pending') return { bg: '#fef3c7', text: '#92400e' };
  if (s === 'error' || s === 'unreachable') return { bg: '#fee2e2', text: red };
  return { bg: gray200, text: gray600 };
}

// ── Component ─────────────────────────────────────────────
export default function AdminPracticeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as string;

  const [practice, setPractice] = useState<PracticeHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const auth = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth');
    if (!auth) router.push('/admin');
  }, [router]);

  const fetchPractice = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/practice-health?id=${practiceId}`);
      const data = await res.json();
      if (data.practices?.length > 0) {
        setPractice(data.practices[0]);
      } else {
        setError('Practice not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  useEffect(() => {
    fetchPractice();
  }, [fetchPractice]);

  const triggerAction = async (action: 'scan' | 'payer_sync' | 'both') => {
    setActionLoading(action);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/practice-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, action }),
      });
      const data = await res.json();
      setActionMessage(data.message || 'Action queued');
      // Refresh data after short delay
      setTimeout(fetchPractice, 2000);
    } catch (err) {
      setActionMessage('Failed to trigger action');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: gold, fontSize: 18 }}>Loading practice...</div>
      </div>
    );
  }

  if (error || !practice) {
    return (
      <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: red, fontSize: 18 }}>{error || 'Practice not found'}</div>
        <button onClick={() => router.push('/admin/practices')} style={{ color: gold, background: 'none', border: `1px solid ${gold}`, padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
          ← Back to Practices
        </button>
      </div>
    );
  }

  const p = practice;
  const badge = statusBadge(p.status);
  const scanBadge = scanStatusBadge(p.scan_status);

  return (
    <div style={{ minHeight: '100vh', background: navy, color: '#e2e8f0' }}>
      {/* ── Admin toolbar ─────────────────────────────────── */}
      <div style={{ background: '#1a2940', borderBottom: `2px solid ${gold}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/admin/practices')}
            style={{ color: gold, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            ← Practices
          </button>
          <span style={{ color: gray400, fontSize: 12 }}>|</span>
          <span style={{ color: gold, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>SENTRY CONTROL CENTER</span>
          <span style={{ color: gray400, fontSize: 12 }}>|</span>
          <span style={{ color: '#e2e8f0', fontSize: 14 }}>Practice Detail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: '#991b1b',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
          }}>ADMIN VIEW</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* ── Practice header ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
              {p.name || 'Unnamed Practice'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ background: badge.bg, color: badge.text, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {badge.label}
              </span>
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none' }}>
                {p.url} ↗
              </a>
              {p.npi && <span style={{ color: gray400, fontSize: 13 }}>NPI: {p.npi}</span>}
              {p.state && <span style={{ color: gray400, fontSize: 13 }}>State: {p.state}</span>}
              {p.organization_id && <span style={{ color: gray400, fontSize: 12 }}>Org: {p.organization_id.slice(0, 8)}…</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {(['scan', 'payer_sync', 'both'] as const).map((action) => (
              <button
                key={action}
                onClick={() => triggerAction(action)}
                disabled={actionLoading !== null}
                style={{
                  background: action === 'both' ? gold : 'transparent',
                  color: action === 'both' ? navy : gold,
                  border: `1px solid ${gold}`,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: actionLoading ? 'wait' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading === action ? '...' : action === 'scan' ? 'Run Scan' : action === 'payer_sync' ? 'Payer Sync' : 'Scan + Sync'}
              </button>
            ))}
          </div>
        </div>

        {actionMessage && (
          <div style={{ background: '#065f46', border: `1px solid ${green}`, padding: '8px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13, color: '#d1fae5' }}>
            {actionMessage}
          </div>
        )}

        {/* ── Dashboard Issues ─────────────────────────────── */}
        {p.dashboard_issues.length > 0 && (
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 16, marginBottom: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: gold, fontWeight: 600 }}>Dashboard Issues</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.dashboard_issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0' }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: severityColor(issue.severity),
                    flexShrink: 0,
                  }} />
                  <span>{issue.message}</span>
                  <span style={{ color: gray400, fontSize: 11, marginLeft: 'auto' }}>{issue.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats Grid ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Scan Health Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Scan Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Status</span>
                <span style={{ background: scanBadge.bg, color: scanBadge.text, padding: '1px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  {p.scan_status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Last Scan</span>
                <span>{timeAgo(p.last_scan_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Tier</span>
                <span>{p.scan_tier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Consecutive Errors</span>
                <span style={{ color: p.consecutive_errors > 0 ? red : 'inherit' }}>{p.consecutive_errors}</span>
              </div>
            </div>
          </div>

          {/* Providers Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Providers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{p.providers_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Active</span>
                <span style={{ color: green }}>{p.providers_active}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Unverified</span>
                <span style={{ color: p.providers_unverified > 0 ? gold : 'inherit' }}>{p.providers_unverified}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Departed</span>
                <span style={{ color: p.providers_departed > 0 ? red : 'inherit' }}>{p.providers_departed}</span>
              </div>
            </div>
          </div>

          {/* Delta Events Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>NPPES Delta Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Total Events</span>
                <span>{p.delta_events_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Unresolved</span>
                <span style={{ color: p.delta_events_unresolved > 0 ? red : green, fontWeight: 700 }}>
                  {p.delta_events_unresolved}
                </span>
              </div>
              {p.delta_events_total > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 4, background: '#1e3a5f', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(((p.delta_events_total - p.delta_events_unresolved) / p.delta_events_total) * 100)}%`,
                      background: green,
                      borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: gray400, marginTop: 4 }}>
                    {Math.round(((p.delta_events_total - p.delta_events_unresolved) / p.delta_events_total) * 100)}% resolved
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payer Directory Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Payer Directory</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Snapshots</span>
                <span>{p.payer_snapshots_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Listed</span>
                <span style={{ color: green }}>{p.payer_snapshots_listed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Not Listed</span>
                <span style={{ color: p.payer_snapshots_not_listed > 0 ? red : 'inherit' }}>{p.payer_snapshots_not_listed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Open Mismatches</span>
                <span style={{ color: p.payer_mismatches_open > 0 ? gold : green, fontWeight: 600 }}>
                  {p.payer_mismatches_open}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Last Sync</span>
                <span>{timeAgo(p.last_payer_sync_at)}</span>
              </div>
            </div>
          </div>

          {/* Workflows Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Workflows</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Total</span>
                <span>{p.workflows_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Action Needed</span>
                <span style={{ color: p.workflows_action_needed > 0 ? red : green, fontWeight: 700 }}>
                  {p.workflows_action_needed}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Resolved</span>
                <span style={{ color: green }}>{p.workflows_resolved}</span>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Alerts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Total</span>
                <span>{p.alerts_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: gray400 }}>Unread</span>
                <span style={{ color: p.alerts_unread > 0 ? gold : green, fontWeight: 700 }}>
                  {p.alerts_unread}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Accepted Payers ─────────────────────────────── */}
        {p.accepted_payers && p.accepted_payers.length > 0 && (
          <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, marginBottom: 24, border: `1px solid ${gray600}33` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>
              Accepted Payers (from website)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.accepted_payers.map((payer: string) => (
                <span key={payer} style={{
                  background: '#1e3a5f',
                  color: '#93c5fd',
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  {payer}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Links ─────────────────────────────────── */}
        <div style={{ background: '#1a2940', borderRadius: 8, padding: 20, border: `1px solid ${gray600}33` }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: gold, fontWeight: 600 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a
              href={`/practice/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: gold,
                color: navy,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              View Practice Dashboard ↗
            </a>
            <a
              href={`/practice/${p.id}/roster`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: gold,
                border: `1px solid ${gold}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Provider Roster ↗
            </a>
            <a
              href={`/practice/${p.id}/payer-directory`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: gold,
                border: `1px solid ${gold}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Payer Directory ↗
            </a>
            <a
              href={`/practice/${p.id}/workflows`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: gold,
                border: `1px solid ${gold}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Workflows ↗
            </a>
            <a
              href={`/practice/${p.id}/alerts`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: gold,
                border: `1px solid ${gold}`,
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Alerts ↗
            </a>
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'transparent',
                  color: '#93c5fd',
                  border: '1px solid #93c5fd',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Visit Website ↗
              </a>
            )}
          </div>
        </div>

        {/* ── Claim Info ──────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: '12px 20px', background: '#0d1925', borderRadius: 8, border: `1px solid ${gray600}22`, fontSize: 12, color: gray400 }}>
          <strong style={{ color: gray600 }}>Internal:</strong>{' '}
          Practice ID: <code style={{ color: '#93c5fd' }}>{p.id}</code>
          {p.organization_id && <> · Org ID: <code style={{ color: '#93c5fd' }}>{p.organization_id}</code></>}
          {p.claimed_at && <> · Claimed: {new Date(p.claimed_at).toLocaleDateString()}</>}
        </div>
      </div>
    </div>
  );
}
