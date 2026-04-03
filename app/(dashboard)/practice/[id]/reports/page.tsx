'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Search,
  Save,
  Clock,
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

/* ── Data Explorer field definitions ── */
interface FieldDef {
  id: string;
  label: string;
  category: string;
  description: string;
}

const FIELD_CATEGORIES = [
  { id: 'provider', label: 'Provider Info', icon: '👤' },
  { id: 'payer', label: 'Payer Directory', icon: '🏥' },
  { id: 'compliance', label: 'Compliance', icon: '✓' },
  { id: 'workflow', label: 'Workflows', icon: '⚡' },
  { id: 'alert', label: 'Alerts', icon: '🔔' },
];

const AVAILABLE_FIELDS: FieldDef[] = [
  // Provider Info
  { id: 'provider_name', label: 'Provider Name', category: 'provider', description: 'Full name of the provider' },
  { id: 'npi', label: 'NPI', category: 'provider', description: 'National Provider Identifier' },
  { id: 'specialty', label: 'Specialty', category: 'provider', description: 'Primary specialty or taxonomy' },
  { id: 'phone', label: 'Phone', category: 'provider', description: 'Practice phone number' },
  { id: 'address', label: 'Address', category: 'provider', description: 'Practice address' },
  { id: 'roster_status', label: 'Roster Status', category: 'provider', description: 'Active, onboarding, or departed' },
  { id: 'credential', label: 'Credential', category: 'provider', description: 'Credential suffix (MD, DO, etc.)' },
  { id: 'last_seen_at', label: 'Last Seen', category: 'provider', description: 'Last time detected on website' },
  // Payer Directory
  { id: 'payer_name', label: 'Payer Name', category: 'payer', description: 'Insurance company name' },
  { id: 'listed_status', label: 'Listed Status', category: 'payer', description: 'Whether provider is listed in directory' },
  { id: 'listed_address', label: 'Payer Listed Address', category: 'payer', description: 'Address shown in payer directory' },
  { id: 'listed_phone', label: 'Payer Listed Phone', category: 'payer', description: 'Phone shown in payer directory' },
  { id: 'listed_specialty', label: 'Payer Listed Specialty', category: 'payer', description: 'Specialty shown in payer directory' },
  { id: 'last_synced', label: 'Last Payer Sync', category: 'payer', description: 'When directory was last checked' },
  // Compliance
  { id: 'compliance_finding', label: 'Finding', category: 'compliance', description: 'Compliance requirement or finding' },
  { id: 'compliance_status', label: 'Compliance Status', category: 'compliance', description: 'Open, remediated, or N/A' },
  { id: 'compliance_severity', label: 'Severity', category: 'compliance', description: 'Critical, high, medium, or low' },
  // Workflows
  { id: 'workflow_type', label: 'Workflow Type', category: 'workflow', description: 'Type of workflow (onboarding, payer, etc.)' },
  { id: 'workflow_status', label: 'Workflow Status', category: 'workflow', description: 'Active, completed, or cancelled' },
  { id: 'workflow_created', label: 'Workflow Created', category: 'workflow', description: 'When workflow was started' },
  { id: 'task_count', label: 'Task Count', category: 'workflow', description: 'Number of tasks in workflow' },
  // Alerts
  { id: 'alert_title', label: 'Alert Title', category: 'alert', description: 'Summary of the alert' },
  { id: 'alert_severity', label: 'Alert Severity', category: 'alert', description: 'Critical, warning, or info' },
  { id: 'alert_source', label: 'Alert Source', category: 'alert', description: 'What triggered the alert' },
  { id: 'alert_created', label: 'Alert Date', category: 'alert', description: 'When alert was created' },
];

const REPORT_TYPES: ReportType[] = [
  {
    id: 'roster',
    title: 'Provider Roster',
    description: 'Complete list of all providers with key information',
    icon: <Users size={24} />,
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      { id: 'specialty', label: 'Specialty', type: 'multiselect', options: [] },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'accuracy',
    title: 'Data Accuracy Summary',
    description: 'Quality metrics and accuracy scores for provider data',
    icon: <CheckCircle size={24} />,
    filters: [{ id: 'timeframe', label: 'Timeframe', type: 'daterange' }],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'payer-status',
    title: 'Payer Directory Status',
    description: 'Coverage and status across all payer directories',
    icon: <AlertCircle size={24} />,
    filters: [{ id: 'payer', label: 'Payer', type: 'multiselect', options: [] }],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'compliance',
    title: 'Compliance Status',
    description: 'Compliance scores and requirements status',
    icon: <CheckCircle size={24} />,
    filters: [{ id: 'requirement', label: 'Requirement Type', type: 'select', options: [] }],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'expiry',
    title: 'Credential Expiry',
    description: 'Licenses and credentials expiring soon',
    icon: <Calendar size={24} />,
    filters: [
      {
        id: 'days',
        label: 'Days Until Expiry',
        type: 'select',
        options: [
          { value: '30', label: 'Next 30 days' },
          { value: '90', label: 'Next 90 days' },
          { value: '180', label: 'Next 180 days' },
        ],
      },
    ],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'workflow',
    title: 'Workflow Activity',
    description: 'Recent workflow submissions and completions',
    icon: <Zap size={24} />,
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'multiselect',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'completed', label: 'Completed' },
        ],
      },
      { id: 'daterange', label: 'Date Range', type: 'daterange' },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'ehr-vendor',
    title: 'EHR Vendor AI Detection',
    description: 'AI-enabled EHR vendors detected across your practice with compliance status',
    icon: <Zap size={24} />,
    filters: [
      {
        id: 'confidence',
        label: 'Confidence Level',
        type: 'select',
        options: [
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'likely', label: 'Likely' },
          { value: 'possible', label: 'Possible' },
        ],
      },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'specialty-mismatch',
    title: 'Specialty Mismatch',
    description: 'Provider specialty discrepancies across NPPES, website, board, and payer sources',
    icon: <AlertCircle size={24} />,
    filters: [
      {
        id: 'confidence',
        label: 'Match Confidence',
        type: 'select',
        options: [
          { value: 'low', label: 'Low (hard mismatch)' },
          { value: 'medium', label: 'Medium (soft mismatch)' },
          { value: 'high', label: 'High (sub-specialty)' },
        ],
      },
    ],
    formats: ['Excel', 'CSV'],
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
    filters: [{ id: 'payers', label: 'Select Payers', type: 'multiselect', options: [] }],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'executive-summary',
    title: 'Monthly Executive Summary',
    description: 'High-level KPIs and trend analysis',
    icon: <BarChart3 size={24} />,
    filters: [{ id: 'month', label: 'Month', type: 'date' }],
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

  // Data Explorer state — two-column field picker
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [groupBy, setGroupBy] = useState<string>('');
  const [explorerResults, setExplorerResults] = useState<unknown[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [reportName, setReportName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

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

  // Field picker helpers
  function addField(fieldId: string) {
    if (!selectedFields.includes(fieldId)) {
      setSelectedFields(prev => [...prev, fieldId]);
    }
  }

  function removeField(fieldId: string) {
    setSelectedFields(prev => prev.filter(f => f !== fieldId));
    if (sortBy === fieldId) setSortBy('');
    if (groupBy === fieldId) setGroupBy('');
  }

  function moveField(fieldId: string, direction: 'up' | 'down') {
    setSelectedFields(prev => {
      const idx = prev.indexOf(fieldId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function addAllInCategory(categoryId: string) {
    const catFields = AVAILABLE_FIELDS.filter(f => f.category === categoryId).map(f => f.id);
    setSelectedFields(prev => [...prev, ...catFields.filter(id => !prev.includes(id))]);
  }

  const filteredAvailableFields = AVAILABLE_FIELDS.filter(f => {
    if (selectedFields.includes(f.id)) return false;
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (fieldSearch) {
      const q = fieldSearch.toLowerCase();
      return f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedFieldDefs = selectedFields
    .map(id => AVAILABLE_FIELDS.find(f => f.id === id))
    .filter(Boolean) as FieldDef[];

  async function handleExplorerSearch() {
    if (selectedFields.length === 0) return;
    setExplorerLoading(true);
    try {
      const response = await fetch('/api/reports/data-explorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practice_id: practiceId,
          columns: selectedFields,
          sortBy,
          sortDir,
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
    const headers = selectedFieldDefs.map(f => f.label);
    const fieldIds = selectedFields;
    const csv = [
      headers.join(','),
      ...explorerResults.map((row) =>
        fieldIds
          .map((h) => {
            const val = (row as Record<string, unknown>)[h];
            const str = val == null ? '' : typeof val === 'string' ? val : JSON.stringify(val);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'custom-report'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleScheduledReport(id: string) {
    setScheduledReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
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
            borderBottom:
              activeTab === 'prebuilt' ? `3px solid ${colors.gold}` : `3px solid transparent`,
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
            borderBottom:
              activeTab === 'explorer' ? `3px solid ${colors.gold}` : `3px solid transparent`,
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
            {REPORT_TYPES.map((report) => (
              <div key={report.id} style={styles.reportCard}>
                <div style={styles.reportIcon}>{report.icon}</div>
                <div style={styles.reportTitle}>{report.title}</div>
                <div style={styles.reportDescription}>{report.description}</div>
                {report.formats.length > 0 && (
                  <div style={styles.reportFormats}>
                    {report.formats.map((fmt) => (
                      <span key={fmt} style={styles.formatBadge}>
                        {fmt}
                      </span>
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

      {/* Data Explorer Tab — two-column field picker */}
      {activeTab === 'explorer' && (
        <div style={styles.tabContent}>
          {/* Instruction hint */}
          <div style={ex.hint}>
            Pick the fields you want in your report from the left, then click <strong>Run Report</strong>.
          </div>

          <div style={ex.twoCol}>
            {/* ── LEFT: Available Fields ── */}
            <div style={ex.panel}>
              <div style={ex.panelHeader}>
                <span style={ex.panelLabel}>Available Fields</span>
                <span style={ex.fieldCount}>{filteredAvailableFields.length}</span>
              </div>

              {/* Search */}
              <div style={ex.searchWrap}>
                <Search size={14} style={{ color: colors.gray400, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  style={ex.searchInput}
                />
                {fieldSearch && (
                  <button onClick={() => setFieldSearch('')} style={ex.clearSearch}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category filter pills */}
              <div style={ex.catPills}>
                <button
                  onClick={() => setActiveCategory('all')}
                  style={{
                    ...ex.catPill,
                    background: activeCategory === 'all' ? colors.navy : colors.gray100,
                    color: activeCategory === 'all' ? '#fff' : colors.navy,
                  }}
                >
                  All
                </button>
                {FIELD_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      ...ex.catPill,
                      background: activeCategory === cat.id ? colors.navy : colors.gray100,
                      color: activeCategory === cat.id ? '#fff' : colors.navy,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>

              {/* Field list — grouped by category */}
              <div style={ex.fieldList}>
                {(activeCategory === 'all' ? FIELD_CATEGORIES : FIELD_CATEGORIES.filter(c => c.id === activeCategory)).map(cat => {
                  const catFields = filteredAvailableFields.filter(f => f.category === cat.id);
                  if (catFields.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <div style={ex.catHeader}>
                        <span>{cat.icon} {cat.label}</span>
                        <button
                          onClick={() => addAllInCategory(cat.id)}
                          style={ex.addAllBtn}
                        >
                          Add all
                        </button>
                      </div>
                      {catFields.map(field => (
                        <button
                          key={field.id}
                          onClick={() => addField(field.id)}
                          style={ex.fieldItem}
                          title={field.description}
                        >
                          <div>
                            <div style={ex.fieldName}>{field.label}</div>
                            <div style={ex.fieldDesc}>{field.description}</div>
                          </div>
                          <ChevronRight size={14} style={{ color: colors.gray400, flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  );
                })}
                {filteredAvailableFields.length === 0 && (
                  <div style={ex.emptyFields}>
                    {selectedFields.length === AVAILABLE_FIELDS.length
                      ? 'All fields selected'
                      : 'No fields match your search'}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Selected Fields + Options ── */}
            <div style={ex.panel}>
              <div style={ex.panelHeader}>
                <span style={ex.panelLabel}>Your Report Columns</span>
                <span style={ex.fieldCount}>{selectedFields.length}</span>
              </div>

              {selectedFields.length === 0 ? (
                <div style={ex.emptySelected}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>←</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>
                    Click fields on the left to add them
                  </div>
                  <div style={{ fontSize: 11, color: colors.gray400, marginTop: 4 }}>
                    Fields appear as columns in your report
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected field list with reorder */}
                  <div style={ex.selectedList}>
                    {selectedFieldDefs.map((field, idx) => (
                      <div key={field.id} style={ex.selectedItem}>
                        <div style={ex.selectedGrip}>
                          <GripVertical size={14} style={{ color: colors.gray400 }} />
                        </div>
                        <div style={ex.selectedInfo}>
                          <span style={ex.selectedName}>{field.label}</span>
                          <span style={ex.selectedCat}>
                            {FIELD_CATEGORIES.find(c => c.id === field.category)?.icon}{' '}
                            {FIELD_CATEGORIES.find(c => c.id === field.category)?.label}
                          </span>
                        </div>
                        <div style={ex.selectedActions}>
                          <button
                            onClick={() => moveField(field.id, 'up')}
                            disabled={idx === 0}
                            style={{
                              ...ex.moveBtn,
                              opacity: idx === 0 ? 0.3 : 1,
                            }}
                            title="Move up"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'down')}
                            disabled={idx === selectedFieldDefs.length - 1}
                            style={{
                              ...ex.moveBtn,
                              opacity: idx === selectedFieldDefs.length - 1 ? 0.3 : 1,
                            }}
                            title="Move down"
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            onClick={() => removeField(field.id)}
                            style={ex.removeBtn}
                            title="Remove field"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sort & Group */}
                  <div style={ex.optionsBar}>
                    <div style={ex.optionGroup}>
                      <label style={ex.optionLabel}>Sort by</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          style={ex.optionSelect}
                        >
                          <option value="">None</option>
                          {selectedFieldDefs.map(f => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>
                        {sortBy && (
                          <button
                            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                            style={ex.sortDirBtn}
                            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                          >
                            {sortDir === 'asc' ? '↑ A-Z' : '↓ Z-A'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={ex.optionGroup}>
                      <label style={ex.optionLabel}>Group by</label>
                      <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        style={ex.optionSelect}
                      >
                        <option value="">None</option>
                        {selectedFieldDefs.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={ex.actionBar}>
                    <button
                      onClick={handleExplorerSearch}
                      disabled={explorerLoading}
                      style={ex.runBtn}
                    >
                      {explorerLoading ? (
                        <><Loader2 size={14} style={{ marginRight: 6 }} /> Running...</>
                      ) : (
                        <><Eye size={14} style={{ marginRight: 6 }} /> Run Report</>
                      )}
                    </button>
                    <button onClick={downloadExplorerCSV} style={ex.exportBtn} disabled={explorerResults.length === 0}>
                      <Download size={14} style={{ marginRight: 4 }} /> Export CSV
                    </button>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      style={ex.saveBtn}
                    >
                      <Save size={14} style={{ marginRight: 4 }} /> Save
                    </button>
                  </div>
                </>
              )}

              {/* Clear all */}
              {selectedFields.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedFields([]);
                    setExplorerResults([]);
                    setSortBy('');
                    setGroupBy('');
                  }}
                  style={ex.clearAllBtn}
                >
                  Clear all fields
                </button>
              )}
            </div>
          </div>

          {/* Results table */}
          {explorerResults.length > 0 && (
            <div style={ex.resultsPanel}>
              <div style={ex.resultsHeader}>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.navy }}>
                  Results
                </span>
                <span style={ex.resultsBadge}>{explorerResults.length} rows</span>
              </div>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      {selectedFieldDefs.map(f => (
                        <th key={f.id} style={styles.tableHeaderCell}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {explorerResults.slice(0, 50).map((row, i) => (
                      <tr
                        key={i}
                        style={i % 2 === 0 ? styles.tableRow : { ...styles.tableRow, background: colors.gray100 }}
                      >
                        {selectedFields.map(fId => (
                          <td key={fId} style={styles.tableCell}>
                            {(() => {
                              const val = (row as Record<string, unknown>)[fId];
                              return val == null ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {explorerResults.length > 50 && (
                <div style={{ fontSize: 11, color: colors.gray400, padding: '8px 0' }}>
                  Showing first 50 of {explorerResults.length} rows. Export CSV for full data.
                </div>
              )}
            </div>
          )}
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
              {scheduledReports.map((report) => (
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
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{selectedReport.title}</div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {/* Filters */}
              {selectedReport.filters.length > 0 && (
                <div style={styles.filterSection}>
                  <div style={styles.sectionTitle}>Filters</div>
                  {selectedReport.filters.map((filter) => (
                    <div key={filter.id} style={styles.filterGroup}>
                      <label style={styles.filterLabel}>{filter.label}</label>
                      {filter.type === 'select' && (
                        <select
                          value={String(filterValues[filter.id] || '')}
                          onChange={(e) =>
                            setFilterValues((prev) => ({ ...prev, [filter.id]: e.target.value }))
                          }
                          style={styles.select}
                        >
                          <option value="">Select {filter.label}...</option>
                          {filter.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {filter.type === 'date' && (
                        <input
                          type="date"
                          value={String(filterValues[filter.id] || '')}
                          onChange={(e) =>
                            setFilterValues((prev) => ({ ...prev, [filter.id]: e.target.value }))
                          }
                          style={styles.select}
                        />
                      )}
                      {filter.type === 'daterange' && (
                        <div style={styles.daterangeInputs}>
                          <input type="date" placeholder="From" style={styles.select} />
                          <input type="date" placeholder="To" style={styles.select} />
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
                  {selectedReport.formats.map((fmt) => (
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
                          {previewData.columns.map((col) => (
                            <th key={col} style={styles.tableHeaderCell}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.map((row, i) => (
                          <tr
                            key={i}
                            style={
                              i % 2 === 0
                                ? styles.tableRow
                                : { ...styles.tableRow, background: colors.gray100 }
                            }
                          >
                            {previewData.columns.map((col) => (
                              <td key={col} style={styles.tableCell}>
                                {typeof row[col] === 'object'
                                  ? JSON.stringify(row[col])
                                  : String(row[col])}
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
  /* old explorer styles removed — now in ex object */
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

/* ── Data Explorer styles ── */
const ex: Record<string, React.CSSProperties> = {
  hint: {
    fontSize: 13,
    color: colors.gray400,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 16,
  },
  panel: {
    background: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.gray200}`,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 400,
    maxHeight: 600,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  panelLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.navy,
  },
  fieldCount: {
    fontSize: 11,
    fontWeight: 600,
    background: colors.gray100,
    color: colors.gray400,
    padding: '2px 8px',
    borderRadius: 10,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    margin: '10px 12px 6px',
    padding: '6px 10px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    background: colors.gray100,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    color: colors.navy,
  },
  clearSearch: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.gray400,
    padding: 0,
    display: 'flex',
  },
  catPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    padding: '6px 12px 8px',
  },
  catPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all .15s',
  },
  fieldList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 6px 8px',
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px 4px',
    fontSize: 11,
    fontWeight: 700,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  addAllBtn: {
    fontSize: 10,
    color: colors.gold,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  fieldItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    transition: 'background .12s',
  },
  fieldName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
  },
  fieldDesc: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 1,
  },
  emptyFields: {
    padding: 24,
    textAlign: 'center' as const,
    fontSize: 12,
    color: colors.gray400,
  },
  emptySelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    textAlign: 'center' as const,
  },
  selectedList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 6px',
  },
  selectedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 8px',
    marginBottom: 2,
    borderRadius: 6,
    background: colors.gray100,
    border: `1px solid ${colors.gray200}`,
  },
  selectedGrip: {
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  selectedName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
  },
  selectedCat: {
    fontSize: 10,
    color: colors.gray400,
  },
  selectedActions: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  moveBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.navy,
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.red,
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    marginLeft: 4,
  },
  optionsBar: {
    display: 'flex',
    gap: 12,
    padding: '10px 12px',
    borderTop: `1px solid ${colors.gray200}`,
  },
  optionGroup: {
    flex: 1,
  },
  optionLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
  },
  optionSelect: {
    width: '100%',
    padding: '6px 8px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'inherit',
    color: colors.navy,
  },
  sortDirBtn: {
    padding: '4px 8px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: 4,
    background: colors.gray100,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: colors.navy,
    whiteSpace: 'nowrap',
  },
  actionBar: {
    display: 'flex',
    gap: 6,
    padding: '10px 12px',
    borderTop: `1px solid ${colors.gray200}`,
  },
  runBtn: {
    flex: 2,
    padding: '9px 12px',
    background: colors.green,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background .15s',
  },
  exportBtn: {
    flex: 1,
    padding: '9px 8px',
    background: colors.gray100,
    color: colors.navy,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    padding: '9px 8px',
    background: colors.gold,
    color: colors.navy,
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllBtn: {
    width: '100%',
    padding: '8px',
    background: 'none',
    border: 'none',
    color: colors.red,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderTop: `1px solid ${colors.gray200}`,
  },
  resultsPanel: {
    background: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.gray200}`,
    padding: 16,
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultsBadge: {
    fontSize: 10,
    fontWeight: 600,
    background: `${colors.green}15`,
    color: colors.green,
    padding: '2px 8px',
    borderRadius: 10,
  },
};
