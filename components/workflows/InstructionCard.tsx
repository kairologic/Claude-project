'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { colors, typography, spacing, radii, transitions, shadows } from '@/lib/design-tokens';
import { getSystemIcon } from '@/lib/corrections/icons';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InstructionCardProps {
  /**
   * The system name (e.g., 'NPPES', 'CAQH ProView')
   */
  systemName: string;

  /**
   * The type of correction (e.g., 'address', 'phone')
   */
  correctionType: string;

  /**
   * Array of step descriptions
   */
  steps: string[];

  /**
   * Whether the accordion is initially expanded
   * @default false
   */
  isExpanded?: boolean;

  /**
   * Callback when user toggles the accordion
   */
  onToggle?: (expanded: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const InstructionCard: React.FC<InstructionCardProps> = ({
  systemName,
  correctionType,
  steps,
  isExpanded: controlledExpanded,
  onToggle,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newState = !isExpanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(newState);
    }
    onToggle?.(newState);
  };

  // Format correction type for display
  const formattedCorrectionType = correctionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const systemIcon = getSystemIcon(systemName);

  // ───────────────────────────────────────────────────────────────────────────
  // Styles
  // ───────────────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: radii.md,
    overflow: 'hidden',
    boxShadow: shadows.sm,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.gray50,
    cursor: 'pointer',
    transition: `all ${transitions.base}`,
    border: 'none',
    width: '100%',
    textAlign: 'left',
  };

  const headerHoverStyle: React.CSSProperties = {
    ...headerStyle,
    backgroundColor: colors.gray100,
  };

  const [isHoveringHeader, setIsHoveringHeader] = useState(false);

  const headerContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  };

  const iconContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: colors.bluePale,
    borderRadius: radii.sm,
    color: colors.blue,
    fontSize: '18px',
  };

  const headerTextStyle: React.CSSProperties = {
    ...typography.h4,
    color: colors.navy,
    margin: 0,
  };

  const chevronStyle: React.CSSProperties = {
    color: colors.blue,
    transition: `transform ${transitions.fast}`,
    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-180deg)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    maxHeight: isExpanded ? '1000px' : '0px',
    overflow: 'hidden',
    transition: `max-height ${transitions.base}`,
    borderTop: isExpanded ? `1px solid ${colors.gray200}` : 'none',
  };

  const bodyContentStyle: React.CSSProperties = {
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const stepsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const stepItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'flex-start',
  };

  const stepNumberStyle: React.CSSProperties = {
    ...typography.body,
    fontWeight: 700,
    color: colors.blue,
    minWidth: '24px',
    paddingTop: spacing.xxs,
  };

  const stepTextStyle: React.CSSProperties = {
    ...typography.body,
    color: colors.navy,
    flex: 1,
    lineHeight: 1.6,
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    flexShrink: 0,
    marginTop: spacing.xxs,
  };

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStepCompletion = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <button
        onClick={handleToggle}
        onMouseEnter={() => setIsHoveringHeader(true)}
        onMouseLeave={() => setIsHoveringHeader(false)}
        style={isHoveringHeader ? headerHoverStyle : headerStyle}
        type="button"
        aria-expanded={isExpanded}
        aria-label={`How to update ${formattedCorrectionType} in ${systemName}`}
      >
        <div style={headerContentStyle}>
          <div style={iconContainerStyle}>{systemIcon}</div>
          <h4 style={headerTextStyle}>
            How to update {formattedCorrectionType} in {systemName}
          </h4>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} style={chevronStyle} />
        ) : (
          <ChevronDown size={20} style={chevronStyle} />
        )}
      </button>

      {/* Body */}
      <div style={bodyStyle}>
        <div style={bodyContentStyle}>
          <ol style={stepsContainerStyle}>
            {steps.map((step, index) => (
              <li
                key={index}
                style={{
                  ...stepItemStyle,
                  listStyleType: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                <div style={stepNumberStyle}>{index + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={stepTextStyle}>{step}</div>
                </div>
                <button
                  onClick={() => toggleStepCompletion(index)}
                  style={{
                    ...checkboxContainerStyle,
                    opacity: completedSteps.has(index) ? 1 : 0.4,
                  }}
                  type="button"
                  aria-label={`Mark step ${index + 1} as ${
                    completedSteps.has(index) ? 'incomplete' : 'complete'
                  }`}
                  title={completedSteps.has(index) ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <CheckCircle2
                    size={20}
                    strokeWidth={1.5}
                    color={completedSteps.has(index) ? colors.green : colors.gray300}
                    fill={completedSteps.has(index) ? colors.green : 'none'}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

InstructionCard.displayName = 'InstructionCard';
