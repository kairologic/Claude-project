'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { colors, statusColors, statusLabels } from '@/lib/design-tokens';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';

interface GlobalSearchProps {
  practiceId: string;
  onSelectWorkflow: (id: string) => void;
}

interface WorkflowResult {
  type: 'workflow';
  id: string;
  primaryText: string;
  secondaryText: string;
  status: string;
  icon: string;
}

interface ProviderResult {
  type: 'provider';
  id: string;
  primaryText: string;
  secondaryText: string;
  status: string;
  icon: string;
}

interface AlertResult {
  type: 'alert';
  id: string;
  primaryText: string;
  secondaryText: string;
  severity: string;
  icon: string;
}

type SearchResult = WorkflowResult | ProviderResult | AlertResult;

interface RecentSearch {
  query: string;
  timestamp: number;
}

export default function GlobalSearch({ practiceId, onSelectWorkflow }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`recent-searches-${practiceId}`);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
  }, [practiceId]);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const searchTerm = `%${q}%`;

        // Parallel queries for all three data types
        const [workflowsRes, providersRes, alertsRes] = await Promise.all([
          supabase
            .from('workflow_instances')
            .select('id, provider_name, finding_summary, status')
            .eq('practice_id', practiceId)
            .or(`provider_name.ilike.${searchTerm},finding_summary.ilike.${searchTerm}`)
            .limit(5),

          supabase
            .from('practice_providers')
            .select('id, provider_name, npi, status')
            .eq('practice_id', practiceId)
            .or(`provider_name.ilike.${searchTerm},npi.eq.${q}`)
            .limit(5),

          supabase
            .from('alerts')
            .select('id, title, description, severity')
            .eq('practice_id', practiceId)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
        ]);

        const combined: SearchResult[] = [];

        if (workflowsRes.data) {
          workflowsRes.data.forEach((w) => {
            combined.push({
              type: 'workflow',
              id: w.id,
              primaryText: w.provider_name || 'Unknown provider',
              secondaryText: w.finding_summary || 'No summary',
              status: w.status || 'awaiting',
              icon: '⚙',
            });
          });
        }

        if (providersRes.data) {
          providersRes.data.forEach((p) => {
            combined.push({
              type: 'provider',
              id: p.id,
              primaryText: p.provider_name || 'Unknown',
              secondaryText: p.npi || 'No NPI',
              status: p.status || 'active',
              icon: '👤',
            });
          });
        }

        if (alertsRes.data) {
          alertsRes.data.forEach((a) => {
            combined.push({
              type: 'alert',
              id: a.id,
              primaryText: a.title || 'Untitled alert',
              secondaryText: a.description || '',
              severity: a.severity || 'info',
              icon: '🔔',
            });
          });
        }

        setResults(combined);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [practiceId],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelectResult = (result: SearchResult) => {
    // Save to recent searches
    const updated = [
      { query: result.primaryText, timestamp: Date.now() },
      ...recentSearches.filter((r) => r.query !== result.primaryText),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(`recent-searches-${practiceId}`, JSON.stringify(updated));

    // Navigate
    if (result.type === 'workflow') {
      onSelectWorkflow(result.id);
    } else if (result.type === 'provider') {
      // Could navigate to provider detail or emit event
      console.log('Selected provider:', result.id);
    } else if (result.type === 'alert') {
      // Could navigate to alert detail
      console.log('Selected alert:', result.id);
    }

    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const visibleResults = query.trim() ? results : [];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < visibleResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (visibleResults[selectedIndex]) {
        handleSelectResult(visibleResults[selectedIndex]);
      }
    }
  };

  const groupedResults = useMemo(() => {
    const workflows = results.filter((r) => r.type === 'workflow');
    const providers = results.filter((r) => r.type === 'provider');
    const alerts = results.filter((r) => r.type === 'alert');

    return {
      workflows: workflows.length > 0 ? workflows : null,
      providers: providers.length > 0 ? providers : null,
      alerts: alerts.length > 0 ? alerts : null,
    };
  }, [results]);

  const isShowingEmpty = query.trim() === '' && !loading;
  const isShowingNoResults = query.trim() !== '' && results.length === 0 && !loading;

  return (
    <div style={styles.container}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        style={styles.searchButton}
        title="Search (⌘K)"
      >
        <span style={styles.searchIcon}>🔍</span>
      </button>

      {isOpen && (
        <div style={styles.modalBackdrop} onClick={() => setIsOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search providers, workflows, alerts... (⌘K)"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              style={styles.searchInput}
            />

            <div
              ref={dropdownRef}
              style={{
                ...styles.dropdown,
                display: isOpen ? 'block' : 'none',
              }}
            >
              {isShowingEmpty && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyText}>
                    {recentSearches.length > 0 ? 'Recent searches' : 'Start typing to search'}
                  </div>
                  {recentSearches.length > 0 && (
                    <div style={styles.recentList}>
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQueryChange(search.query)}
                          style={styles.recentItem}
                        >
                          <span style={styles.recentIcon}>🕐</span>
                          <span style={styles.recentText}>{search.query}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loading && (
                <div style={styles.loadingState}>
                  <span style={styles.loadingText}>Searching...</span>
                </div>
              )}

              {isShowingNoResults && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyText}>No results found</div>
                </div>
              )}

              {!isShowingEmpty && !isShowingNoResults && !loading && (
                <>
                  {groupedResults.workflows && (
                    <div>
                      <div style={styles.categoryHeader}>Workflows</div>
                      {groupedResults.workflows.map((result, idx) => (
                        <SearchResultItem
                          key={result.id}
                          result={result as WorkflowResult}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleSelectResult(result)}
                          onHover={() => setSelectedIndex(results.indexOf(result))}
                        />
                      ))}
                    </div>
                  )}

                  {groupedResults.providers && (
                    <div>
                      <div style={styles.categoryHeader}>Providers</div>
                      {groupedResults.providers.map((result, idx) => (
                        <SearchResultItem
                          key={result.id}
                          result={result as ProviderResult}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleSelectResult(result)}
                          onHover={() => setSelectedIndex(results.indexOf(result))}
                        />
                      ))}
                    </div>
                  )}

                  {groupedResults.alerts && (
                    <div>
                      <div style={styles.categoryHeader}>Alerts</div>
                      {groupedResults.alerts.map((result, idx) => (
                        <SearchResultItem
                          key={result.id}
                          result={result as AlertResult}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleSelectResult(result)}
                          onHover={() => setSelectedIndex(results.indexOf(result))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}

function SearchResultItem({ result, isSelected, onClick, onHover }: SearchResultItemProps) {
  let statusColor: string = colors.gray400;
  let statusLabel = '';

  if (result.type === 'workflow') {
    statusColor = statusColors[result.status as keyof typeof statusColors] || colors.gray400;
    statusLabel = statusLabels[result.status as keyof typeof statusLabels] || result.status;
  } else if (result.type === 'provider') {
    const statusMap: Record<string, string> = {
      active: colors.green,
      onboarding: colors.blue,
      departing: colors.red,
      departed: colors.gray400,
    };
    statusColor = statusMap[result.status] || colors.gray400;
    statusLabel = result.status;
  } else if (result.type === 'alert') {
    const severityMap: Record<string, string> = {
      action: colors.red,
      warning: colors.gold,
      info: colors.blue,
      resolved: colors.green,
    };
    statusColor = severityMap[result.severity] || colors.gray400;
    statusLabel = result.severity;
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        ...styles.resultItem,
        background: isSelected ? colors.gray100 : 'transparent',
      }}
    >
      <span style={styles.resultIcon}>{result.icon}</span>
      <div style={styles.resultContent}>
        <div style={styles.resultPrimary}>{result.primaryText}</div>
        <div style={styles.resultSecondary}>{result.secondaryText}</div>
      </div>
      <span
        style={{
          ...styles.resultStatus,
          color: statusColor,
        }}
      >
        {statusLabel}
      </span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  searchButton: {
    background: 'transparent',
    border: 'none',
    padding: '6px',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    transition: 'background 0.15s',
    color: colors.gray600,
  },
  searchIcon: {
    display: 'block',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '20vh',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    background: colors.white,
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 12,
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border 0.15s',
  },
  dropdown: {
    maxHeight: 400,
    overflowY: 'auto',
    borderTop: `1px solid ${colors.gray200}`,
  },
  categoryHeader: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '10px 12px 4px 12px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 12,
    transition: 'background 0.1s',
  },
  resultIcon: {
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultPrimary: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.navy,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSecondary: {
    fontSize: 11,
    color: colors.gray400,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  resultStatus: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  emptyState: {
    padding: '20px 16px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: 500,
  },
  recentList: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 12,
    color: colors.navy,
    borderRadius: 6,
    transition: 'background 0.1s',
  },
  recentIcon: {
    fontSize: 12,
    color: colors.gray400,
  },
  recentText: {
    flex: 1,
  },
  loadingState: {
    padding: '16px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: 500,
  },
};
