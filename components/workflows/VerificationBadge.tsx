'use client';

/**
 * components/workflows/VerificationBadge.tsx
 *
 * Status badge for verification states.
 * Visual indicator with inline styles using design tokens.
 * Maps verification statuses to colors, labels, and attempt counters.
 */

import { colors, typography, spacing, radii } from '@/lib/design-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerificationBadgeProps {
  verificationStatus:
    | 'pending'
    | 'submitted'
    | 'verified_fixed'
    | 'still_mismatched'
    | 'escalated'
    | 'archived';
  verificationAttempts?: number;
  maxAttempts?: number;
  nextSyncDate?: string;
}

// ─── Badge Configuration ─────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; bgColor: string; textColor: string; icon: string }
> = {
  pending: {
    label: 'Correction Needed',
    bgColor: '#FDF6E3',
    textColor: colors.gold,
    icon: '⚠️',
  },
  submitted: {
    label: 'Awaiting Verification',
    bgColor: '#EEF4FF',
    textColor: colors.blue,
    icon: '⏳',
  },
  verified_fixed: {
    label: 'Verified Fixed',
    bgColor: '#E6F7F2',
    textColor: colors.green,
    icon: '✓',
  },
  still_mismatched: {
    label: 'Still Mismatched',
    bgColor: '#FEF3F2',
    textColor: '#F97316',
    icon: '⚡',
  },
  escalated: {
    label: 'Escalated — Action Required',
    bgColor: '#FDEEEE',
    textColor: colors.red,
    icon: '🚨',
  },
  archived: {
    label: 'Archived',
    bgColor: '#F4F5F7',
    textColor: colors.gray400,
    icon: '📦',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function VerificationBadge({
  verificationStatus,
  verificationAttempts = 0,
  maxAttempts = 3,
  nextSyncDate,
}: VerificationBadgeProps) {
  const config = statusConfig[verificationStatus] || statusConfig.pending;

  // Build label with attempt counter for still_mismatched
  let displayLabel = config.label;
  if (verificationStatus === 'still_mismatched' && maxAttempts > 0) {
    displayLabel = `${config.label} (attempt ${verificationAttempts}/${maxAttempts})`;
  }

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    backgroundColor: config.bgColor,
    borderRadius: radii.full,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    lineHeight: typography.caption.lineHeight,
    color: config.textColor,
  };

  // Tooltip content
  const tooltipParts: string[] = [displayLabel];
  if (verificationStatus === 'submitted' && nextSyncDate) {
    tooltipParts.push(`Next sync: ${nextSyncDate}`);
  }
  if (verificationStatus === 'escalated') {
    tooltipParts.push('Manual review required');
  }
  const tooltipText = tooltipParts.join('\n');

  return (
    <span style={containerStyle} title={tooltipText} role="status" aria-label={displayLabel}>
      <span style={{ fontSize: '0.9em' }}>{config.icon}</span>
      <span>{displayLabel}</span>
    </span>
  );
}
