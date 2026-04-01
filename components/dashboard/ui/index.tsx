'use client';

import { ReactNode, useState } from 'react';
import {
  colors,
  statusColors,
  statusBgColors,
  statusLabels,
  workflowTypeLabels,
  alertSeverityColors,
} from '@/lib/design-tokens';
import VerificationBadge from '@/components/workflows/VerificationBadge';

// ─────────────────────────────────────────────────────────────────────────────
// KPICard
// ─────────────────────────────────────────────────────────────────────────────

interface KPICardProps {
  count: number;
  label: string;
  status: 'new' | 'action_needed' | 'in_progress' | 'awaiting' | 'resolved';
  tooltip?: string;
  onClick: () => void;
}

const KPI_STATUS_COLORS: Record<string, string> = {
  new: colors.blue,
  action_needed: colors.red,
  in_progress: colors.gold,
  awaiting: colors.blue,
  resolved: colors.green,
};

export function KPICard({ count, label, status, tooltip, onClick }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        flex: 1,
        background: colors.white,
        border: `1px solid ${colors.gray200}`,
        borderRadius: 8,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeftWidth: 4,
        borderLeftColor: KPI_STATUS_COLORS[status],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08)`;
        e.currentTarget.style.transform = `translateY(-2px)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: colors.navy }}>{count}</div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: colors.gray400,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowCard
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowCardData {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  finding_summary: string | null;
  priority: number;
  overdue_at: string | null;
  verification_status?: string;
  verification_attempts?: number;
}

interface WorkflowCardProps {
  workflow: WorkflowCardData;
  onClick: () => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const typeInfo = workflowTypeLabels[
    workflow.workflow_type as keyof typeof workflowTypeLabels
  ] || { label: 'Unknown', tooltip: '' };
  const statusColor = statusColors[workflow.status as keyof typeof statusColors] || colors.gray400;
  const statusBg = statusBgColors[workflow.status as keyof typeof statusBgColors] || colors.gray100;
  const statusLabel = statusLabels[workflow.status as keyof typeof statusLabels] || workflow.status;

  const isOverdue = workflow.overdue_at && new Date(workflow.overdue_at) < new Date();

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: colors.white,
        border: `1px solid ${colors.gray200}`,
        borderRadius: 8,
        padding: 12,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08)`;
        e.currentTarget.style.borderColor = colors.blue;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = colors.gray200;
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy, marginBottom: 4 }}>
            {workflow.provider_name || 'Unknown Provider'}
          </div>
          <div style={{ fontSize: 11, color: colors.gray600, lineHeight: 1.4 }}>
            {workflow.finding_summary || 'No details'}
          </div>
        </div>
        {isOverdue && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: colors.red,
              color: colors.white,
              padding: '2px 6px',
              borderRadius: 4,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Overdue
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: colors.goldPale,
            color: colors.gold,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {typeInfo.label}
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: statusBg,
            color: statusColor,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {statusLabel}
        </div>

        {workflow.priority >= 3 && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: colors.red,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            ⚡ High Priority
          </div>
        )}

        {workflow.verification_status && workflow.verification_status !== 'pending' && (
          <VerificationBadge
            verificationStatus={workflow.verification_status as any}
            verificationAttempts={workflow.verification_attempts}
          />
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertCard
// ─────────────────────────────────────────────────────────────────────────────

interface AlertCardData {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  provider_name: string | null;
  created_at: string;
}

interface AlertCardProps {
  alert: AlertCardData;
  onClick?: () => void;
}

const SEVERITY_ICONS: Record<string, string> = {
  action: '⚠️',
  warning: '⚡',
  info: 'ℹ️',
  resolved: '✓',
};

export function AlertCard({ alert, onClick }: AlertCardProps) {
  const severityColor =
    alertSeverityColors[alert.severity as keyof typeof alertSeverityColors] || colors.gray400;
  const icon = SEVERITY_ICONS[alert.severity] || '•';
  const createdDate = new Date(alert.created_at);
  const timeAgo = getTimeAgo(createdDate);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: colors.white,
        border: `1px solid ${colors.gray200}`,
        borderRadius: 8,
        padding: 12,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08)`;
        e.currentTarget.style.borderColor = colors.blue;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = colors.gray200;
      }}
    >
      <div style={{ fontSize: 16, minWidth: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy, flex: 1 }}>
            {alert.title}
          </div>
          <div style={{ fontSize: 10, color: colors.gray400, whiteSpace: 'nowrap' }}>{timeAgo}</div>
        </div>
        {alert.description && (
          <div style={{ fontSize: 11, color: colors.gray600, lineHeight: 1.4, marginBottom: 4 }}>
            {alert.description}
          </div>
        )}
        {alert.provider_name && (
          <div style={{ fontSize: 10, color: colors.gray400 }}>{alert.provider_name}</div>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PayerSyncPanel
// ─────────────────────────────────────────────────────────────────────────────

interface PayerData {
  payer: string;
  status: string;
  color: string;
}

interface PayerSyncPanelProps {
  payers: PayerData[];
}

const PAYER_STATUS_COLORS: Record<string, string> = {
  synced: colors.green,
  syncing: colors.gold,
  pending: colors.gray400,
  error: colors.red,
};

export function PayerSyncPanel({ payers }: PayerSyncPanelProps) {
  if (!payers || payers.length === 0) {
    return (
      <div
        style={{
          background: colors.gray50,
          border: `1px solid ${colors.gray200}`,
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: colors.gray400,
          fontSize: 12,
        }}
      >
        No payer directories configured
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.white,
        border: `1px solid ${colors.gray200}`,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {payers.map((payer, idx) => {
        const dotColor = PAYER_STATUS_COLORS[payer.status] || colors.gray400;
        const statusLabel = payer.status.charAt(0).toUpperCase() + payer.status.slice(1);

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>{payer.payer}</div>
              <div style={{ fontSize: 10, color: colors.gray400 }}>{statusLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipProps {
  text: string;
  children: ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ cursor: 'help' }}
      >
        {children}
      </div>
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            background: colors.navy,
            color: colors.white,
            fontSize: 11,
            padding: '8px 10px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
