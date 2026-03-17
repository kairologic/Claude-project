/**
 * components/dashboard/ui.tsx
 *
 * Shared UI primitives for the dashboard.
 * Badge, KPICard, WorkflowCard, AlertCard, Avatar, Tooltip
 */

'use client';

import { useState } from 'react';
import { colors, statusColors, statusBgColors, statusLabels, workflowTypeLabels, alertSeverityColors, alertSeverityLabels } from '@/lib/design-tokens';
import type { WorkflowStatus, AlertSeverity } from '@/lib/types/dashboard-schema';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: colors.navy, color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 10,
          whiteSpace: 'normal', maxWidth: 260, lineHeight: 1.4, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,.2)', pointerEvents: 'none', zIndex: 100,
        }}>{text}</span>
      )}
    </span>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ status, label }: { status: string; label?: string }) {
  const bg = statusBgColors[status as WorkflowStatus] || colors.gray100;
  const color = statusColors[status as WorkflowStatus] || colors.gray600;
  const text = label || statusLabels[status as WorkflowStatus] || status;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
      background: bg, color, display: 'inline-block', textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>{text}</span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const color = alertSeverityColors[severity] || colors.gray600;
  const label = alertSeverityLabels[severity] || severity;
  const bgMap: Record<string, string> = { action: colors.redPale, warning: colors.goldPale, info: colors.bluePale, resolved: colors.greenPale };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
      background: bgMap[severity] || colors.gray100, color, display: 'inline-block',
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{label}</span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: colors.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '0.02em', flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  count: number;
  label: string;
  status: WorkflowStatus | 'new';
  tooltip: string;
  onClick?: () => void;
}

export function KPICard({ count, label, status, tooltip, onClick }: KPICardProps) {
  const isNew = status === 'new';
  const bg = isNew ? 'rgba(214,69,69,.75)' : `${statusColors[status as WorkflowStatus]}14`;
  const numColor = isNew ? '#fff' : statusColors[status as WorkflowStatus];
  const labelColor = isNew ? 'rgba(255,255,255,.8)' : colors.gray400;
  const borderColor = isNew ? 'rgba(214,69,69,.75)' : colors.gray200;
  const hoverBorder = isNew ? colors.red : statusColors[status as WorkflowStatus];

  return (
    <Tooltip text={tooltip}>
      <button onClick={onClick} style={{
        flex: 1, background: bg, border: `1px solid ${borderColor}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
        transition: 'all .15s', minWidth: 0, fontFamily: 'inherit',
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = hoverBorder; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = borderColor; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: numColor, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          {count}
          {isNew && <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: colors.navy, marginLeft: 6, animation: 'pulse 2s infinite',
          }} />}
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: labelColor, marginTop: 4 }}>{label}</div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(.8); } }`}</style>
      </button>
    </Tooltip>
  );
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

interface WorkflowCardData {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  finding_summary: string | null;
  finding_details: any;
  priority: number;
  overdue_at: string | null;
  created_at: string;
}

interface WorkflowCardProps {
  workflow: WorkflowCardData;
  onClick?: (id: string) => void;
}

export function WorkflowCard({ workflow: wf, onClick }: WorkflowCardProps) {
  const borderColor = statusColors[wf.status as WorkflowStatus] || colors.gray400;
  const typeInfo = workflowTypeLabels[wf.workflow_type] || { label: wf.workflow_type.toUpperCase(), tooltip: '' };
  const isOverdue = wf.overdue_at && new Date(wf.overdue_at) < new Date() && wf.status === 'action_needed';
  const badgeLabel = isOverdue ? 'Overdue' : statusLabels[wf.status as WorkflowStatus] || wf.status;

  // Build description from finding_details
  const details = wf.finding_details || {};
  const field = details.field || '';
  let desc = wf.finding_summary || '';
  if (details.nppes_value && details.website_value) {
    if (field === 'address_line_1') {
      desc = `NPPES shows ${details.nppes_value} but website lists ${details.website_value}`;
    } else if (field === 'phone') {
      desc = `Phone on website (${details.website_value}) doesn't match NPPES (${details.nppes_value})`;
    } else {
      desc = `${field} mismatch: NPPES "${details.nppes_value}" vs website "${details.website_value}"`;
    }
  }
  // Truncate
  if (desc.length > 120) desc = desc.substring(0, 117) + '...';

  // Due text
  let dueText = '';
  if (isOverdue && wf.overdue_at) {
    const days = Math.floor((Date.now() - new Date(wf.overdue_at).getTime()) / 86400000);
    dueText = `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
  } else if (wf.overdue_at) {
    const days = Math.floor((new Date(wf.overdue_at).getTime() - Date.now()) / 86400000);
    dueText = days > 0 ? `Due in ${days} day${days !== 1 ? 's' : ''}` : 'Due today';
  }

  // Progress (action_needed = ~15%, in_progress = ~50%, awaiting = ~80%, resolved = 100%)
  const progressMap: Record<string, number> = { action_needed: 15, in_progress: 50, awaiting: 80, resolved: 100 };
  const progress = progressMap[wf.status] || 0;

  return (
    <div onClick={() => onClick?.(wf.id)} style={{
      background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`,
      borderLeft: `3px solid ${borderColor}`, padding: '12px 14px',
      cursor: 'pointer', transition: 'all .15s',
    }}
    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = colors.navy; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'; }}
    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = borderColor; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Tooltip text={typeInfo.tooltip}>
          <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'help' }}>{typeInfo.label}</span>
        </Tooltip>
        <Badge status={wf.status} label={badgeLabel} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.navy, marginBottom: 2 }}>
        {wf.provider_name || 'Unknown'} — {wf.finding_summary}
      </div>
      <div style={{ fontSize: 11, color: colors.gray600, marginBottom: 8, lineHeight: 1.4 }}>{desc}</div>
      {wf.status !== 'resolved' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: colors.gray200, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: borderColor, borderRadius: 2, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 10, color: colors.gray400, whiteSpace: 'nowrap' }}>{dueText}</span>
        </div>
      )}
      {wf.status === 'resolved' && (
        <div style={{ fontSize: 10, color: colors.green, fontWeight: 600 }}>Completed</div>
      )}
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardData {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  provider_name: string | null;
  created_at: string;
  is_seen?: boolean;
}

interface AlertCardProps {
  alert: AlertCardData;
  onClick?: (id: string) => void;
}

export function AlertCard({ alert: a, onClick }: AlertCardProps) {
  const sevColor = alertSeverityColors[a.severity] || colors.gray400;

  // Time ago
  const diff = Date.now() - new Date(a.created_at).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const timeAgo = days > 0 ? `${days} day${days !== 1 ? 's' : ''} ago` : hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : 'Just now';

  return (
    <div onClick={() => onClick?.(a.id)} style={{
      background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`,
      borderLeft: `3px solid ${sevColor}`, padding: '10px 14px',
      cursor: 'pointer', transition: 'all .15s', position: 'relative',
      opacity: a.is_seen ? 0.85 : 1,
    }}
    onMouseOver={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'}
    onMouseOut={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sevColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.navy }}>{a.title}</span>
          {!a.is_seen && (
            <span style={{ fontSize: 8, fontWeight: 700, background: colors.red, color: '#fff', padding: '1px 5px', borderRadius: 100 }}>NEW</span>
          )}
        </div>
        <SeverityBadge severity={a.severity} />
      </div>
      <div style={{ fontSize: 11, color: colors.gray600, marginBottom: 4, lineHeight: 1.4, paddingLeft: 13 }}>{a.description}</div>
      <div style={{ fontSize: 10, color: colors.gray400, paddingLeft: 13 }}>{timeAgo}</div>
    </div>
  );
}

// ─── Payer Sync Row ───────────────────────────────────────────────────────────

interface PayerSyncData {
  payer: string;
  status: string;
  color: string;
}

export function PayerSyncPanel({ payers }: { payers: PayerSyncData[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`, overflow: 'hidden' }}>
      {payers.map((p, i) => (
        <div key={p.payer} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 14px', borderBottom: i < payers.length - 1 ? `1px solid ${colors.gray100}` : 'none',
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: colors.navy }}>{p.payer}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: p.color,
            background: `${p.color}14`, padding: '2px 8px', borderRadius: 100,
          }}>{p.status}</span>
        </div>
      ))}
    </div>
  );
}
