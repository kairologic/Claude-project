'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { colors } from '@/lib/design-tokens';

interface SearchBarProps {
  practiceId: string;
}

interface SearchResult {
  explanation: string;
  data: Array<Record<string, unknown>>;
  rowCount: number;
  columns: string[];
}

interface RecentQuery {
  id: string;
  query: string;
  timestamp: string;
}

export default function SearchBar({ practiceId }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholderQueries = [
    'Which providers have licenses expiring?',
    'Show me all address mismatches',
    'Who is not listed in Cigna?',
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholderQueries.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholderQueries.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !focused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focused]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFocused(false);
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestedQueries = [
    'License expiring in 90 days',
    'Address mismatches',
    'Not listed in any payer',
    'Recently departed providers',
    'Open correction workflows',
    'Providers added this month',
    'Weekly activity summary',
    'Payer coverage gaps',
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, query }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
      setFocused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestedQuery(q: string) {
    setQuery(q);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, query: q }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
      setFocused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentQueries() {
    try {
      const response = await fetch(`/api/search/recent?practice_id=${practiceId}`);
      if (response.ok) {
        const data = await response.json();
        setRecentQueries(data);
      }
    } catch (err) {
      console.error('Failed to load recent queries:', err);
    }
  }

  function handleInputFocus() {
    setFocused(true);
    setShowRecent(true);
    loadRecentQueries();
  }

  function downloadCSV() {
    if (!results) return;
    const csv = [
      results.columns.join(','),
      ...results.data.map(row =>
        results.columns.map(col => {
          const val = row[col];
          const str = typeof val === 'string' ? val : JSON.stringify(val);
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

  function downloadExcel() {
    if (!results) return;
    // Simplified Excel generation via CSV with proper headers
    const csvContent = [
      results.columns.join(','),
      ...results.data.map(row =>
        results.columns.map(col => {
          const val = row[col];
          const str = typeof val === 'string' ? val : JSON.stringify(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.container} ref={searchRef}>
      {/* Search bar */}
      <form onSubmit={handleSubmit} style={styles.searchForm}>
        <div style={styles.inputWrapper}>
          <Search size={18} color={colors.navyLight} style={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholderQueries[placeholderIndex]}
            style={styles.input}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults(null);
                setError(null);
              }}
              style={styles.clearBtn}
            >
              ✕
            </button>
          )}
          {loading && <Loader2 size={18} style={styles.spinner} />}
        </div>
      </form>

      {/* Suggestions when focused and empty */}
      {focused && !query && !results && (
        <div style={styles.suggestionsPanel}>
          <div style={styles.suggestionsGrid}>
            {suggestedQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuery(q)}
                style={styles.suggestedButton}
              >
                {q}
              </button>
            ))}
          </div>
          {recentQueries.length > 0 && (
            <div style={styles.recentSection}>
              <div style={styles.recentLabel}>Recent searches</div>
              {recentQueries.slice(0, 5).map(rq => (
                <button
                  key={rq.id}
                  onClick={() => handleSuggestedQuery(rq.query)}
                  style={styles.recentItem}
                >
                  {rq.query}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={styles.errorPanel}>
          <div style={styles.errorText}>{error}</div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div style={styles.resultsPanel}>
          {/* Explanation */}
          <div style={styles.explanation}>{results.explanation}</div>

          {/* Row count */}
          <div style={styles.rowCount}>{results.rowCount} result{results.rowCount !== 1 ? 's' : ''}</div>

          {/* Data table */}
          {results.data.length > 0 && (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    {results.columns.map(col => (
                      <th key={col} style={styles.tableHeaderCell}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.data.map((row, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.tableRow : { ...styles.tableRow, background: colors.gray100 }}>
                      {results.columns.map(col => (
                        <td key={col} style={styles.tableCell}>
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action buttons */}
          <div style={styles.actionButtons}>
            <button onClick={downloadCSV} style={styles.button}>
              Download CSV
            </button>
            <button onClick={downloadExcel} style={styles.button}>
              Download Excel
            </button>
            <button style={{ ...styles.button, background: colors.gold, color: colors.navy, fontWeight: 600 }}>
              Save as Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 600,
  },
  searchForm: {
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: colors.white,
    border: `1.5px solid ${colors.gray300}`,
    borderRadius: 8,
    padding: '0 12px',
    height: 44,
    transition: 'border-color .2s',
  },
  searchIcon: {
    flexShrink: 0,
    marginRight: 8,
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    color: colors.navy,
  } as React.CSSProperties,
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: colors.gray400,
    cursor: 'pointer',
    padding: 4,
    fontSize: 16,
    flexShrink: 0,
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    flexShrink: 0,
    color: colors.green,
  },
  suggestionsPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    background: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    zIndex: 100,
    padding: 12,
    maxHeight: 400,
    overflowY: 'auto',
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  suggestedButton: {
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
  recentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${colors.gray200}`,
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  recentItem: {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    color: colors.navyLight,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderRadius: 4,
  },
  errorPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    background: `${colors.red}15`,
    border: `1px solid ${colors.red}40`,
    borderRadius: 8,
    padding: 12,
    zIndex: 100,
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: 500,
  },
  resultsPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    background: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    zIndex: 100,
    padding: 16,
    maxHeight: 600,
    overflowY: 'auto',
  },
  explanation: {
    fontSize: 13,
    color: colors.navy,
    marginBottom: 12,
    lineHeight: 1.5,
  },
  rowCount: {
    fontSize: 11,
    color: colors.gray400,
    marginBottom: 12,
    fontWeight: 600,
  },
  tableWrapper: {
    marginBottom: 12,
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
  },
  tableHeader: {
    background: colors.gray100,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  tableHeaderCell: {
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontWeight: 700,
    color: colors.navy,
    borderRight: `1px solid ${colors.gray200}`,
  },
  tableRow: {
    borderBottom: `1px solid ${colors.gray200}`,
    background: colors.white,
  },
  tableCell: {
    padding: '8px 10px',
    color: colors.navy,
    borderRight: `1px solid ${colors.gray200}`,
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  button: {
    padding: '8px 12px',
    background: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    color: colors.navy,
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
};
