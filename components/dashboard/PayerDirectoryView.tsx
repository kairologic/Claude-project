/**
 * components/dashboard/PayerDirectoryView.tsx
 *
 * Full-width "Your Data Across Sources" grid.
 * Rows = providers, Columns = payers.
 * Each cell shows match / mismatch / not listed / no data.
 * Click a cell to expand field-level detail.
 */

'use client';

import { useState } from 'react';
import { colors, typography, spacing, shadows, transitions, radii } from '@/lib/design-tokens';
import { Tooltip } from './ui';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PayerEndpointData {
  payer_code: string;
  payer_name: string;
  is_active: boolean;
}

interface SnapshotSummary {
  npi: string;
  payer_code: string;
  snapshot_date: string;
  listed_name_full: string | null;
  listed_address_line1: string | null;
  listed_city: string | null;
  listed_state: string | null;
  listed_zip: string | null;
  listed_phone: string | null;
  listed_specialty_display: string | null;
  listed_accepting_patients: boolean | null;
}

interface MismatchData {
  npi: string;
  payer_code: string;
  field_name: string;
  mismatch_type: string;
  nppes_value: string | null;
  payer_value: string | null;
  priority: number;
}

interface ProviderRow {
  npi: string;
  provider_name: string;
  roster_status: string;
  // NPPES baseline
  nppes_address: string | null;
  nppes_phone: string | null;
  nppes_specialty: string | null;
}

interface PayerDirectoryViewProps {
  providers: ProviderRow[];
  payers: PayerEndpointData[];
  snapshots: SnapshotSummary[];
  mismatches: MismatchData[];
  practiceId: string;
}

// ─── Cell status helpers ────────────────────────────────────────────────────

type CellStatus = 'matched' | 'mismatch' | 'not_listed' | 'no_data' | 'inactive';

function getCellStatus(
  npi: string,
  payerCode: string,
  payerActive: boolean,
  snapshots: SnapshotSummary[],
  mismatches: MismatchData[],
): { status: CellStatus; mismatchCount: number; snapshot: SnapshotSummary | null } {
  if (!payerActive) return { status: 'inactive', mismatchCount: 0, snapshot: null };

  const snap = snapshots.find((s) => s.npi === npi && s.payer_code === payerCode) || null;
  if (!snap) return { status: 'no_data', mismatchCount: 0, snapshot: null };
    if (!snap.listed_name_full) return { status: 'not_listed', mismatchCount: 0, snapshot: snap };

  if (!snap.listed_name_full) return { status: 'not_listed', mismatchCount: 0, snapshot: snap };

  // Helper function
  const matchesNpi = (m: MismatchData) => m.npi === npi || m.npi === 'PRACTICE';

  // Check for not_listed
  const notListed = mismatches.find(
    (m) =>
      matchesNpi(m) &&
      m.payer_code === payerCode &&
      (m.mismatch_type === 'not_listed' || m.mismatch_type === 'acceptance_gap'),
  );
  if (notListed) return { status: 'not_listed', mismatchCount: 1, snapshot: snap };

  const cellMismatches = mismatches.filter((m) => matchesNpi(m) && m.payer_code === payerCode);
  if (cellMismatches.length > 0) {
    return { status: 'mismatch', mismatchCount: cellMismatches.length, snapshot: snap };
  }

  return { status: 'matched', mismatchCount: 0, snapshot: snap };
}

const cellStyles: Record<CellStatus, { bg: string; color: string; label: string; icon: string }> = {
  matched: { bg: colors.greenPale, color: colors.green, label: 'Matched', icon: '✓' },
  mismatch: { bg: colors.goldPale, color: colors.gold, label: 'Mismatch', icon: '⚠' },
  not_listed: { bg: colors.redPale, color: colors.red, label: 'Not listed', icon: '✕' },
  no_data: { bg: colors.gray100, color: colors.gray400, label: 'No data', icon: '—' },
  inactive: { bg: colors.gray100, color: colors.gray400, label: 'Not connected', icon: '·' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PayerDirectoryView({
  providers,
  payers,
  snapshots,
  mismatches,
  practiceId,
}: PayerDirectoryViewProps) {
  const [expandedCell, setExpandedCell] = useState<{ npi: string; payer: string } | null>(null);
  const [filter, setFilter] = useState<CellStatus | 'all'>('all');

  const activePayers = payers.filter((p) => p.is_active);
  const allPayers = payers;

  // Build summary counts
  const summary = { matched: 0, mismatch: 0, not_listed: 0, no_data: 0, inactive: 0 };
  providers.forEach((prov) => {
    allPayers.forEach((payer) => {
      const { status } = getCellStatus(
        prov.npi,
        payer.payer_code,
        payer.is_active,
        snapshots,
        mismatches,
      );
      summary[status]++;
    });
  });

  // Filter rows: show provider if any of their cells match filter
  const filteredProviders =
    filter === 'all'
      ? providers
      : providers.filter((prov) =>
          allPayers.some((payer) => {
            const { status } = getCellStatus(
              prov.npi,
              payer.payer_code,
              payer.is_active,
              snapshots,
              mismatches,
            );
            return status === filter;
          }),
        );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{ ...typography.h2, color: colors.navy, margin: 0 }}>
          Your data across payer directories
        </h2>
        <p
          style={{
            ...typography.bodySmall,
            color: colors.gray600,
            margin: `${spacing.xs} 0 0`,
            lineHeight: 1.4,
          }}
        >
          Side-by-side view of how each provider appears in insurance company directories.
          Mismatches can cause claim denials and patient routing errors.
        </p>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <FilterPill
          label="All"
          count={providers.length * allPayers.length}
          active={filter === 'all'}
          color={colors.navy}
          onClick={() => setFilter('all')}
        />
        <FilterPill
          label="Matched"
          count={summary.matched}
          active={filter === 'matched'}
          color={colors.green}
          onClick={() => setFilter('matched')}
        />
        <FilterPill
          label="Mismatch"
          count={summary.mismatch}
          active={filter === 'mismatch'}
          color={colors.gold}
          onClick={() => setFilter('mismatch')}
        />
        <FilterPill
          label="Not listed"
          count={summary.not_listed}
          active={filter === 'not_listed'}
          color={colors.red}
          onClick={() => setFilter('not_listed')}
        />
        <FilterPill
          label="No data"
          count={summary.no_data}
          active={filter === 'no_data'}
          color={colors.gray400}
          onClick={() => setFilter('no_data')}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          background: '#fff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.gray200}`,
          overflow: 'auto',
          boxShadow: shadows.xs,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', ...typography.bodySmall }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${colors.gray200}` }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: `${spacing.sm} ${spacing.md}`,
                  ...typography.label,
                  color: colors.gray400,
                  position: 'sticky',
                  left: 0,
                  background: '#fff',
                  zIndex: 2,
                  minWidth: 200,
                }}
              >
                Provider
              </th>
              {allPayers.map((payer) => (
                <th
                  key={payer.payer_code}
                  style={{
                    textAlign: 'center',
                    padding: `${spacing.sm} ${spacing.xs}`,
                    ...typography.label,
                    color: colors.gray400,
                    minWidth: 110,
                  }}
                >
                  <Tooltip
                    text={
                      payer.is_active ? 'Connected via FHIR PDex Plan-Net' : 'Not yet connected'
                    }
                  >
                    <span
                      style={{
                        cursor: 'help',
                        opacity: payer.is_active ? 1 : 0.5,
                        transition: transitions.base,
                      }}
                    >
                      {payer.payer_name}
                      {!payer.is_active && (
                        <span
                          style={{
                            ...typography.caption,
                            display: 'block',
                            fontWeight: 500,
                            marginTop: spacing.xs,
                          }}
                        >
                          not connected
                        </span>
                      )}
                    </span>
                  </Tooltip>
                </th>
              ))}
              <th
                style={{
                  textAlign: 'center',
                  padding: `${spacing.sm} ${spacing.xs}`,
                  ...typography.label,
                  color: colors.gray400,
                  minWidth: 80,
                }}
              >
                NPPES
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProviders.map((prov, idx) => {
              const isExpRow = expandedCell?.npi === prov.npi;
              return (
                <ProviderGridRow
                  key={prov.npi}
                  provider={prov}
                  payers={allPayers}
                  snapshots={snapshots}
                  mismatches={mismatches}
                  isLast={idx === filteredProviders.length - 1}
                  expandedPayer={isExpRow ? expandedCell?.payer || null : null}
                  onCellClick={(payerCode) => {
                    if (expandedCell?.npi === prov.npi && expandedCell?.payer === payerCode) {
                      setExpandedCell(null);
                    } else {
                      setExpandedCell({ npi: prov.npi, payer: payerCode });
                    }
                  }}
                />
              );
            })}
            {filteredProviders.length === 0 && (
              <tr>
                <td
                  colSpan={allPayers.length + 2}
                  style={{
                    padding: spacing['3xl'],
                    textAlign: 'center',
                    color: colors.gray400,
                    ...typography.body,
                  }}
                >
                  No providers match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: spacing.lg, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        {(['matched', 'mismatch', 'not_listed', 'no_data', 'inactive'] as CellStatus[]).map((s) => (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              ...typography.caption,
              color: colors.gray600,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: radii.sm,
                background: cellStyles[s].bg,
                border: `1px solid ${cellStyles[s].color}40`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                color: cellStyles[s].color,
                fontWeight: 700,
              }}
            >
              {cellStyles[s].icon}
            </span>
            {cellStyles[s].label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FilterPill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xxs} ${spacing.md}`,
        borderRadius: radii.full,
        border: `1px solid ${active ? color : colors.gray200}`,
        background: active ? `${color}12` : '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        ...typography.caption,
        fontWeight: active ? 700 : 500,
        color: active ? color : colors.gray600,
        transition: transitions.fast,
      }}
    >
      {label}
      <span
        style={{
          background: active ? color : colors.gray200,
          color: active ? '#fff' : colors.gray600,
          ...typography.caption,
          fontWeight: 700,
          padding: `${spacing.xxs} ${spacing.xs}`,
          borderRadius: radii.full,
          minWidth: 18,
          textAlign: 'center',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function ProviderGridRow({
  provider,
  payers,
  snapshots,
  mismatches,
  isLast,
  expandedPayer,
  onCellClick,
}: {
  provider: ProviderRow;
  payers: PayerEndpointData[];
  snapshots: SnapshotSummary[];
  mismatches: MismatchData[];
  isLast: boolean;
  expandedPayer: string | null;
  onCellClick: (payerCode: string) => void;
}) {
  const borderStyle = isLast ? 'none' : `1px solid ${colors.gray100}`;

  return (
    <>
      <tr style={{ borderBottom: expandedPayer ? 'none' : borderStyle }}>
        {/* Provider name + NPI */}
        <td
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            position: 'sticky',
            left: 0,
            background: '#fff',
            zIndex: 1,
            transition: transitions.base,
          }}
        >
          <div style={{ ...typography.body, fontWeight: 600, color: colors.navy }}>
            {provider.provider_name}
          </div>
          <div style={{ ...typography.caption, color: colors.gray400, marginTop: spacing.xxs }}>
            NPI {provider.npi}
          </div>
        </td>

        {/* Payer cells */}
        {payers.map((payer) => {
          const { status, mismatchCount } = getCellStatus(
            provider.npi,
            payer.payer_code,
            payer.is_active,
            snapshots,
            mismatches,
          );
          const style = cellStyles[status];
          const isExpanded = expandedPayer === payer.payer_code;
          const isClickable = status !== 'inactive' && status !== 'no_data';

          return (
            <td
              key={payer.payer_code}
              style={{ padding: `${spacing.xs} ${spacing.xs}`, textAlign: 'center' }}
            >
              <button
                onClick={() => isClickable && onCellClick(payer.payer_code)}
                disabled={!isClickable}
                style={{
                  width: '100%',
                  padding: `${spacing.xs} ${spacing.xxs}`,
                  borderRadius: radii.md,
                  background: isExpanded ? style.color : style.bg,
                  color: isExpanded ? '#fff' : style.color,
                  border: `1px solid ${style.color}30`,
                  cursor: isClickable ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  ...typography.label,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  transition: transitions.fast,
                  opacity: isClickable ? 1 : 0.6,
                  boxShadow: isExpanded ? shadows.sm : 'none',
                }}
              >
                <span>{style.icon}</span>
                <span>
                  {status === 'mismatch'
                    ? `${mismatchCount} issue${mismatchCount > 1 ? 's' : ''}`
                    : style.label}
                </span>
              </button>
            </td>
          );
        })}

        {/* NPPES column (baseline) */}
        <td style={{ padding: `${spacing.xs} ${spacing.xs}`, textAlign: 'center' }}>
          <Tooltip text="NPPES is the source of truth for provider data">
            <span
              style={{
                display: 'inline-block',
                padding: `${spacing.xs} ${spacing.xxs}`,
                borderRadius: radii.md,
                background: colors.bluePale,
                color: colors.blue,
                ...typography.label,
                fontWeight: 700,
                width: '100%',
                transition: transitions.fast,
                cursor: 'help',
              }}
            >
              ✓ Source
            </span>
          </Tooltip>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expandedPayer && (
        <tr style={{ borderBottom: borderStyle, animation: `fadeIn ${transitions.base}` }}>
          <td colSpan={payers.length + 2} style={{ padding: 0, overflow: 'hidden' }}>
            <CellDetailPanel
              provider={provider}
              payerCode={expandedPayer}
              payerName={
                payers.find((p) => p.payer_code === expandedPayer)?.payer_name || expandedPayer
              }
              snapshots={snapshots}
              mismatches={mismatches}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function CellDetailPanel({
  provider,
  payerCode,
  payerName,
  snapshots,
  mismatches,
}: {
  provider: ProviderRow;
  payerCode: string;
  payerName: string;
  snapshots: SnapshotSummary[];
  mismatches: MismatchData[];
}) {
  const snap = snapshots.find((s) => s.npi === provider.npi && s.payer_code === payerCode);
  const cellMismatches = mismatches.filter(
    (m) => m.npi === provider.npi && m.payer_code === payerCode,
  );
  const isNotListed = cellMismatches.some((m) => m.mismatch_type === 'not_listed');

  if (isNotListed) {
    return (
      <div
        style={{
          padding: `${spacing.md} ${spacing.md} ${spacing.lg}`,
          background: colors.redPale,
          borderTop: `1px solid ${colors.red}20`,
          transition: transitions.base,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs,
          }}
        >
          <span style={{ fontSize: 14 }}>🚫</span>
          <span style={{ ...typography.body, fontWeight: 700, color: colors.red }}>
            {provider.provider_name} is not listed in {payerName}
          </span>
        </div>
        <p style={{ ...typography.bodySmall, color: colors.gray600, margin: 0, lineHeight: 1.5 }}>
          This provider was not found in {payerName}'s directory. Patients searching for in-network
          providers won't find them. Update via CAQH ProView to propagate to this payer.
        </p>
      </div>
    );
  }

  // Field comparison rows
  const fields = [
    {
      label: 'Address',
      nppes: provider.nppes_address,
      payer: snap
        ? `${snap.listed_address_line1 || ''}${snap.listed_city ? ', ' + snap.listed_city : ''}${snap.listed_state ? ' ' + snap.listed_state : ''} ${snap.listed_zip || ''}`.trim()
        : null,
    },
    { label: 'Phone', nppes: provider.nppes_phone, payer: snap?.listed_phone ?? null },
    {
      label: 'Specialty',
      nppes: provider.nppes_specialty,
      payer: snap?.listed_specialty_display ?? null,
    },
    {
      label: 'Accepting patients',
      nppes: null,
      payer:
        snap?.listed_accepting_patients != null
          ? snap.listed_accepting_patients
            ? 'Yes'
            : 'No'
          : null,
    },
  ];

  return (
    <div
      style={{
        padding: `${spacing.md} ${spacing.md} ${spacing.lg}`,
        background: colors.gray50,
        borderTop: `1px solid ${colors.gray200}`,
        transition: transitions.base,
      }}
    >
      <div
        style={{
          ...typography.caption,
          fontWeight: 700,
          color: colors.navy,
          marginBottom: spacing.md,
        }}
      >
        Field comparison: NPPES vs {payerName}
        {snap?.snapshot_date && (
          <span style={{ fontWeight: 400, color: colors.gray400, marginLeft: spacing.md }}>
            Last synced {new Date(snap.snapshot_date).toLocaleDateString()}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 1fr',
          gap: 0,
          ...typography.bodySmall,
        }}
      >
        {/* Header */}
        <div style={detailHeaderCell}>Field</div>
        <div style={detailHeaderCell}>NPPES (source)</div>
        <div style={detailHeaderCell}>{payerName}</div>

        {fields.map((f) => {
          const mismatch = cellMismatches.find((m) => m.field_name === f.label.toLowerCase());
          return (
            <FieldRow
              key={f.label}
              label={f.label}
              nppes={f.nppes}
              payer={f.payer}
              hasMismatch={!!mismatch}
            />
          );
        })}
      </div>

      {cellMismatches.length > 0 && (
        <div
          style={{
            marginTop: spacing.md,
            ...typography.caption,
            color: colors.gray600,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: colors.gold }}>Recommended fix:</strong> Update CAQH ProView with
          corrected values. Changes typically propagate to payer directories within 30 days.
        </div>
      )}
    </div>
  );
}

const detailHeaderCell: React.CSSProperties = {
  padding: `${spacing.xs} ${spacing.xs}`,
  ...typography.label,
  fontWeight: 700,
  color: colors.gray400,
  borderBottom: `1px solid ${colors.gray200}`,
};

function FieldRow({
  label,
  nppes,
  payer,
  hasMismatch,
}: {
  label: string;
  nppes: string | null;
  payer: string | null;
  hasMismatch: boolean;
}) {
  return (
    <>
      <div
        style={{
          padding: `${spacing.xs} ${spacing.xs}`,
          fontWeight: 600,
          color: colors.navy,
          borderBottom: `1px solid ${colors.gray100}`,
          transition: transitions.base,
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: `${spacing.xs} ${spacing.xs}`,
          color: colors.gray600,
          borderBottom: `1px solid ${colors.gray100}`,
          background: hasMismatch ? colors.greenPale : 'transparent',
          transition: transitions.base,
        }}
      >
        {nppes || <span style={{ color: colors.gray400 }}>—</span>}
        {hasMismatch && (
          <span
            style={{
              ...typography.caption,
              fontWeight: 700,
              color: colors.green,
              marginLeft: spacing.xs,
            }}
          >
            SOURCE
          </span>
        )}
      </div>
      <div
        style={{
          padding: `${spacing.xs} ${spacing.xs}`,
          color: hasMismatch ? colors.red : colors.gray600,
          fontWeight: hasMismatch ? 600 : 400,
          borderBottom: `1px solid ${colors.gray100}`,
          background: hasMismatch ? colors.redPale : 'transparent',
          transition: transitions.base,
        }}
      >
        {payer || <span style={{ color: colors.gray400 }}>—</span>}
        {hasMismatch && (
          <span
            style={{
              ...typography.caption,
              fontWeight: 700,
              color: colors.red,
              marginLeft: spacing.xs,
            }}
          >
            DIFFERS
          </span>
        )}
      </div>
    </>
  );
}
