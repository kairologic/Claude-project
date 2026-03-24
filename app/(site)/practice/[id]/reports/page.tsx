'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  Zap,
  BarChart3,
  Loader2,
  X,
  Download,
  Eye,
} from 'lucide-react';
import { colors } from '@/lib/design-tokens';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  filters: FilterConfig[];
  formats: string[];
}

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  lastGenerated: string;
  nextGeneration: string;
  enabled: boolean;
}

interface PreviewData {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'roster',
    title: 'Provider Roster',
    description: 'Complete list of all providers with key information',
    icon: <Users size={24} />,
    filters: [
      { id: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
      { id: 'specialty', label: 'Specialty', type: 'multiselect', options: [] },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'accuracy',
    title: 'Data Accuracy Summary',
    description: 'Quality metrics and accuracy scores for provider data',
    icon: <CheckCircle size={24} />,
    filters: [
      { id: 'timeframe', label: 'Timeframe', type: 'daterange' },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'payer-status',
    title: 'Payer Directory Status',
    description: 'Coverage and status across all payer directories',
    icon: <AlertCircle size={24} />,
    filters: [
      { id: 'payer', label: 'Payer', type: 'multiselect', options: [] },
    ],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'compliance',
    title: 'Compliance Status',
    description: 'Compliance scores and requirements status',
    icon: <CheckCircle size={24} />,
    filters: [
      { id: 'requirement', label: 'Requirement Type', type: 'select', options: [] },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'expiry',
    title: 'Credential Expiry',
    description: 'Licenses and credentials expiring soon',
    icon: <Calendar size={24} />,
    filters: [
      { id: 'days', label: 'Days Until Expiry', type: 'select', options: [{ value: '30', label: 'Next 30 days' }, { value: '90', label: 'Next 90 days' }, { value: '180', label: 'Next 180 days' }] },
    ],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'workflow',
    title: 'Workflow Activity',
    description: 'Recent workflow submissions and completions',
    icon: <Zap size={24} />,
    filters: [
      { id: 'status', label: 'Status', type: 'multiselect', options: [{ value: 'open', label: 'Open' }, { value: 'submitted', label: 'Submitted' }, { value: 'completed', label: 'Completed' }] },
      { id: 'daterange', label: 'Date Range', type: 'daterange' },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'agent',
    title: 'Agent Activity',
    description: 'Coming soon',
    icon: <Zap size={24} />,
    filters: [],
    formats: [],
  },
  {
    id: 'payer-comparison',
    title: 'Payer Comparison Grid',
    description: 'Side-by-side comparison of payer requirements',
    icon: <BarChart3 size={24} />,
    filters: [
      { id: 'payers', label: 'Select Payers', type: 'multiselect', options: [] },
    ],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'executive-summary',
    title: 'Monthly Executive Summary',
    description: 'High-level KPIs and trend analysis',
    icon: <BarChart3 size={24} />,
    filters: [
      { id: 'month', label: 'Month', type: 'date' },
    ],
    formats: ['PDF', 'Excel'],
  },
];

export default function ReportsPage() {
  const params = useParams();
  const practiceId = params.id as string;

  const [activeTab, setActiveTab] = useState<'prebuilt' | 'explorer'>('prebuilt');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('Excel');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);

  // Data Explorer state
  const [filters, setFilters] = useState<Array<{ source: string; field: string; operator: string; value: unknown }>>([]);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [explorerResults, setExplorerResults] = useState<unknown[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);

  useEffect(() => {
    loadScheduledReports();
  }, []);

  async function loadScheduledReports() {
    try {
      const response = await fetch(`/api/reports/scheduled?practice_id=${practiceId}`);
      if (response.ok) {
        const data = await response.json();
        setScheduledReports(data);
      }
    } catch (err) {
      console.error('Failed to load scheduled reports:', err);
    }
  }

  function openReportModal(report: ReportType) {
    if (report.id === 'agent') return; // Coming soon
    setSelectedReport(report);
    setShowModal(true);
    setFilterValues({});
    setPreviewData(null);
    setSelectedFormat(report.formats[0] || 'Excel');
  }

  async function handlePreview() {
    if (!selectedReport) return;
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practice_id: practiceId,
          report_type: selectedReport.id,
          filters: filterValues,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
      }
    } catch (err) {
      console.error('Failed to preview report:', err);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload() {
    if (!selectedReport) return;
    setDownloadLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practice_id: practiceId,
          report_type: selectedReport.id,
          filters: filterValues,
          format: selectedFormat,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = `${selectedReport.id}-report-${Date.now()}.${selectedFormat.toLowerCase().replace('excel', 'xlsx').replace('pdf', 'pdf')}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to download report:', err);
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleExplorerSearch() {
    setExplorerLoading(true);
    try {
      const response = await fetch('/api/reports/data-explorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practice_id: practiceId,
          filters,
          filterLogic,
          columns: selectedColumns,
          sortBy,
          groupBy,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setExplorerResults(data);
      }
    } catch (err) {
      console.error('Failed to execute explorer query:', err);
    } finally {
      setExplorerLoading(false);
    }
  }

  function downloadExplorerCSV() {
    if (!explorerResults.length) return;
    const headers = Object.keys(explorerResults[0] as Record<string, unknown>);
    const csv = [
      headers.join(','),
      ...explorerResults.map(row =>
        headers.map(h => {
          const val = (row as Record<string, unknown>)[h];
          const str = typeof val === 'string' ? val : JSON.stringify(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-explorer-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleScheduledReport(id: string) {
    setScheduledReports(prev =>
      prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  }

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabsBar}>
        <button
          onClick={() => setActiveTab('prebuilt')}
          style={{
            ...styles.tab,
            borderBottom: activeTab === 'prebuilt' ? `3px solid ${colors.gold}` : `3px solid transparent`,
            color: activeTab === 'prebuilt' ? colors.navy : colors.navyLight,
            fontWeight: activeTab === 'prebuilt' ? 700 : 500,
          }}
        >
          Pre-Built Reports
        </button>
        <button
          onClick={() => setActiveTab('explorer')}
          style={{
            ...styles.tab,
            borderBottom: activeTab === 'explorer' ? `3px solid ${colors.gold}` : `3px solid transparent`,
            color: activeTab === 'explorer' ? colors.navy : colors.navyLight,
            fontWeight: activeTab === 'explorer' ? 700 : 500,
          }}
        >
          Data Explorer
        </button>
      </div>

      {/* Pre-Built Reports Tab */}
      {activeTab === 'prebuilt' && (
        <div style={styles.tabContent}>
          <div style={styles.reportGrid}>
            {REPORT_TYPES.map(report => (
              <div key={report.id} style={styles.reportCard}>
                <div style={styles.reportIcon}>{report.icon}</div>
                <div style={styles.reportTitle}>{report.title}</div>
                <div style={styles.reportDescription}>{report.description}</div>
                {report.formats.length > 0 && (
                  <div style={styles.reportFormats}>
                    {report.formats.map(fmt => (
                      <span key={fmt} style={styles.formatBadge}>{fmt}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => openReportModal(report)}
                  disabled={report.id === 'agent'}
                  style={{
                    ...styles.generateBtn,
                    opacity: report.id === 'agent' ? 0.5 : 1,
                    cursor: report.id === 'agent' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {report.id === 'agent' ? 'Coming soon' : 'Generate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Explorer Tab */}
      {activeTab === 'explorer' && (
        <div style={styles.tabContent}>
          <div style={styles.explorerSection}>
            <div style={styles.explorerPanel}>
              <div style={styles.panelTitle}>Filters</div>

              {filters.map((filter, idx) => (
                <div key={idx} style={styles.filterRow}>
                  <input
                    type="text"
                    placeholder="Source"
                    value={filter.source}
                    onChange={e =>
                      setFilters(prev => {
                        const updated = [...prev];
                        updated[idx].source = e.target.value;
                        return updated;
                      })
                    }
                    style={styles.filterInput}
                  />
                  <input
                    type="text"
                    placeholder="Field"
                    value={filter.field}
                    onChange={e =>
                      setFilters(prev => {
                        const updated = [...prev];
                        updated[idx].field = e.target.value;
                        return updated;
                      })
                    }
                    style={styles.filterInput}
                  />
                  <select
                    value={filter.operator}
                    onChange={e =>
                      setFilters(prev => {
                        const updated = [...prev];
                        updated[idx].operator = e.target.value;
                        return updated;
                      })
                    }
                    style={styles.filterInput}
                  >
                    <option>equals</option>
                    <option>contains</option>
                    <option>starts with</option>
                    <option>greater than</option>
                    <option>less than</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={String(filter.value)}
                    onChange={e =>
                      setFilters(prev => {
                        const updated = [...prev];
                        updated[idx].value = e.target.value;
                        return updated;
                      })
                    }
                    style={styles.filterInput}
                  />
                  <button
                    onClick={() => setFilters(prev => prev.filter((_, i) => i !== idx))}
                    style={styles.removeFilterBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={() => setFilters(prev => [...prev, { source: '', field: '', operator: 'equals', value: '' }])}
                style={styles.addFilterBtn}
              >
                + Add Filter
              </button>

              {filters.length > 0 && (
                <div style={styles.filterLogicToggle}>
                  <button
                    onClick={() => setFilterLogic('AND')}
                    style={{
                      ...styles.logicBtn,
                      background: filterLogic === 'AND' ? colors.gold : colors.gray100,
                      color: filterLogic === 'AND' ? colors.navy : colors.gray400,
                    }}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setFilterLogic('OR')}
                    style={{
                      ...styles.logicBtn,
                      background: filterLogic === 'OR' ? colors.gold : colors.gray100,
                      color: filterLogic === 'OR' ? colors.navy : colors.gray400,
                    }}
                  >
                    OR
                  </button>
                </div>
              )}

              <div style={styles.divider} />

              <div style={styles.panelTitle}>Columns</div>
              <div style={styles.columnCheckboxes}>
                {['provider_id', 'provider_name', 'specialty', 'status', 'last_updated'].map(col => (
                  <label key={col} style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedColumns(prev => [...prev, col]);
                        } else {
                          setSelectedColumns(prev => prev.filter(c => c !== col));
                        }
                      }}
                    />
                    {col}
                  </label>
                ))}
              </div>

              <div style={styles.divider} />

              <div style={styles.panelTitle}>Sort & Group</div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={styles.filterInput}
              >
                <option value="">Sort by...</option>
                <option value="provider_name">Provider Name</option>
                <option value="status">Status</option>
                <option value="last_updated">Last Updated</option>
              </select>

              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                style={styles.filterInput}
              >
                <option value="">Group by...</option>
                <option value="specialty">Specialty</option>
                <option value="status">Status</option>
              </select>

              <button onClick={handleExplorerSearch} style={styles.searchBtn}>
                {explorerLoading ? (
                  <>
                    <Loader2 size={14} style={{ marginRight: 6 }} />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </div>

            {/* Results */}
            {explorerResults.length > 0 && (
              <div style={styles.explorerResults}>
                <div style={styles.resultCount}>{explorerResults.length} results</div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        {Object.keys(explorerResults[0] as Record<string, unknown>).map(col => (
                          <th key={col} style={styles.tableHeaderCell}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {explorerResults.map((row, i) => (
                        <tr key={i} style={i % 2 === 0 ? styles.tableRow : { ...styles.tableRow, background: colors.gray100 }}>
                          {Object.values(row as Record<string, unknown>).map((val, j) => (
                            <td key={j} style={styles.tableCell}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.actionButtons}>
                  <button onClick={downloadExplorerCSV} style={styles.button}>Download CSV</button>
                  <button style={{ ...styles.button, background: colors.gold, color: colors.navy, fontWeight: 600 }}>
                    Save as Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Reports Section */}
      <div style={styles.scheduledSection}>
        <div style={styles.scheduledTitle}>Scheduled Reports</div>
        {scheduledReports.length === 0 ? (
          <div style={styles.emptyScheduled}>
            <div style={styles.emptyText}>No scheduled reports yet</div>
            <button style={styles.addScheduleBtn}>+ Add Schedule</button>
          </div>
        ) : (
          <>
            <div style={styles.scheduledList}>
              {scheduledReports.map(report => (
                <div key={report.id} style={styles.scheduledItem}>
                  <div style={styles.scheduledItemContent}>
                    <div style={styles.scheduledName}>{report.name}</div>
                    <div style={styles.scheduledMeta}>
                      <span>{report.frequency}</span>
                      <span style={{ marginLeft: 16 }}>Last generated: {report.lastGenerated}</span>
                      <span style={{ marginLeft: 16 }}>Next: {report.nextGeneration}</span>
                    </div>
                  </div>
                  <label style={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={report.enabled}
                      onChange={() => toggleScheduledReport(report.id)}
                      style={{ marginRight: 8 }}
                    />
                    Enabled
                  </label>
                </div>
              ))}
            </div>
            <button style={styles.addScheduleBtn}>+ Add Schedule</button>
          </>
        )}
      </div>

      {/* Modal for report generation */}
      {showModal && selectedReport && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{selectedReport.title}</div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.modalContent}>
              {/* Filters */}
              {selectedReport.filters.length > 0 && (
                <div style={styles.filterSection}>
                  <div style={styles.sectionTitle}>Filters</div>
                  {selectedReport.filters.map(filter => (
                    <div key={filter.id} style={styles.filterGroup}>
                      <label style={styles.filterLabel}>{filter.label}</label>
                      {filter.type === 'select' && (
                        <select
                          value={String(filterValues[filter.id] || '')}
                          onChange={e => setFilterValues(prev => ({ ...prev, [filter.id]: e.target.value }))}
                          style={styles.select}
                        >
                          <option value="">Select {filter.label}...</option>
                          {filter.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      {filter.type === 'date' && (
                        <input
                          type="date"
                          value={String(filterValues[filter.id] || '')}
                          onChange={e => setFilterValues(prev => ({ ...prev, [filter.id]: e.target.value }))}
                          style={styles.select}
                        />
                      )}
                      {filter.type === 'daterange' && (
                        <div style={styles.daterangeInputs}>
                          <input
                            type="date"
                            placeholder="From"
                            style={styles.select}
                          />
                          <input
                            type="date"
                            placeholder="To"
                            style={styles.select}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Format selector */}
              <div style={styles.filterSection}>
                <div style={styles.sectionTitle}>Format</div>
                <div style={styles.formatOptions}>
                  {selectedReport.formats.map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      style={{
                        ...styles.formatOption,
                        background: selectedFormat === fmt ? colors.gold : colors.gray100,
                        color: selectedFormat === fmt ? colors.navy : colors.gray400,
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewData && (
                <div style={styles.previewSection}>
                  <div style={styles.sectionTitle}>Preview ({previewData.totalRows} rows)</div>
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          {previewData.columns.map(col => (
                            <th key={col} style={styles.tableHeaderCell}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.map((row, i) => (
                          <tr key={i} style={i % 2 === 0 ? styles.tableRow : { ...styles.tableRow, background: colors.gray100 }}>
                            {previewData.columns.map(col => (
                              <td key={col} style={styles.tableCell}>
                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                style={{
                  ...styles.modalBtn,
                  background: colors.gray100,
                  color: colors.navy,
                  opacity: previewLoading ? 0.6 : 1,
                }}
              >
                {previewLoading ? (
                  <>
                    <Loader2 size={14} style={{ marginRight: 6 }} />
                    Previewing...
                  </>
                ) : (
                  <>
                    <Eye size={14} style={{ marginRight: 6 }} />
                    Preview
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                style={{
                  ...styles.modalBtn,
                  background: colors.gold,
                  color: colors.navy,
                  opacity: downloadLoading ? 0.6 : 1,
                }}
              >
                {downloadLoading ? (
                  <>
                    <Loader2 size={14} style={{ marginRight: 6 }} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={14} style={{ marginRight: 6 }} />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: colors.gray100,
    overflowY: 'auto',
  },
  tabsBar: {
    display: 'flex',
    borderBottom: `1px solid ${colors.gray200}`,
    background: colors.white,
    padding: '0 24px',
  },
  tab: {
    padding: '14px 16px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  tabContent: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  reportCard: {
    background: colors.white,
    borderRadius: 12,
    padding: 20,
    border: `1px solid ${colors.gray200}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  reportIcon: {
    color: colors.gold,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.navy,
  },
  reportDescription: {
    fontSize: 12,
    color: colors.gray400,
    flex: 1,
    lineHeight: 1.4,
  },
  reportFormats: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  formatBadge: {
    fontSize: 10,
    background: colors.gray100,
    padding: '2px 6px',
    borderRadius: 4,
    color: colors.gray400,
    fontWeight: 600,
  },
  generateBtn: {
    padding: '8px 12px',
    background: colors.gold,
    border: 'none',
    borderRadius: 6,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
  explorerSection: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: 20,
  },
  explorerPanel: {
    background: colors.white,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${colors.gray200}`,
    height: 'fit-content',
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 8,
  },
  filterInput: {
    flex: 1,
    padding: '6px 8px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'inherit',
  },
  removeFilterBtn: {
    padding: '6px',
    background: 'none',
    border: 'none',
    color: colors.red,
    cursor: 'pointer',
    fontSize: 14,
  },
  addFilterBtn: {
    width: '100%',
    padding: '6px 8px',
    background: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 4,
    color: colors.navy,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: 12,
  },
  filterLogicToggle: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
  },
  logicBtn: {
    flex: 1,
    padding: '6px 8px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
  divider: {
    height: 1,
    background: colors.gray200,
    margin: '12px 0',
  },
  columnCheckboxes: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    color: colors.navy,
    cursor: 'pointer',
  },
  searchBtn: {
    width: '100%',
    padding: '8px 12px',
    background: colors.green,
    color: colors.white,
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerResults: {
    background: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.gray200}`,
    padding: 16,
  },
  resultCount: {
    fontSize: 11,
    color: colors.gray400,
    fontWeight: 600,
    marginBottom: 12,
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: 12,
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
  },
  scheduledSection: {
    padding: 24,
    borderTop: `1px solid ${colors.gray200}`,
    background: colors.white,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 16,
  },
  emptyScheduled: {
    textAlign: 'center' as const,
    padding: 32,
    color: colors.gray400,
  },
  emptyText: {
    fontSize: 12,
    marginBottom: 16,
  },
  scheduledList: {
    marginBottom: 12,
  },
  scheduledItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: colors.gray100,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduledItemContent: {
    flex: 1,
  },
  scheduledName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
  },
  scheduledMeta: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 4,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 11,
    color: colors.navy,
    cursor: 'pointer',
  },
  addScheduleBtn: {
    padding: '8px 12px',
    background: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    color: colors.navy,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: colors.white,
    borderRadius: 12,
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.navy,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: colors.gray400,
  },
  modalContent: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'inherit',
    color: colors.navy,
  },
  daterangeInputs: {
    display: 'flex',
    gap: 8,
  },
  formatOptions: {
    display: 'flex',
    gap: 8,
  },
  formatOption: {
    flex: 1,
    padding: '8px 10px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
  previewSection: {
    marginBottom: 0,
  },
  modalFooter: {
    display: 'flex',
    gap: 8,
    padding: '16px 24px',
    borderTop: `1px solid ${colors.gray200}`,
  },
  modalBtn: {
    flex: 1,
    padding: '10px 14px',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background .15s',
  },
};
