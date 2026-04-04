'use client';

/**
 * components/workflows/VerificationTimeline.tsx
 *
 * Vertical timeline showing verification history for a workflow.
 * Renders events with colored dots, connecting lines, and descriptions.
 */

import { colors, typography, spacing, radii } from '@/lib/design-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string;
  description: string;
  type:
    | 'detection'
    | 'submission'
    | 'verification_pass'
    | 'verification_fail'
    | 'escalation'
    | 'archive';
}

interface VerificationTimelineProps {
  events: TimelineEvent[];
}

// ─── Event Type Configuration ─────────────────────────────────────────────────

const eventConfig: Record<string, { color: string; icon: string; label: string }> = {
  detection: {
    color: colors.gold,
    icon: '🔍',
    label: 'Issue Detected',
  },
  submission: {
    color: colors.blue,
    icon: '📤',
    label: 'Submitted for Verification',
  },
  verification_pass: {
    color: colors.green,
    icon: '✓',
    label: 'Verified & Fixed',
  },
  verification_fail: {
    color: '#F97316',
    icon: '⚡',
    label: 'Verification Failed',
  },
  escalation: {
    color: colors.red,
    icon: '🚨',
    label: 'Escalated',
  },
  archive: {
    color: colors.gray400,
    icon: '📦',
    label: 'Archived',
  },
};

// ─── Format Date Helper ──────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VerificationTimeline({ events }: VerificationTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div
        style={{
          padding: spacing.md,
          backgroundColor: '#F4F5F7',
          borderRadius: radii.md,
          textAlign: 'center',
          color: colors.gray400,
          fontSize: typography.bodySmall.fontSize,
        }}
      >
        No verification events yet
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: spacing['2xl'],
      }}
    >
      {/* Vertical connector line */}
      {events.length > 1 && (
        <div
          style={{
            position: 'absolute',
            left: spacing.md,
            top: spacing.lg,
            bottom: 0,
            width: 2,
            backgroundColor: colors.gray200,
            zIndex: 0,
          }}
        />
      )}

      {/* Events */}
      {events.map((event, idx) => {
        const config = eventConfig[event.type] || eventConfig.detection;
        const isLast = idx === events.length - 1;

        return (
          <div key={idx} style={{ marginBottom: spacing.lg, position: 'relative' }}>
            {/* Dot */}
            <div
              style={{
                position: 'absolute',
                left: -(spacing.md + 6),
                top: 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: config.color,
                border: `3px solid white`,
                boxShadow: `0 0 0 2px ${config.color}`,
                zIndex: 1,
              }}
            />

            {/* Content */}
            <div
              style={{
                backgroundColor: '#FAFAFA',
                border: `1px solid ${colors.gray200}`,
                borderRadius: radii.md,
                padding: spacing.md,
              }}
            >
              {/* Header with icon and type */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginBottom: spacing.sm,
                }}
              >
                <span style={{ fontSize: '1.1em' }}>{config.icon}</span>
                <span
                  style={{
                    fontWeight: typography.h4.fontWeight,
                    fontSize: typography.h4.fontSize,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              </div>

              {/* Date */}
              <div
                style={{
                  fontSize: typography.caption.fontSize,
                  color: colors.gray400,
                  marginBottom: spacing.xs,
                }}
              >
                {formatDate(event.date)}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: typography.body.fontSize,
                  color: colors.gray600,
                  lineHeight: typography.body.lineHeight,
                }}
              >
                {event.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
