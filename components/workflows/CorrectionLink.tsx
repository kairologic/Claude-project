'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { colors, typography, spacing, radii, transitions, shadows } from '@/lib/design-tokens';
import { resolveUrl, getMissingPlaceholders } from '@/lib/corrections/deep-link-utils';
import { getSystemIcon } from '@/lib/corrections/icons';
import { InstructionCard } from './InstructionCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DeepLinkData {
  url_template: string;
  display_label: string;
  instructions: string[];
  icon: string;
}

export interface CorrectionLinkProps {
  /**
   * The system name (e.g., 'NPPES', 'CAQH ProView')
   */
  systemName: string;

  /**
   * The type of correction (e.g., 'address', 'phone')
   */
  correctionType: string;

  /**
   * Optional NPI number to include in deep link
   */
  npi?: string;

  /**
   * Optional provider name
   */
  providerName?: string;

  /**
   * Optional correct value to show with copy button
   */
  correctValue?: string;

  /**
   * Whether to show the instruction card
   * @default false
   */
  showInstructions?: boolean;

  /**
   * Deep link configuration
   */
  deepLink: DeepLinkData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const CorrectionLink: React.FC<CorrectionLinkProps> = ({
  systemName,
  correctionType,
  npi,
  providerName,
  correctValue,
  showInstructions = false,
  deepLink,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showInstructionsLocal, setShowInstructionsLocal] = useState(showInstructions);

  // Build variables for URL resolution
  const urlVars: Record<string, string> = {};
  if (npi) urlVars.npi = npi;
  if (providerName) urlVars.provider_name = providerName;

  // Check for missing required variables
  const missingVars = getMissingPlaceholders(deepLink.url_template, urlVars);
  const canOpenLink = missingVars.length === 0;

  // Resolve the actual URL
  let resolvedUrl = deepLink.url_template;
  if (canOpenLink) {
    resolvedUrl = resolveUrl(deepLink.url_template, urlVars);
  }

  const handleOpenLink = () => {
    if (canOpenLink) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[CorrectionLink] Cannot open link, missing variables:', missingVars);
    }
  };

  const handleCopyValue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!correctValue) return;

    try {
      await navigator.clipboard.writeText(correctValue);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 1500);
    } catch (error) {
      console.error('[CorrectionLink] Copy failed:', error);
    }
  };

  const systemIcon = getSystemIcon(systemName);

  // ───────────────────────────────────────────────────────────────────────────
  // Styles
  // ───────────────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'flex-start',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: canOpenLink ? colors.blue : colors.gray300,
    color: colors.white,
    border: 'none',
    borderRadius: radii.md,
    cursor: canOpenLink ? 'pointer' : 'not-allowed',
    ...typography.body,
    fontWeight: 600,
    transition: `all ${transitions.base}`,
    boxShadow: isHovering && canOpenLink ? shadows.md : shadows.sm,
    opacity: canOpenLink ? 1 : 0.6,
  };

  const buttonHoverStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: canOpenLink ? '#1456B5' : colors.gray300,
    transform: canOpenLink ? 'translateY(-1px)' : 'none',
  };

  const copyContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xs,
    alignItems: 'center',
  };

  const copyValueStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xs,
    alignItems: 'center',
    padding: `${spacing.sm}px ${spacing.md}px`,
    backgroundColor: colors.green,
    color: colors.white,
    borderRadius: radii.md,
    ...typography.bodySmall,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: `all ${transitions.base}`,
    boxShadow: shadows.sm,
  };

  const copyValueHoverStyle: React.CSSProperties = {
    ...copyValueStyle,
    backgroundColor: '#158560',
    boxShadow: shadows.md,
  };

  const [isHoveringCopyValue, setIsHoveringCopyValue] = useState(false);

  const instructionToggleStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xs,
    alignItems: 'center',
    padding: `${spacing.sm}px ${spacing.md}px`,
    backgroundColor: colors.bluePale,
    color: colors.blue,
    borderRadius: radii.md,
    ...typography.bodySmall,
    fontWeight: 600,
    border: `1px solid ${colors.blue}`,
    cursor: 'pointer',
    transition: `all ${transitions.base}`,
  };

  const instructionToggleHoverStyle: React.CSSProperties = {
    ...instructionToggleStyle,
    backgroundColor: colors.blue,
    color: colors.white,
  };

  const [isHoveringInstructions, setIsHoveringInstructions] = useState(false);

  return (
    <div style={containerStyle}>
      {/* Button Container */}
      <div style={buttonContainerStyle}>
        {/* Main Link Button */}
        <button
          onClick={handleOpenLink}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={!canOpenLink}
          style={isHovering && canOpenLink ? buttonHoverStyle : buttonStyle}
          type="button"
          title={
            canOpenLink
              ? `Open ${systemName} in new window`
              : `Missing required information: ${missingVars.join(', ')}`
          }
        >
          {systemIcon && <span style={{ fontSize: '16px' }}>{systemIcon}</span>}
          <span>{deepLink.display_label}</span>
          <ExternalLink size={16} strokeWidth={2} />
        </button>

        {/* Copy Value Button (optional) */}
        {correctValue && (
          <button
            onClick={handleCopyValue}
            onMouseEnter={() => setIsHoveringCopyValue(true)}
            onMouseLeave={() => setIsHoveringCopyValue(false)}
            style={isHoveringCopyValue ? copyValueHoverStyle : copyValueStyle}
            type="button"
            title="Copy correct value"
          >
            {showCopyFeedback ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} />
                <span>Copy value</span>
              </>
            )}
          </button>
        )}

        {/* Instructions Toggle Button */}
        {deepLink.instructions && deepLink.instructions.length > 0 && (
          <button
            onClick={() => setShowInstructionsLocal(!showInstructionsLocal)}
            onMouseEnter={() => setIsHoveringInstructions(true)}
            onMouseLeave={() => setIsHoveringInstructions(false)}
            style={isHoveringInstructions ? instructionToggleHoverStyle : instructionToggleStyle}
            type="button"
            title={showInstructionsLocal ? 'Hide instructions' : 'Show instructions'}
          >
            <span>{showInstructionsLocal ? '▼' : '▶'}</span>
            <span>Guide</span>
          </button>
        )}
      </div>

      {/* Instruction Card */}
      {showInstructionsLocal && deepLink.instructions && deepLink.instructions.length > 0 && (
        <InstructionCard
          systemName={systemName}
          correctionType={correctionType}
          steps={deepLink.instructions}
          isExpanded={true}
        />
      )}
    </div>
  );
};

CorrectionLink.displayName = 'CorrectionLink';
