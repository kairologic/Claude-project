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
  Download,
  Eye,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { colors } from '@/lib/design-tokens';
import DataExplorer from '@/components/dashboard/DataExplorer';

// ─── Pre-built report types ─────────────────────────────────────────────────

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
    icon: <Users size={22} />,
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
    icon: <ShieldCheck size={22} />,
    filters: [{ id: 'timeframe', label: 'Timeframe', type: 'daterange' }],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'payer-status',
    title: 'Payer Directory Status',
    description: 'Coverage and status across all payer directories',
    icon: <Building2 size={22} />,
    filters: [{ id: 'payer', label: 'Payer', type: 'multiselect', options: [] }],
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'compliance',
    title: 'Compliance Status',
    description: 'Compliance scores and requirements status',
    icon: <CheckCircle size={22} />,
    filters: [
      { id: 'requirement', label: 'Requirement Type', type: 'select', options: [] },
    ],
    formats: ['Excel', 'CSV', 'PDF'],
  },
  {
    id: 'expiry',
    title: 'Credential Expiry',
    description: 'Licenses and credentials expiring soon',
    icon: <Calendar size={22} />,
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
    icon: <Zap size={22} />,
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
];

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const params = useParams();
  const practiceId = params.id as string;

  const [activeTab, setActiveTab] = useState<'prebuilt' | 'explorer'>('explorer');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('Excel');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  function openReportModal(report: ReportType) {
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

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabsBar}>
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
      </div>

      {/* Data Explorer Tab */}
      {activeTab === 'explorer' && (
        <div style={styles.explorerTab}>
          <DataExplorer practiceId={practiceId} />
        </div>
      )}

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
                <button onClick={() => openReportModal(report)} style={styles.generateBtn}>
                  Generate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for pre-built report generation */}
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
                                  : String(row[col] ?? '')}
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

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  explorerTab: {
    flex: 1,
    padding: '16px 24px',
    overflowY: 'auto',
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
    gap: 10,
    transition: 'box-shadow 0.15s',
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
  // Modal styles
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
