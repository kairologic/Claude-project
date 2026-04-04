'use client';

/**
 * components/workflows/MarkAsSubmitted.tsx
 *
 * Button with confirmation dialog for marking a correction as submitted.
 * Calls PATCH /api/workflows/{workflowId} to update verification status.
 */

import { useState } from 'react';
import { colors, typography, spacing, radii, shadows, transitions } from '@/lib/design-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarkAsSubmittedProps {
  workflowId: string;
  practiceId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarkAsSubmitted({
  workflowId,
  practiceId,
  currentStatus,
  onStatusChange,
}: MarkAsSubmittedProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle confirmation and API call
  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verification_status: 'submitted',
          correction_submitted_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update workflow');
      }

      // Notify parent component
      onStatusChange?.('submitted');

      // Close dialog
      setShowDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('[MarkAsSubmitted] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Disable button if already submitted or in other terminal states
  const isDisabled =
    isLoading || ['submitted', 'verified_fixed', 'archived'].includes(currentStatus.toLowerCase());

  // Button styles
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm}px ${spacing.md}px`,
    backgroundColor: isDisabled ? colors.gray200 : colors.blue,
    color: isDisabled ? colors.gray400 : colors.white,
    border: 'none',
    borderRadius: radii.md,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: transitions.fast,
    boxShadow: isDisabled ? 'none' : shadows.sm,
    opacity: isDisabled ? 0.6 : 1,
  };

  const buttonHoverStyle: React.CSSProperties = isDisabled
    ? {}
    : {
        backgroundColor: '#0D4A8F',
        boxShadow: shadows.md,
      };

  // Dialog overlay styles
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 30, 46, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  };

  // Dialog content styles
  const dialogStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    maxWidth: 420,
    boxShadow: shadows.xl,
    position: 'relative',
  };

  // Close button styles
  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: colors.gray400,
    cursor: 'pointer',
    padding: 0,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: transitions.fast,
  };

  // Dialog action buttons
  const actionButtonStyle = (isPrimary: boolean): React.CSSProperties => ({
    flex: 1,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radii.md,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    border: isPrimary ? 'none' : `1px solid ${colors.gray200}`,
    backgroundColor: isPrimary ? colors.blue : colors.white,
    color: isPrimary ? colors.white : colors.navy,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: transitions.fast,
    opacity: isLoading ? 0.6 : 1,
  });

  return (
    <>
      {/* Main Button */}
      <button
        onClick={() => setShowDialog(true)}
        disabled={isDisabled}
        style={buttonStyle}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            Object.assign(e.currentTarget.style, buttonHoverStyle);
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.backgroundColor = colors.blue;
            e.currentTarget.style.boxShadow = shadows.sm;
          }
        }}
        aria-label="Mark correction as submitted"
      >
        <span>📤</span>
        <span>Mark as Submitted</span>
      </button>

      {/* Confirmation Dialog */}
      {showDialog && (
        <div style={overlayStyle} onClick={() => !isLoading && setShowDialog(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
              style={closeButtonStyle}
              title="Close"
            >
              ✕
            </button>

            {/* Title */}
            <h2
              style={{
                ...typography.h2,
                color: colors.navy,
                marginBottom: spacing.md,
                marginTop: 0,
              }}
            >
              Confirm Submission
            </h2>

            {/* Message */}
            <p
              style={{
                fontSize: typography.body.fontSize,
                color: colors.gray600,
                lineHeight: typography.body.lineHeight,
                marginBottom: spacing.lg,
              }}
            >
              Mark this correction as submitted? KairoLogic will automatically verify the fix on the
              next sync cycle.
            </p>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: '#FDEEEE',
                  color: colors.red,
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  fontSize: typography.bodySmall.fontSize,
                  marginBottom: spacing.md,
                }}
              >
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: spacing.md,
              }}
            >
              <button
                onClick={() => setShowDialog(false)}
                disabled={isLoading}
                style={actionButtonStyle(false)}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colors.gray50;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colors.white;
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                style={actionButtonStyle(true)}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#0D4A8F';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colors.blue;
                  }
                }}
              >
                {isLoading ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
