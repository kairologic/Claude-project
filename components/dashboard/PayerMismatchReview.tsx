'use client';

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';
import { payerPortals } from '@/lib/design-tokens';
import type { FindingDetails, TaskMetadata } from '@/lib/types/dashboard-schema';

interface PayerMismatchReviewProps {
  workflowId: string;
  finding: FindingDetails;
  comparisonData?: TaskMetadata['comparison_data'];
  onBack: () => void;
}

/**
 * Payer Directory mismatch review — shows provider data across
 * NPPES, website, and one or more payer directories side-by-side.
 * Links to CAQH for the primary fix path.
 */
export default function PayerMismatchReview({
  workflowId,
  finding,
  comparisonData,
  onBack,
}: PayerMismatchReviewProps) {
  const [showCaqhGuide, setShowCaqhGuide] = useState(false);

  const fieldName = finding.field || 'Unknown field';
  const payerName = finding.payer_name || 'Payer';
  const sources = comparisonData?.sources || [];

  // Determine which payer portal to link
  const portalInfo = payerPortals['caqh'];

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
          Payer directory mismatch
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
        <div
          style={{
            fontSize: 12,
            color: colors.gray600,
            marginTop: 4,
          }}
        >
          Affected payer: <strong>{payerName}</strong>
        </div>
      </div>

      {/* Multi-source comparison table */}
      {sources.length > 0 && (
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
                <th
                  style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    padding: 10,
                    color: colors.gray600,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    width: 60,
                  }}
                >
                  Match
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source, idx) => {
                // Compare to the first source (website/authoritative) value
                const refValue = sources[0]?.value || '';
                const matches = source.value === refValue;

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom:
                        idx < sources.length - 1 ? `1px solid ${colors.gray200}` : 'none',
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
                        background:
                          idx === 0 ? colors.bluePale : matches ? colors.greenPale : colors.redPale,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        wordBreak: 'break-word',
                      }}
                    >
                      {source.value || '(empty)'}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        textAlign: 'center',
                        fontSize: 14,
                      }}
                    >
                      {idx === 0 ? '—' : matches ? '✓' : '✗'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CAQH fix path */}
      <div
        style={{
          background: colors.bluePale,
          border: `1px solid ${colors.blue}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: colors.navy,
            marginBottom: 6,
          }}
        >
          Recommended fix: Update CAQH ProView
        </div>
        <div
          style={{
            fontSize: 11,
            color: colors.gray600,
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Most payers (UHC, Aetna, Humana) pull provider data from CAQH automatically. Updating your
          CAQH profile is the fastest path to correcting multiple payer directories at once.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={portalInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: colors.blue,
              color: colors.white,
              padding: '8px 14px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            Open CAQH ProView
          </a>
          <button
            onClick={() => setShowCaqhGuide(!showCaqhGuide)}
            style={{
              background: colors.white,
              color: colors.blue,
              border: `1px solid ${colors.blue}`,
              padding: '8px 14px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {showCaqhGuide ? 'Hide guide' : 'Show update guide'}
          </button>
        </div>

        {showCaqhGuide && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: colors.white,
              borderRadius: 6,
              fontSize: 11,
              color: colors.gray600,
              lineHeight: 1.6,
            }}
          >
            <strong>Steps to update CAQH:</strong>
            <br />
            1. Log in to <strong>proview.caqh.org</strong>
            <br />
            2. Navigate to Practice Location section
            <br />
            3. Update the <strong>{fieldName}</strong> field to match the correct value
            <br />
            4. Click Re-attest to submit changes
            <br />
            5. Allow 5-10 business days for payers to pull the update
          </div>
        )}
      </div>

      {/* Payers that auto-pull from CAQH */}
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
            marginBottom: 8,
          }}
        >
          Payer update method
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(payerPortals)
            .filter(([key]) => !['nppes', 'pecos', 'tmb'].includes(key))
            .map(([key, portal]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: colors.white,
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 600, color: colors.navy }}>{portal.name}</span>
                <span
                  style={{
                    color: portal.pullsFromCaqh ? colors.green : colors.gold,
                    fontWeight: 600,
                    fontSize: 10,
                  }}
                >
                  {portal.pullsFromCaqh ? 'Auto via CAQH' : portal.method}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Back button */}
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
          alignSelf: 'flex-start',
        }}
      >
        &larr; Back to tasks
      </button>
    </div>
  );
}
