'use client';

import { colors, statusColors } from '@/lib/design-tokens';
import type { FindingDetails, TaskMetadata } from '@/lib/types/dashboard-schema';

interface FindingReviewProps {
  finding: FindingDetails;
  comparisonData?: TaskMetadata['comparison_data'];
  onProceedToApprove: () => void;
}

export default function FindingReview({
  finding,
  comparisonData,
  onProceedToApprove,
}: FindingReviewProps) {
  const fieldName = finding.field || 'Unknown field';
  const websiteValue = finding.website_value || '';
  const npbesValue = finding.nppes_value || '';
  const hasMultipleSources =
    comparisonData && comparisonData.sources && comparisonData.sources.length > 0;
  const valuesMatch = websiteValue === npbesValue;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
      }}
    >
      {/* Field name header */}
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
          Field under review
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.navy,
            textTransform: 'capitalize',
          }}
        >
          {fieldName}
        </div>
      </div>

      {/* Two-column comparison (simple case) */}
      {!hasMultipleSources && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {/* Website column */}
          <div
            style={{
              background: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: colors.gray400,
                marginBottom: 8,
              }}
            >
              Website (Source)
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: colors.navy,
                padding: 8,
                background: valuesMatch ? colors.greenPale : colors.redPale,
                borderRadius: 4,
                borderLeft: `3px solid ${valuesMatch ? colors.green : colors.red}`,
                wordBreak: 'break-word',
              }}
            >
              {websiteValue || '(empty)'}
            </div>
          </div>

          {/* NPPES column */}
          <div
            style={{
              background: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: colors.gray400,
                marginBottom: 8,
              }}
            >
              NPPES (Current Record)
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: colors.navy,
                padding: 8,
                background: valuesMatch ? colors.greenPale : colors.redPale,
                borderRadius: 4,
                borderLeft: `3px solid ${valuesMatch ? colors.green : colors.red}`,
                wordBreak: 'break-word',
              }}
            >
              {npbesValue || '(empty)'}
            </div>
          </div>
        </div>
      )}

      {/* Multi-source table (if applicable) */}
      {hasMultipleSources && (
        <div
          style={{
            background: colors.white,
            border: `1px solid ${colors.gray200}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  background: colors.gray50,
                  borderBottom: `1px solid ${colors.gray200}`,
                }}
              >
                <th
                  style={{
                    textAlign: 'left',
                    fontWeight: 700,
                    padding: 10,
                    color: colors.gray600,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Source
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    fontWeight: 700,
                    padding: 10,
                    color: colors.gray600,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData!.sources.map((source, idx) => {
                const valueMatch = source.value === npbesValue;

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom:
                        idx < comparisonData!.sources.length - 1
                          ? `1px solid ${colors.gray200}`
                          : 'none',
                      background: idx % 2 === 0 ? colors.gray50 : colors.white,
                    }}
                  >
                    <td
                      style={{
                        padding: 10,
                        fontWeight: 600,
                        color: colors.navy,
                      }}
                    >
                      {source.source}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        color: colors.navy,
                        background: valueMatch ? colors.greenPale : colors.redPale,
                      }}
                    >
                      {source.value || '(empty)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status indicator */}
      <div
        style={{
          padding: 12,
          background: valuesMatch ? colors.greenPale : colors.redPale,
          border: `1px solid ${valuesMatch ? colors.green : colors.red}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 18,
          }}
        >
          {valuesMatch ? '✓' : '⚠️'}
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: valuesMatch ? colors.green : colors.red,
            }}
          >
            {valuesMatch ? 'Values match' : 'Values differ'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.gray600,
            }}
          >
            {valuesMatch
              ? 'The website value matches the current NPPES record.'
              : 'The website value differs from the current NPPES record. You can approve the correction on the next screen.'}
          </div>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={onProceedToApprove}
        style={{
          background: colors.blue,
          color: colors.white,
          border: 'none',
          borderRadius: 6,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          alignSelf: 'flex-end',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#0F47A6';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 95, 165, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.blue;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Approve Correction →
      </button>
    </div>
  );
}
