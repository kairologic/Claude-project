/**
 * lib/reports/index.ts
 *
 * Self-service reporting module.
 * Provides dynamic report queries with field selection, filtering,
 * and CSV/PDF export.
 */

export {
  REPORT_REGISTRY,
  getReportCatalog,
  type ReportDefinition,
  type FieldDefinition,
  type FilterDefinition,
} from './report-definitions';

export {
  executeReportQuery,
  reportToCSV,
  reportToPDFData,
  type ReportQueryRequest,
  type ReportQueryResult,
} from './query-engine';
