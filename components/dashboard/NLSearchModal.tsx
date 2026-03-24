/**
 * components/dashboard/NLSearchModal.tsx
 *
 * Command-palette style NL search modal, triggered from the header bar.
 * Opens as a centered modal (⌘K / click). Sends natural language queries
 * to /api/search/query, displays results in a table with CSV/Excel export.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { colors } from '@/lib/design-tokens';

interface NLSearchModalProps {
  practiceId: string;
}

interface SearchResult {
  explanation: string;
  data: Array<Record<string, unknown>>;
  rowCount: number;
  columns: string[];
}

export default function NLSearchModal({ practiceId }: NLSearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedQueries = [
    'List providers with licenses expiring soon',
    'How many providers need address changes?',
    'NPPES fixes in the last 30 days',
    'Show providers not listed in any payer directory',
    'Open correction workflows by type',
    'Provider health scores ranked lowest first',
    'Providers added this month',
    'Payer directory mismatches by payer',
  ];

  const placeholderQueries = [
    'List providers whose license is expiring...',
    'How many NPPES fixes this month?',
    'Which providers have address mismatches?',
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholderQueries.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // ⌘K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    setError(null);
  }

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, query: q }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Search failed');
      }

      const data = await response.json();
      setResults({
        explanation: data.explanation,
        data: data.data || [],
        rowCount: data.rowCount,
        columns: data.columns || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function downloadCSV() {
    if (!results) return;
    const csv = [
      results.columns.join(','),
      ...results.data.map(row =>
        results.columns.map(col => {
          const val = row[col];
          const str = val == null ? '' : typeof val === 'string' ? val : JSON.stringify(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        style={styles.triggerButton}
        title="Natural Language Search (⌘K)"
      >
        <span style={{ fontSize: 14 }}>🔍</span>
        <span style={styles.triggerLabel}>Ask anything...</span>
        <kbd style={styles.kbd}>⌘K</kbd>
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={styles.backdrop} onClick={handleClose}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Search input */}
            <form onSubmit={handleSubmit} style={styles.inputRow}>
              <span style={{ fontSize: 16, flexShrink: 0, marginRight: 10 }}>🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholderQueries[placeholderIndex]}
                style={styles.input}
                autoFocus
              />
              {loading && (
                <div style={styles.spinner} />
              )}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults(null); setError(null); }}
                  style={styles.clearBtn}
                >✕</button>
              )}
            </form>

            {/* Content area */}
            <div style={styles.body}>
              {/* Suggestions — show when no query */}
              {!query && !results && !loading && (
                <div style={styles.suggestionsArea}>
                  <div style={styles.sectionLabel}>Suggested queries</div>
                  <div style={styles.suggestionsGrid}>
                    {suggestedQueries.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(q)}
                        style={styles.suggestionChip}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={styles.errorBox}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div style={styles.loadingArea}>
                  <div style={styles.spinnerLarge} />
                  <span style={{ fontSize: 13, color: colors.gray400 }}>Analyzing your question...</span>
                </div>
              )}

              {/* Results */}
              {results && !loading && (
                <div>
                  {/* Explanation */}
                  <div style={styles.explanation}>{results.explanation}</div>
                  <div style={styles.rowCount}>
                    {results.rowCount} result{results.rowCount !== 1 ? 's' : ''}
                    <button onClick={downloadCSV} style={styles.exportBtn}>⬇ CSV</button>
                  </div>

                  {/* Table */}
                  {results.data.length > 0 && (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {results.columns.map(col => (
                              <th key={col} style={styles.th}>{col.replace(/_/g, ' ')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.data.slice(0, 50).map((row, i) => (
                            <tr key={i} style={i % 2 === 0 ? {} : { background: colors.gray100 }}>
                              {results.columns.map(col => (
                                <td key={col} style={styles.td}>
                                  {row[col] == null ? '—' : typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {results.data.length > 50 && (
                        <div style={{ padding: '8px 12px', fontSize: 11, color: colors.gray400, textAlign: 'center' }}>
                          Showing 50 of {results.rowCount} rows. Download CSV for full results.
                        </div>
                      )}
                    </div>
                  )}

                  {results.data.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: colors.gray400 }}>
                      No matching records found.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div style={styles.footer}>
              <span style={{ color: colors.gray400, fontSize: 11 }}>
                Ask in plain English — e.g. "providers with expired licenses" or "mismatches by payer"
              </span>
              <kbd style={{ ...styles.kbd, fontSize: 10 }}>ESC</kbd>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes nlspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  triggerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    background: colors.gray100,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    color: colors.gray400,
    transition: 'border-color .15s, background .15s',
    minWidth: 220,
  },
  triggerLabel: {
    flex: 1,
    textAlign: 'left',
    fontWeight: 500,
  },
  kbd: {
    padding: '2px 5px',
    background: colors.gray200,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'inherit',
    color: colors.gray400,
    fontWeight: 600,
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 30, 46, 0.5)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '10vh',
    zIndex: 500,
  },
  modal: {
    width: '90%',
    maxWidth: 720,
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 20px 60px rgba(0,0,0,.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '75vh',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    color: colors.navy,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: colors.gray400,
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    flexShrink: 0,
  },
  spinner: {
    width: 16,
    height: 16,
    border: `2px solid ${colors.gray200}`,
    borderTopColor: colors.green,
    borderRadius: '50%',
    animation: 'nlspin 0.7s linear infinite',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '0',
  },
  suggestionsArea: {
    padding: '16px 18px',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: colors.gray400,
    marginBottom: 10,
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  suggestionChip: {
    padding: '8px 10px',
    background: colors.gray100,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    color: colors.navy,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
  errorBox: {
    margin: '12px 18px',
    padding: '10px 14px',
    background: `${colors.red}12`,
    border: `1px solid ${colors.red}40`,
    borderRadius: 8,
    fontSize: 12,
    color: colors.red,
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: 32,
  },
  spinnerLarge: {
    width: 28,
    height: 28,
    border: `3px solid ${colors.gray200}`,
    borderTopColor: colors.green,
    borderRadius: '50%',
    animation: 'nlspin 0.7s linear infinite',
  },
  explanation: {
    fontSize: 13,
    color: colors.navy,
    padding: '14px 18px 6px',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  rowCount: {
    fontSize: 11,
    color: colors.gray400,
    padding: '0 18px 10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  exportBtn: {
    padding: '3px 8px',
    background: colors.gray100,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    color: colors.navy,
    fontFamily: 'inherit',
  },
  tableWrapper: {
    overflowX: 'auto',
    margin: '0 18px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: 700,
    color: colors.navy,
    background: colors.gray100,
    borderBottom: `1px solid ${colors.gray200}`,
    whiteSpace: 'nowrap',
    textTransform: 'capitalize',
  },
  td: {
    padding: '7px 10px',
    color: colors.navy,
    borderBottom: `1px solid ${colors.gray200}`,
    whiteSpace: 'nowrap',
    maxWidth: 250,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    padding: '10px 18px',
    borderTop: `1px solid ${colors.gray200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};
