'use client';

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';
import type { FindingDetails, TaskMetadata } from '@/lib/types/dashboard-schema';

interface ApproveCorrectionProps {
  workflowId: string;
  finding: FindingDetails;
  options?: TaskMetadata['options'];
  onApprove: (selectedValue: string, source: string) => Promise<void>;
  onBack: () => void;
}

type SelectionMode = 'website' | 'nppes' | 'custom' | null;

export default function ApproveCorrection({
  workflowId,
  finding,
  options,
  onApprove,
  onBack,
}: ApproveCorrectionProps) {
  const [selectedMode, setSelectedMode] = useState<SelectionMode>(null);
  const [customValue, setCustomValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldName = finding.field || 'Unknown field';
  const websiteValue = finding.website_value || '';
  const npbesValue = finding.nppes_value || '';

  async function handleApprove() {
    if (!selectedMode) {
      setError('Please select a value');
      return;
    }

    let valueToApprove = '';
    let source = '';

    if (selectedMode === 'website') {
      valueToApprove = websiteValue;
      source = 'website';
    } else if (selectedMode === 'nppes') {
      valueToApprove = npbesValue;
      source = 'nppes';
    } else if (selectedMode === 'custom') {
      if (!customValue.trim()) {
        setError('Please enter a custom value');
        return;
      }
      valueToApprove = customValue;
      source = 'custom';
    }

    setError(null);
    setIsLoading(true);

    try {
      await onApprove(valueToApprove, source);
      setIsSuccess(true);
      // TODO: In production, set the actual PDF URL from the response
      setSuccessPdfUrl(`/api/workflows/${workflowId}/generate-pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve correction');
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
        alignItems: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 40,
          marginBottom: 8,
        }}>
          ✓
        </div>

        <div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: colors.navy,
            marginBottom: 6,
          }}>
            Correction approved
          </div>
          <div style={{
            fontSize: 12,
            color: colors.gray600,
            lineHeight: 1.5,
          }}>
            Your correction for <strong>{fieldName}</strong> has been approved.
            <br />
            The form is ready to download and submit.
          </div>
        </div>

        {successPdfUrl && (
          <a
            href={successPdfUrl}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: colors.green,
              color: colors.white,
              padding: '10px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#157A5F';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 158, 109, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.green;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📥 Download PDF Form
          </a>
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
            transition: 'all 0.2s ease',
            marginTop: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.gray300;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.gray200;
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: '16px 0',
    }}>
      {/* Field header */}
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.gray400,
          marginBottom: 6,
        }}>
          Approve correction for
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.navy,
          textTransform: 'capitalize',
        }}>
          {fieldName}
        </div>
      </div>

      {/* Selection options */}
      <div style={{
        background: colors.gray50,
        border: `1px solid ${colors.gray200}`,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Website option */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 10,
          background: colors.white,
          border: `2px solid ${selectedMode === 'website' ? colors.blue : colors.gray200}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          <input
            type="radio"
            name="correction-source"
            checked={selectedMode === 'website'}
            onChange={() => setSelectedMode('website')}
            style={{
              marginTop: 2,
              cursor: 'pointer',
              accentColor: colors.blue,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.navy,
              marginBottom: 4,
            }}>
              Use website value
            </div>
            <div style={{
              fontSize: 11,
              color: colors.gray600,
              padding: 6,
              background: colors.greenPale,
              borderRadius: 4,
              fontFamily: 'monospace',
              wordBreak: 'break-word',
            }}>
              {websiteValue || '(empty)'}
            </div>
          </div>
        </label>

        {/* NPPES option */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 10,
          background: colors.white,
          border: `2px solid ${selectedMode === 'nppes' ? colors.blue : colors.gray200}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          <input
            type="radio"
            name="correction-source"
            checked={selectedMode === 'nppes'}
            onChange={() => setSelectedMode('nppes')}
            style={{
              marginTop: 2,
              cursor: 'pointer',
              accentColor: colors.blue,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.navy,
              marginBottom: 4,
            }}>
              Use NPPES value (keep current)
            </div>
            <div style={{
              fontSize: 11,
              color: colors.gray600,
              padding: 6,
              background: colors.bluePale,
              borderRadius: 4,
              fontFamily: 'monospace',
              wordBreak: 'break-word',
            }}>
              {npbesValue || '(empty)'}
            </div>
          </div>
        </label>

        {/* Custom option */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 10,
          background: colors.white,
          border: `2px solid ${selectedMode === 'custom' ? colors.blue : colors.gray200}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          <input
            type="radio"
            name="correction-source"
            checked={selectedMode === 'custom'}
            onChange={() => setSelectedMode('custom')}
            style={{
              marginTop: 2,
              cursor: 'pointer',
              accentColor: colors.blue,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.navy,
              marginBottom: 6,
            }}>
              Enter custom value
            </div>
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Type the correct value here..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </label>
      </div>

      {/* Notes textarea */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.gray400,
          marginBottom: 8,
        }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional context or notes about this correction..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            minHeight: 80,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: colors.redPale,
          border: `1px solid ${colors.red}`,
          borderRadius: 6,
          padding: 10,
          fontSize: 12,
          color: colors.red,
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            background: colors.gray200,
            color: colors.navy,
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.6 : 1,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = colors.gray300;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.gray200;
          }}
        >
          ← Back
        </button>

        <button
          onClick={handleApprove}
          disabled={isLoading || !selectedMode}
          style={{
            background: colors.blue,
            color: colors.white,
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: isLoading || !selectedMode ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: isLoading || !selectedMode ? 0.6 : 1,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && selectedMode) {
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
          {isLoading ? 'Processing...' : 'Approve & Generate Form →'}
        </button>
      </div>
    </div>
  );
}
