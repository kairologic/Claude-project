'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { colors, typography } from '@/lib/design-tokens';
import { Download, Save, ChevronDown, X, Loader2, Search, RotateCcw } from 'lucide-react';
import ReportPreviewTable from './ReportPreviewTable';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CatalogField {
  key: string;
  label: string;
  type: string;
  default: boolean;
  description?: string;
  filterable: boolean;
}

interface CatalogFilter {
  key: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
}

interface CatalogReportType {
  type: string;
  name: string;
  description: string;
  icon: string;
  fields: CatalogField[];
  filters: CatalogFilter[];
  exportFormats: string[];
}

interface Column {
  key: string;
  label: string;
  type: string;
}

interface QueryResult {
  columns: Column[];
  rows: Record<string, unknown>[];
  total_count: number;
  page: number;
  page_size: number;
}

interface SavedReport {
  id: string;
  name: string;
  report_type: string;
  config: {
    fields: string[];
    filters: Record<string, unknown>;
    sort?: string;
    sort_direction?: string;
  };
  created_at: string;
}

interface DataExplorerProps {
  practiceId: string;
  onSaveReport?: (config: {
    report_type: string;
    fields: string[];
    filters: Record<string, unknown>;
  }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DataExplorer({ practiceId }: DataExplorerProps) {
  // Catalog state
  const [catalog, setCatalog] = useState<CatalogReportType[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Selection state
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Result state
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState<string | null>(null);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  // Saved reports
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load catalog on mount ────────────────────────────────────────────────

  useEffect(() => {
    loadCatalog();
    loadSavedReports();
  }, []);

  async function loadCatalog() {
    try {
      const res = await fetch('/api/reports/query');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.report_types || []);
        // Auto-select first report type
        if (data.report_types?.length > 0) {
          const first = data.report_types[0];
          setSelectedReportType(first.type);
          setSelectedFields(first.fields.filter((f: CatalogField) => f.default).map((f: CatalogField) => f.key));
        }
      }
    } catch (err) {
      console.error('Failed to load report catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadSavedReports() {
    try {
      const res = await fetch(`/api/reports/saved?practice_id=${practiceId}`);
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch {
      // Saved reports endpoint may not exist yet
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────

  const currentDef = catalog.find((c) => c.type === selectedReportType);
  const availableFields = currentDef?.fields || [];
  const availableFilters = currentDef?.filters || [];

  // ── Actions ──────────────────────────────────────────────────────────────

  const executeQuery = useCallback(
    async (pageNum = 1) => {
      if (!selectedReportType || selectedFields.length === 0) return;
      setLoading(true);
      setError(null);
      setPage(pageNum);

      try {
        const res = await fetch('/api/reports/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_type: selectedReportType,
            practice_id: practiceId,
            fields: selectedFields,
            filters: filterValues,
            page: pageNum,
            page_size: 50,
            format: 'json',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setResult({
            columns: data.columns,
            rows: data.rows,
            total_count: data.total_count,
            page: data.page,
            page_size: data.page_size,
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || 'Query failed');
        }
      } catch (err) {
        setError('Failed to execute query');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [selectedReportType, selectedFields, filterValues, practiceId],
  );

  // Auto-query with debounce when fields/filters change
  useEffect(() => {
    if (!selectedReportType || selectedFields.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeQuery(1);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedReportType, selectedFields, filterValues, executeQuery]);

  function handleReportTypeChange(type: string) {
    const def = catalog.find((c) => c.type === type);
    setSelectedReportType(type);
    setSelectedFields(def?.fields.filter((f) => f.default).map((f) => f.key) || []);
    setFilterValues({});
    setResult(null);
    setShowCategoryDropdown(false);
  }

  function toggleField(key: string) {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function selectAllFields() {
    setSelectedFields(availableFields.map((f) => f.key));
  }

  function selectDefaultFields() {
    setSelectedFields(availableFields.filter((f) => f.default).map((f) => f.key));
  }

  async function handleExport(format: 'csv' | 'pdf') {
    if (!selectedReportType) return;
    setExporting(format);

    try {
      const res = await fetch('/api/reports/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: selectedReportType,
          practice_id: practiceId,
          fields: selectedFields,
          filters: filterValues,
          format,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const ext = format === 'csv' ? 'csv' : 'pdf';
        const filename = `${selectedReportType}_${new Date().toISOString().slice(0, 10)}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  }

  async function handleSaveReport() {
    if (!saveName.trim() || !selectedReportType) return;
    setSaving(true);

    try {
      const res = await fetch('/api/reports/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practice_id: practiceId,
          name: saveName.trim(),
          report_type: selectedReportType,
          config: {
            fields: selectedFields,
            filters: filterValues,
          },
        }),
      });

      if (res.ok) {
        setShowSaveModal(false);
        setSaveName('');
        loadSavedReports();
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function loadSavedReport(report: SavedReport) {
    setSelectedReportType(report.report_type);
    setSelectedFields(report.config.fields || []);
    setFilterValues(report.config.filters || {});
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (catalogLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: colors.gray400 }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Category Selector */}
        <div ref={dropdownRef} style={styles.categorySelector}>
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            style={styles.categoryButton}
          >
            <span style={styles.categoryLabel}>
              {currentDef?.name || 'Select data category'}
            </span>
            <ChevronDown size={14} />
          </button>
          {showCategoryDropdown && (
            <div style={styles.dropdown}>
              {catalog.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleReportTypeChange(item.type)}
                  style={{
                    ...styles.dropdownItem,
                    background:
                      item.type === selectedReportType ? colors.goldPale : 'transparent',
                    fontWeight: item.type === selectedReportType ? 700 : 500,
                  }}
                >
                  <span style={styles.dropdownName}>{item.name}</span>
                  <span style={styles.dropdownDesc}>{item.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={styles.toolbarRight}>
          <button
            onClick={() => executeQuery(1)}
            disabled={loading || selectedFields.length === 0}
            style={{
              ...styles.actionBtn,
              background: colors.green,
              color: colors.white,
              opacity: loading || selectedFields.length === 0 ? 0.5 : 1,
            }}
          >
            {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
            <span>Query</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={!result || exporting !== null}
            style={{
              ...styles.actionBtn,
              opacity: !result || exporting !== null ? 0.5 : 1,
            }}
          >
            {exporting === 'csv' ? (
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={13} />
            )}
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!result || exporting !== null}
            style={{
              ...styles.actionBtn,
              opacity: !result || exporting !== null ? 0.5 : 1,
            }}
          >
            {exporting === 'pdf' ? (
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={13} />
            )}
            <span>PDF</span>
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!selectedReportType || selectedFields.length === 0}
            style={{
              ...styles.actionBtn,
              background: colors.gold,
              color: colors.navy,
              fontWeight: 600,
              opacity: !selectedReportType || selectedFields.length === 0 ? 0.5 : 1,
            }}
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main content: sidebar + preview */}
      <div style={styles.mainContent}>
        {/* Left sidebar: fields + filters */}
        <div style={styles.sidebar}>
          {/* Fields section */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>Fields</span>
              <div style={styles.fieldActions}>
                <button onClick={selectAllFields} style={styles.linkBtn}>All</button>
                <span style={{ color: colors.gray300 }}>·</span>
                <button onClick={selectDefaultFields} style={styles.linkBtn}>Default</button>
              </div>
            </div>
            <div style={styles.fieldList}>
              {availableFields.map((field) => (
                <label key={field.key} style={styles.fieldCheckbox} title={field.description || ''}>
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => toggleField(field.key)}
                    style={styles.checkboxInput}
                  />
                  <span style={styles.fieldLabel}>{field.label}</span>
                  {field.type === 'status' && (
                    <span style={styles.typeBadge}>enum</span>
                  )}
                  {field.type === 'number' && (
                    <span style={styles.typeBadge}>#</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Filters section */}
          {availableFilters.length > 0 && (
            <div style={styles.sidebarSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Filters</span>
                {Object.keys(filterValues).length > 0 && (
                  <button
                    onClick={() => setFilterValues({})}
                    style={styles.linkBtn}
                  >
                    <RotateCcw size={10} /> Clear
                  </button>
                )}
              </div>
              <div style={styles.filterList}>
                {availableFilters.map((filter) => (
                  <div key={filter.key} style={styles.filterItem}>
                    <label style={styles.filterLabel}>{filter.label}</label>
                    {filter.type === 'text' && (
                      <input
                        type="text"
                        placeholder={`Filter by ${filter.label.toLowerCase()}...`}
                        value={String(filterValues[filter.key] || '')}
                        onChange={(e) =>
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.key]: e.target.value || undefined,
                          }))
                        }
                        style={styles.filterInput}
                      />
                    )}
                    {filter.type === 'select' && (
                      <select
                        value={String(filterValues[filter.key] || '')}
                        onChange={(e) =>
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.key]: e.target.value || undefined,
                          }))
                        }
                        style={styles.filterInput}
                      >
                        <option value="">All</option>
                        {filter.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {filter.type === 'multi_select' && (
                      <select
                        multiple
                        value={
                          Array.isArray(filterValues[filter.key])
                            ? (filterValues[filter.key] as string[])
                            : []
                        }
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.key]: selected.length > 0 ? selected : undefined,
                          }));
                        }}
                        style={{ ...styles.filterInput, height: 72 }}
                      >
                        {filter.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {filter.type === 'date_range' && (
                      <input
                        type="date"
                        value={String(filterValues[filter.key] || '')}
                        onChange={(e) =>
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.key]: e.target.value || undefined,
                          }))
                        }
                        style={styles.filterInput}
                      />
                    )}
                    {filter.type === 'number_range' && (
                      <input
                        type="number"
                        placeholder="Value"
                        value={String(filterValues[filter.key] || '')}
                        onChange={(e) =>
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.key]: e.target.value || undefined,
                          }))
                        }
                        style={styles.filterInput}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div style={styles.sidebarSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Saved Reports</span>
              </div>
              <div style={styles.savedList}>
                {savedReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => loadSavedReport(report)}
                    style={styles.savedItem}
                  >
                    <span style={styles.savedName}>{report.name}</span>
                    <span style={styles.savedMeta}>
                      {catalog.find((c) => c.type === report.report_type)?.name || report.report_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview table */}
        <div style={styles.previewArea}>
          {error ? (
            <div style={styles.errorBanner}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={styles.errorClose}>
                <X size={14} />
              </button>
            </div>
          ) : null}

          {!result && !loading && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <div style={styles.emptyTitle}>Select fields and run a query</div>
              <div style={styles.emptyDesc}>
                Choose a data category, select the fields you want, and the preview will load automatically.
              </div>
            </div>
          )}

          {(result || loading) && (
            <ReportPreviewTable
              columns={result?.columns || []}
              rows={result?.rows || []}
              totalCount={result?.total_count || 0}
              page={page}
              pageSize={50}
              loading={loading}
              onPageChange={(p) => executeQuery(p)}
            />
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Save Report Configuration</span>
              <button onClick={() => setShowSaveModal(false)} style={styles.modalClose}>
                <X size={16} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.modalLabel}>Report Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Active Providers with Mismatches"
                style={styles.modalInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveReport();
                }}
              />
              <div style={styles.modalInfo}>
                <strong>Category:</strong> {currentDef?.name}
                <br />
                <strong>Fields:</strong> {selectedFields.length} selected
                <br />
                <strong>Filters:</strong> {Object.keys(filterValues).filter((k) => filterValues[k] !== undefined).length} active
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowSaveModal(false)} style={styles.modalCancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!saveName.trim() || saving}
                style={{
                  ...styles.modalSaveBtn,
                  opacity: !saveName.trim() || saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    height: '100%',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    gap: 12,
  },
  categorySelector: {
    position: 'relative',
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: colors.white,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 220,
  },
  categoryLabel: {
    flex: 1,
    textAlign: 'left' as const,
    fontSize: 13,
    fontWeight: 600,
    color: colors.navy,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    background: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    width: 360,
    maxHeight: 400,
    overflowY: 'auto' as const,
    padding: 6,
  },
  dropdownItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    width: '100%',
    transition: 'background 0.1s',
  },
  dropdownName: {
    fontSize: 13,
    color: colors.navy,
  },
  dropdownDesc: {
    fontSize: 11,
    color: colors.gray400,
    lineHeight: 1.3,
  },
  toolbarRight: {
    display: 'flex',
    gap: 6,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 12px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    background: colors.white,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 260px)',
  },
  sidebarSection: {
    background: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: `1px solid ${colors.gray200}`,
    background: colors.gray50,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.navy,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  fieldActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: colors.blue,
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '0 2px',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  fieldList: {
    padding: '6px 8px',
    maxHeight: 260,
    overflowY: 'auto' as const,
  },
  fieldCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  checkboxInput: {
    margin: 0,
    cursor: 'pointer',
    accentColor: colors.gold,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.navy,
    flex: 1,
  },
  typeBadge: {
    fontSize: 9,
    padding: '1px 4px',
    borderRadius: 3,
    background: colors.gray100,
    color: colors.gray400,
    fontWeight: 600,
  },
  filterList: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.navy,
  },
  filterInput: {
    width: '100%',
    padding: '6px 8px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 5,
    fontSize: 12,
    fontFamily: 'inherit',
    color: colors.navy,
    boxSizing: 'border-box' as const,
  },
  savedList: {
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  savedItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    padding: '7px 10px',
    background: 'none',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    transition: 'background 0.1s',
  },
  savedName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
  },
  savedMeta: {
    fontSize: 10,
    color: colors.gray400,
  },
  previewArea: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: colors.redPale,
    borderRadius: 8,
    marginBottom: 12,
    color: colors.red,
    fontSize: 12,
    fontWeight: 500,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.red,
    padding: 2,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    background: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: 'center' as const,
    maxWidth: 340,
    lineHeight: 1.5,
  },
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: colors.white,
    borderRadius: 12,
    width: 420,
    boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.navy,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.gray400,
    padding: 4,
  },
  modalBody: {
    padding: '16px 20px',
  },
  modalLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 6,
  },
  modalInput: {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    color: colors.navy,
    boxSizing: 'border-box' as const,
    marginBottom: 12,
  },
  modalInfo: {
    fontSize: 12,
    color: colors.gray400,
    lineHeight: 1.6,
  },
  modalFooter: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderTop: `1px solid ${colors.gray200}`,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    background: colors.white,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  modalSaveBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    background: colors.gold,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
