'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { colors, typography, spacing, radii, transitions } from '@/lib/design-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CorrectionValuePairProps {
  /**
   * Label for the field being corrected (e.g., 'Practice Address')
   */
  fieldLabel: string;

  /**
   * The incorrect/current value (displayed with strikethrough, red color)
   */
  incorrectValue: string;

  /**
   * The correct/new value (displayed in green)
   */
  correctValue: string;

  /**
   * Source system (e.g., 'NPPES', 'CAQH ProView')
   */
  source: string;

  /**
   * Optional timestamp of when this correction was verified
   */
  verifiedAt?: string;

  /**
   * Optional callback when user clicks copy button
   */
  onCopy?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const CorrectionValuePair: React.FC<CorrectionValuePairProps> = ({
  fieldLabel,
  incorrectValue,
  correctValue,
  source,
  verifiedAt,
  onCopy,
}) => {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(correctValue);
      setShowCopyFeedback(true);
      onCopy?.();

      // Auto-hide feedback after 1.5 seconds
      setTimeout(() => {
        setShowCopyFeedback(false);
      }, 1500);
    } catch (error) {
      console.error('[CorrectionValuePair] Copy failed:', error);
    }
  };

  // Format verification timestamp
  const formattedVerifiedAt = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radii.md,
    border: `1px solid ${colors.gray200}`,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  };

  const labelStyle: React.CSSProperties = {
    ...typography.h4,
    color: colors.navy,
    margin: 0,
  };

  const sourceAndDateStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    ...typography.caption,
    color: colors.gray400,
  };

  const valuesContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const valueRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'flex-start',
  };

  const valueLabel: React.CSSProperties = {
    ...typography.bodySmall,
    fontWeight: 600,
    color: colors.gray600,
    minWidth: '70px',
    paddingTop: spacing.xs,
  };

  const incorrectValueStyle: React.CSSProperties = {
    ...typography.body,
    color: colors.red,
    textDecoration: 'line-through',
    wordBreak: 'break-word',
    flex: 1,
  };

  const correctValueContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    alignItems: 'center',
    flex: 1,
  };

  const correctValueStyle: React.CSSProperties = {
    ...typography.body,
    color: colors.green,
    fontWeight: 600,
    wordBreak: 'break-word',
    flex: 1,
  };

  const copyButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    backgroundColor: colors.bluePale,
    border: `1px solid ${colors.blue}`,
    borderRadius: radii.sm,
    cursor: 'pointer',
    color: colors.blue,
    transition: `all ${transitions.fast}`,
    flexShrink: 0,
  };

  const copyButtonHoverStyle: React.CSSProperties = {
    ...copyButtonStyle,
    backgroundColor: colors.blue,
    color: colors.white,
  };

  const [isHoveringCopy, setIsHoveringCopy] = useState(false);

  const feedbackStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    ...typography.bodySmall,
    color: colors.green,
    fontWeight: 600,
    opacity: showCopyFeedback ? 1 : 0,
    transition: `opacity ${transitions.fast}`,
  };

  return (
    <div style={containerStyle}>
      {/* Header: Label + Source Info */}
      <div style={headerStyle}>
        <h4 style={labelStyle}>{fieldLabel}</h4>
        <div style={sourceAndDateStyle}>
          <span>{source}</span>
          {formattedVerifiedAt && (
            <>
              <span>•</span>
              <span>{formattedVerifiedAt}</span>
            </>
          )}
        </div>
      </div>

      {/* Incorrect Value */}
      <div style={valueRowStyle}>
        <div style={valueLabel}>Current:</div>
        <div style={incorrectValueStyle}>{incorrectValue}</div>
      </div>

      {/* Correct Value + Copy Button */}
      <div style={valueRowStyle}>
        <div style={valueLabel}>Correct:</div>
        <div style={correctValueContainerStyle}>
          <div style={correctValueStyle}>{correctValue}</div>
          <button
            onClick={handleCopy}
            onMouseEnter={() => setIsHoveringCopy(true)}
            onMouseLeave={() => setIsHoveringCopy(false)}
            style={isHoveringCopy ? copyButtonHoverStyle : copyButtonStyle}
            type="button"
            aria-label="Copy correct value to clipboard"
            title="Copy to clipboard"
          >
            {showCopyFeedback ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <Copy size={16} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Copy Feedback */}
      {showCopyFeedback && (
        <div style={feedbackStyle}>
          <Check size={14} strokeWidth={2.5} />
          <span>Copied!</span>
        </div>
      )}
    </div>
  );
};

CorrectionValuePair.displayName = 'CorrectionValuePair';
