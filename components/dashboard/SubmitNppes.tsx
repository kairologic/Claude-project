'use client';

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';

interface SubmitNppesProps {
  workflowId: string;
  providerName: string | null;
  portalUrl: string;
  pdfUrl: string | null;
  onMarkSubmitted: (submissionRef?: string) => Promise<void>;
  onBack: () => void;
}

export default function SubmitNppes({
  workflowId,
  providerName,
  portalUrl,
  pdfUrl,
  onMarkSubmitted,
  onBack,
}: SubmitNppesProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [submissionRef, setSubmissionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { label: 'Download the pre-filled PDF form', action: 'download' },
    { label: 'Log in to the NPPES portal', action: 'portal' },
    { label: 'Navigate to your provider record', action: null },
    { label: 'Enter the corrected values from the form', action: null },
    { label: 'Submit the update in NPPES', action: null },
    { label: 'Mark as submitted below', action: null },
  ];

  function toggleStep(idx: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleMarkSubmitted() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onMarkSubmitted(submissionRef.trim() || undefined);
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '24px 0',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: colors.bluePale,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          &#128640;
        </div>

        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: colors.navy,
              marginBottom: 6,
            }}
          >
            Submitted to NPPES
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.gray600,
              lineHeight: 1.5,
              maxWidth: 320,
            }}
          >
            The workflow is now <strong>awaiting confirmation</strong>. KairoLogic will
            automatically verify the update the next time NPPES data is synced.
          </div>
        </div>

        {submissionRef && (
          <div
            style={{
              fontSize: 11,
              color: colors.gray400,
              background: colors.gray50,
              padding: '6px 12px',
              borderRadius: 4,
            }}
          >
            Ref: {submissionRef}
          </div>
        )}

        <button
          onClick={onBack}
          style={{
            background: colors.gray200,
            color: colors.navy,
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          &larr; Back to workflow
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.gray400,
            marginBottom: 6,
          }}
        >
          Step 3 of 3
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.navy,
          }}
        >
          Submit to NPPES
        </div>
        {providerName && (
          <div
            style={{
              fontSize: 12,
              color: colors.gray600,
              marginTop: 4,
            }}
          >
            Provider: {providerName}
          </div>
        )}
      </div>

      {/* Quick actions row */}
      <div
        style={{
          display: 'flex',
          gap: 10,
        }}
      >
        {pdfUrl && (
          <a
            href={pdfUrl}
            download
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: colors.green,
              color: colors.white,
              padding: '10px 14px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 12,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#157A5F';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 158, 109, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.green;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            &#128229; Download PDF
          </a>
        )}

        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: colors.blue,
            color: colors.white,
            padding: '10px 14px',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 12,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0F47A6';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 95, 165, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.blue;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          &#127760; Open NPPES Portal
        </a>
      </div>

      {/* Step checklist */}
      <div
        style={{
          background: colors.gray50,
          border: `1px solid ${colors.gray200}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.gray400,
            marginBottom: 10,
          }}
        >
          Submission checklist
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {steps.map((step, idx) => {
            const isChecked = checkedSteps.has(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleStep(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: isChecked ? colors.greenPale : colors.white,
                  border: `1px solid ${isChecked ? colors.green : colors.gray200}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${isChecked ? colors.green : colors.gray300}`,
                    background: isChecked ? colors.green : colors.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: colors.white,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {isChecked ? '\u2713' : ''}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: isChecked ? colors.green : colors.navy,
                    fontWeight: isChecked ? 600 : 500,
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submission reference (optional) */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.gray400,
            marginBottom: 8,
          }}
        >
          Submission reference (optional)
        </label>
        <input
          type="text"
          value={submissionRef}
          onChange={(e) => setSubmissionRef(e.target.value)}
          placeholder="e.g., NPPES confirmation number or date submitted"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            background: colors.redPale,
            border: `1px solid ${colors.red}`,
            borderRadius: 6,
            padding: 10,
            fontSize: 12,
            color: colors.red,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            background: colors.gray200,
            color: colors.navy,
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          &larr; Back
        </button>

        <button
          onClick={handleMarkSubmitted}
          disabled={isSubmitting}
          style={{
            background: colors.blue,
            color: colors.white,
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = '#0F47A6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 95, 165, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.blue;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isSubmitting ? 'Updating...' : 'Mark as Submitted \u2192'}
        </button>
      </div>
    </div>
  );
}
