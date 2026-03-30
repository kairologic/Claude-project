/**
 * components/dashboard/ui.tsx
 *
 * Shared UI primitives for the dashboard.
 * Badge, KPICard, WorkflowCard, AlertCard, Avatar, Tooltip
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { colors, statusColors, statusBgColors, statusLabels, workflowTypeLabels, alertSeverityColors, alertSeverityLabels, shadows, transitions, radii, keyframes, spacing, typography } from '@/lib/design-tokens';
import type { WorkflowStatus, AlertSeverity } from '@/lib/types/dashboard-schema';

// ─── Global Keyframes Injection ──────────────────────────────────────────────

let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.id = 'kl-keyframes';
  style.textContent = [
    keyframes.fadeIn, keyframes.fadeInUp, keyframes.fadeInDown,
    keyframes.slideInRight, keyframes.scaleIn, keyframes.pulse,
    keyframes.shimmer, keyframes.countUp, keyframes.spin,
    // Focus ring for keyboard users only
    `:focus-visible { outline: 2px solid ${colors.blue}; outline-offset: 2px; }`,
    `button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid ${colors.blue}; outline-offset: 2px; }`,
  ].join('\n');
  document.head.appendChild(style);
}

// ─── Animated Number (counts up on mount) ────────────────────────────────────

export function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    injectKeyframes();
    const start = performance.now();
    const from = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <>{display}</>;
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 20, color }: { size?: number; color?: string }) {
  useEffect(() => { injectKeyframes(); }, []);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${colors.gray200}`,
      borderTopColor: color || colors.navy,
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} role="status" aria-label="Loading" />
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

export function Skeleton({ width, height = 16, radius = radii.sm, style: extraStyle }: {
  width?: number | string; height?: number; radius?: number; style?: React.CSSProperties;
}) {
  useEffect(() => { injectKeyframes(); }, []);
  return (
    <div aria-hidden="true" style={{
      width: width || '100%', height, borderRadius: radius,
      background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite',
      ...extraStyle,
    }} />
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon?: string; title: string; description?: string;
  action?: { label: string; onClick: () => void };
}) {
  useEffect(() => { injectKeyframes(); }, []);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', animation: 'fadeInUp 0.4s ease-out',
    }}>
      {icon && <div style={{ fontSize: 36, marginBottom: spacing.md, opacity: 0.7 }}>{icon}</div>}
      <div style={{ ...typography.h3, color: colors.navy, marginBottom: spacing.xs, textAlign: 'center' }}>{title}</div>
      {description && (
        <div style={{ ...typography.bodySmall, color: colors.gray400, textAlign: 'center', maxWidth: 320 }}>{description}</div>
      )}
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: spacing.lg, padding: '8px 20px', fontSize: 12, fontWeight: 600,
          border: `1px solid ${colors.navy}`, borderRadius: radii.md,
          background: 'transparent', color: colors.navy, cursor: 'pointer',
          fontFamily: 'inherit', transition: transitions.fast,
        }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = colors.navy; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navy; }}
        >{action.label}</button>
      )}
    </div>
  );
}

// ─── Staggered List Wrapper ──────────────────────────────────────────────────

export function StaggeredList({ children, staggerMs = 40 }: { children: React.ReactNode[]; staggerMs?: number }) {
  useEffect(() => { injectKeyframes(); }, []);
  return (
    <>
      {children.map((child, i) => (
        <div key={i} style={{
          animation: `fadeInUp 0.35s ease-out ${i * staggerMs}ms both`,
        }}>{child}</div>
      ))}
    </>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => { injectKeyframes(); }, []);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: colors.navy, color: '#fff', padding: '6px 12px', borderRadius: radii.md,
          ...typography.caption, whiteSpace: 'normal', maxWidth: 260,
          boxShadow: shadows.lg, pointerEvents: 'none', zIndex: 100,
          animation: 'fadeInDown 0.15s ease-out',
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
      ...typography.label, padding: '3px 10px', borderRadius: radii.full,
      background: bg, color, display: 'inline-block',
    }}>{text}</span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const color = alertSeverityColors[severity] || colors.gray600;
  const label = alertSeverityLabels[severity] || severity;
  const bgMap: Record<string, string> = { action: colors.redPale, warning: colors.goldPale, info: colors.bluePale, resolved: colors.greenPale };
  return (
    <span style={{
      ...typography.label, padding: '3px 10px', borderRadius: radii.full,
      background: bgMap[severity] || colors.gray100, color, display: 'inline-block',
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
  useEffect(() => { injectKeyframes(); }, []);
  const isNew = status === 'new';
  const bg = isNew ? 'rgba(214,69,69,.75)' : `${statusColors[status as WorkflowStatus]}14`;
  const numColor = isNew ? '#fff' : statusColors[status as WorkflowStatus];
  const labelColor = isNew ? 'rgba(255,255,255,.8)' : colors.gray400;
  const borderColor = isNew ? 'rgba(214,69,69,.75)' : colors.gray200;
  const hoverBorder = isNew ? colors.red : statusColors[status as WorkflowStatus];

  return (
    <Tooltip text={tooltip}>
      <button onClick={onClick} aria-label={`${label}: ${count}`} style={{
        flex: 1, background: bg, border: `1px solid ${borderColor}`,
        borderRadius: radii.lg, padding: `${spacing.lg}px ${spacing.lg}px`,
        cursor: 'pointer', textAlign: 'left' as const,
        transition: `all ${transitions.fast}`, minWidth: 0, fontFamily: 'inherit',
        boxShadow: shadows.xs,
      }}
      onMouseOver={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = hoverBorder;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = shadows.md;
      }}
      onMouseOut={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = borderColor;
        el.style.transform = 'none';
        el.style.boxShadow = shadows.xs;
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: numColor, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          <AnimatedNumber value={count} />
          {isNew && <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: colors.navy, marginLeft: 6, animation: 'pulse 2s infinite',
          }} />}
        </div>
        <div style={{ ...typography.label, color: labelColor, marginTop: spacing.xs, letterSpacing: '0.06em' }}>{label}</div>
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
  let dueColor: string = colors.gray600;
  if (isOverdue && wf.overdue_at) {
    const days = Math.floor((Date.now() - new Date(wf.overdue_at).getTime()) / 86400000);
    dueText = `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
    dueColor = colors.red;
  } else if (wf.overdue_at) {
    const days = Math.floor((new Date(wf.overdue_at).getTime() - Date.now()) / 86400000);
    dueText = days > 0 ? `Due in ${days} day${days !== 1 ? 's' : ''}` : 'Due today';
    dueColor = days <= 7 ? colors.gold : colors.gray600;
  }

  // Progress (action_needed = ~15%, in_progress = ~50%, awaiting = ~80%, resolved = 100%)
  const progressMap: Record<string, number> = { action_needed: 15, in_progress: 50, awaiting: 80, resolved: 100 };
  const progress = progressMap[wf.status] || 0;

  return (
    <div onClick={() => onClick?.(wf.id)} role="button" tabIndex={0} aria-label={`${typeInfo.label} workflow for ${wf.provider_name || 'Unknown'}`}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(wf.id); } }}
    style={{
      background: '#fff', borderRadius: radii.lg, border: `1px solid ${colors.gray200}`,
      borderLeft: `3px solid ${borderColor}`, padding: `${spacing.md}px ${spacing.lg}px`,
      cursor: 'pointer', transition: `all ${transitions.fast}`, boxShadow: shadows.xs,
    }}
    onMouseOver={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderLeftColor = colors.navy; el.style.boxShadow = shadows.md;
      el.style.transform = 'translateY(-1px)';
    }}
    onMouseOut={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderLeftColor = borderColor; el.style.boxShadow = shadows.xs;
      el.style.transform = 'none';
    }}>
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
          <span style={{ fontSize: 10, fontWeight: 600, color: dueColor, whiteSpace: 'nowrap' }}>{dueText}</span>
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
    <div onClick={() => onClick?.(a.id)} role="button" tabIndex={0} aria-label={`${a.severity} alert: ${a.title}`}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(a.id); } }}
    style={{
      background: '#fff', borderRadius: radii.lg, border: `1px solid ${colors.gray200}`,
      borderLeft: `3px solid ${sevColor}`, padding: `${spacing.sm}px ${spacing.lg}px`,
      cursor: 'pointer', transition: `all ${transitions.fast}`, position: 'relative',
      opacity: a.is_seen ? 0.75 : 1, boxShadow: shadows.xs,
    }}
    onMouseOver={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.boxShadow = shadows.md; el.style.transform = 'translateY(-1px)';
      el.style.opacity = '1';
    }}
    onMouseOut={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.boxShadow = shadows.xs; el.style.transform = 'none';
      el.style.opacity = a.is_seen ? '0.75' : '1';
    }}>
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
    <div style={{ background: '#fff', borderRadius: radii.lg, border: `1px solid ${colors.gray200}`, overflow: 'hidden', boxShadow: shadows.xs }}>
      {payers.map((p, i) => (
        <div key={p.payer} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: `${spacing.sm}px ${spacing.lg}px`,
          borderBottom: i < payers.length - 1 ? `1px solid ${colors.gray100}` : 'none',
          transition: `background ${transitions.fast}`,
        }}
        onMouseOver={e => (e.currentTarget as HTMLElement).style.background = colors.gray50}
        onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <span style={{ ...typography.body, color: colors.navy }}>{p.payer}</span>
          <span style={{
            ...typography.label, color: p.color,
            background: `${p.color}14`, padding: '3px 10px', borderRadius: radii.full,
          }}>{p.status}</span>
        </div>
      ))}
    </div>
  );
}
