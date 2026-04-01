'use client';

import { colors } from '@/lib/design-tokens';
import { Loader2 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  type: string;
}

interface ReportPreviewTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export default function ReportPreviewTable({
  columns,
  rows,
  totalCount,
  page,
  pageSize,
  loading,
  onPageChange,
}: ReportPreviewTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  function formatCell(value: unknown, type: string): string {
    if (value === null || value === undefined) return '—';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'datetime') {
      const d = new Date(value as string);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    if (type === 'date') {
      const d = new Date(value as string);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    }
    if (type === 'json') {
      const str = JSON.stringify(value);
      return str.length > 60 ? str.slice(0, 57) + '...' : str;
    }
    if (type === 'status') {
      return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return String(value);
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={styles.loadingText}>Loading preview...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyText}>No data found. Try adjusting your filters.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.resultCount}>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
          {totalCount.toLocaleString()} rows
        </span>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
              {columns.map((col) => (
                <th key={col.key} style={styles.th}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  ...styles.tr,
                  background: i % 2 === 0 ? colors.white : colors.gray50,
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    {col.type === 'status' ? (
                      <span style={getStatusStyle(String(row[col.key] ?? ''))}>
                        {formatCell(row[col.key], col.type)}
                      </span>
                    ) : col.type === 'boolean' ? (
                      <span
                        style={{
                          color: row[col.key] ? colors.green : colors.gray400,
                          fontWeight: 600,
                        }}
                      >
                        {formatCell(row[col.key], col.type)}
                      </span>
                    ) : (
                      formatCell(row[col.key], col.type)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{
              ...styles.pageBtn,
              opacity: page <= 1 ? 0.4 : 1,
              cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            ← Previous
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{
              ...styles.pageBtn,
              opacity: page >= totalPages ? 0.4 : 1,
              cursor: page >= totalPages ? 'default' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const s = status.toLowerCase().replace(/\s/g, '_');
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: '#E6F7F2', color: '#1A9E6D' },
    resolved: { bg: '#E6F7F2', color: '#1A9E6D' },
    completed: { bg: '#E6F7F2', color: '#1A9E6D' },
    action_needed: { bg: '#FDEEEE', color: '#D64545' },
    in_progress: { bg: '#FDF6E3', color: '#D4A017' },
    awaiting: { bg: '#EEF4FF', color: '#185FA5' },
    onboarding: { bg: '#EEF4FF', color: '#185FA5' },
    pending: { bg: '#F4F5F7', color: '#9AA3AE' },
    cancelled: { bg: '#F4F5F7', color: '#9AA3AE' },
    departed: { bg: '#F4F5F7', color: '#9AA3AE' },
    departing: { bg: '#FDEEEE', color: '#D64545' },
  };
  const m = map[s] || { bg: colors.gray100, color: colors.gray600 };
  return {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: m.bg,
    color: m.color,
    whiteSpace: 'nowrap',
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden',
  },
  header: {
    padding: '10px 16px',
    borderBottom: `1px solid ${colors.gray200}`,
    background: colors.gray50,
  },
  resultCount: {
    ...typography.caption,
    color: colors.gray400,
  },
  tableWrapper: {
    overflowX: 'auto',
    maxHeight: 440,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  tableHead: {
    background: colors.navy,
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    color: colors.white,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  },
  tr: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'background 0.1s',
  },
  td: {
    padding: '7px 12px',
    color: colors.navy,
    fontSize: 12,
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '10px 16px',
    borderTop: `1px solid ${colors.gray200}`,
    background: colors.gray50,
  },
  pageBtn: {
    padding: '5px 12px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    background: colors.white,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  pageInfo: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: 500,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 40,
    color: colors.gray400,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray400,
  },
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray400,
  },
};
