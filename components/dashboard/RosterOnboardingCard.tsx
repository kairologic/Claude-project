/**
 * components/dashboard/RosterOnboardingCard.tsx
 *
 * Inline onboarding card displayed at top of the Provider Roster page
 * when a practice has not yet confirmed their auto-detected providers.
 *
 * Features:
 * - Shows count of auto-detected providers from website crawl
 * - Checkboxes to confirm or remove each detected provider
 * - "Add Missing Provider" link to NPI lookup
 * - "Confirm Roster" button that sets onboarding_confirmed flag
 * - Auto-dismisses after confirmation; reappears if new providers detected
 *
 * Pipeline tasks: #123-#127
 */

'use client';

import { useState, useCallback } from 'react';
import { colors, spacing, radii, shadows, typography, transitions } from '@/lib/design-tokens';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';

interface DetectedProvider {
  npi: string;
  provider_name: string | null;
  web_specialty: string | null;
  roster_status: string | null;
  association_source: string | null;
}

interface RosterOnboardingCardProps {
  practiceId: string;
  providers: DetectedProvider[];
  onboardingConfirmed: boolean;
  onConfirm: () => void; // callback after roster confirmed
  onAddProvider: () => void; // trigger NPI lookup modal
}

export default function RosterOnboardingCard({
  practiceId,
  providers,
  onboardingConfirmed,
  onConfirm,
  onAddProvider,
}: RosterOnboardingCardProps) {
  // Only show for auto-detected, non-departed providers
  const detectedProviders = providers.filter(
    (p) => p.association_source === 'DETECTED' && p.roster_status !== 'departed',
  );

  const [confirmed, setConfirmed] = useState<Set<string>>(
    () => new Set(detectedProviders.map((p) => p.npi)), // Only active detected providers checked by default
  );
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't render if already confirmed or dismissed
  if (onboardingConfirmed || dismissed) return null;

  if (detectedProviders.length === 0) return null;

  const toggleProvider = (npi: string) => {
    const newConfirmed = new Set(confirmed);
    const newRemoved = new Set(removed);

    if (newConfirmed.has(npi)) {
      newConfirmed.delete(npi);
      newRemoved.add(npi);
    } else {
      newConfirmed.add(npi);
      newRemoved.delete(npi);
    }

    setConfirmed(newConfirmed);
    setRemoved(newRemoved);
  };

  const handleConfirmRoster = useCallback(async () => {
    setSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();

      // Mark removed providers as departed
      if (removed.size > 0) {
        for (const npi of removed) {
          await supabase
            .from('practice_providers')
            .update({ roster_status: 'departed' })
            .eq('practice_website_id', practiceId)
            .eq('npi', npi);
        }
      }

      // Mark confirmed providers as active (CONFIRMED association)
      if (confirmed.size > 0) {
        for (const npi of confirmed) {
          await supabase
            .from('practice_providers')
            .update({ association_source: 'CONFIRMED' })
            .eq('practice_website_id', practiceId)
            .eq('npi', npi);
        }
      }

      // Set onboarding_confirmed flag on practice_websites
      await supabase
        .from('practice_websites')
        .update({ onboarding_confirmed: true })
        .eq('id', practiceId);

      onConfirm();
    } catch (err) {
      console.error('Failed to confirm roster:', err);
      alert('Failed to confirm roster. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [practiceId, confirmed, removed, onConfirm]);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.goldPale} 0%, #fff 100%)`,
        border: `1px solid ${colors.gold}`,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        boxShadow: shadows.sm,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.md,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.09 7.26L18 8.27L14 12.14L14.18 18.02L10 15.77L5.82 18.02L6 12.14L2 8.27L7.91 7.26L10 2Z"
                fill={colors.gold}
              />
            </svg>
            <span style={{ ...typography.h4, color: colors.navy }}>Review Your Team</span>
          </div>
          <p style={{ ...typography.bodySmall, color: colors.gray400, margin: 0, maxWidth: 500 }}>
            We detected {detectedProviders.length} provider
            {detectedProviders.length !== 1 ? 's' : ''} from your website. Confirm your team below
            so we can start monitoring their data across payers and directories.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.gray400,
            padding: 4,
            transition: `color ${transitions.fast}`,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.color = colors.gray600;
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.color = colors.gray400;
          }}
          title="Dismiss for now"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      </div>

      {/* Provider checklist */}
      <div
        style={{
          background: '#fff',
          borderRadius: radii.md,
          border: `1px solid ${colors.gray200}`,
          overflow: 'hidden',
          marginBottom: spacing.md,
        }}
      >
        {detectedProviders.map((p, idx) => {
          const isChecked = confirmed.has(p.npi);
          return (
            <div
              key={p.npi}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm}px ${spacing.md}px`,
                borderBottom:
                  idx < detectedProviders.length - 1 ? `1px solid ${colors.gray100}` : 'none',
                background: isChecked ? 'transparent' : '#fef2f2',
                opacity: isChecked ? 1 : 0.7,
                transition: `all ${transitions.fast}`,
                cursor: 'pointer',
              }}
              onClick={() => toggleProvider(p.npi)}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${isChecked ? colors.navy : colors.gray300}`,
                  background: isChecked ? colors.navy : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: `all ${transitions.fast}`,
                }}
              >
                {isChecked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Provider info */}
              <div style={{ flex: 1 }}>
                <span style={{ ...typography.body, fontWeight: 600, color: colors.navy }}>
                  {p.provider_name || `NPI ${p.npi}`}
                </span>
                {p.web_specialty && (
                  <span
                    style={{
                      ...typography.bodySmall,
                      color: colors.gray400,
                      marginLeft: spacing.sm,
                    }}
                  >
                    — {p.web_specialty}
                  </span>
                )}
              </div>

              {/* NPI */}
              <span
                style={{
                  ...typography.bodySmall,
                  fontFamily: 'monospace',
                  color: colors.gray400,
                  fontSize: 11,
                }}
              >
                {p.npi}
              </span>

              {/* Status */}
              {!isChecked && (
                <span
                  style={{
                    ...typography.bodySmall,
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Will be removed
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        {/* Confirm button */}
        <button
          onClick={handleConfirmRoster}
          disabled={submitting || confirmed.size === 0}
          style={{
            background: confirmed.size === 0 ? colors.gray300 : colors.navy,
            color: '#fff',
            border: 'none',
            borderRadius: radii.md,
            padding: `${spacing.sm}px ${spacing.lg}px`,
            ...typography.body,
            fontWeight: 600,
            cursor: confirmed.size === 0 ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: `all ${transitions.fast}`,
          }}
          onMouseOver={(e) => {
            if (confirmed.size > 0 && !submitting) {
              (e.currentTarget as HTMLElement).style.background = colors.navyLight;
            }
          }}
          onMouseOut={(e) => {
            if (confirmed.size > 0) {
              (e.currentTarget as HTMLElement).style.background = colors.navy;
            }
          }}
        >
          {submitting
            ? 'Confirming...'
            : `Confirm ${confirmed.size} Provider${confirmed.size !== 1 ? 's' : ''}`}
        </button>

        {/* Add missing provider */}
        <button
          onClick={onAddProvider}
          style={{
            background: 'none',
            color: colors.navy,
            border: `1px solid ${colors.navy}`,
            borderRadius: radii.md,
            padding: `${spacing.sm}px ${spacing.md}px`,
            ...typography.body,
            fontWeight: 500,
            cursor: 'pointer',
            transition: `all ${transitions.fast}`,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.background = colors.navy;
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'none';
            (e.currentTarget as HTMLElement).style.color = colors.navy;
          }}
        >
          + Add Missing Provider
        </button>

        {/* Summary text */}
        {removed.size > 0 && (
          <span style={{ ...typography.bodySmall, color: colors.gray400 }}>
            {removed.size} provider{removed.size !== 1 ? 's' : ''} will be marked as departed
          </span>
        )}
      </div>
    </div>
  );
}
