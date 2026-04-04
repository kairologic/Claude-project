/**
 * lib/archival/archive-config.ts
 *
 * Configurable retention periods for the archival engine.
 */

export interface ArchiveConfig {
  /** Days after resolution before workflows are archived */
  workflowRetentionDays: number;
  /** Days after resolution before alerts are archived */
  alertRetentionDays: number;
  /** Maximum workflows to archive per batch (prevents long-running transactions) */
  batchSize: number;
  /** Whether to log detailed archival operations */
  verbose: boolean;
}

export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  workflowRetentionDays: 90,
  alertRetentionDays: 60,
  batchSize: 500,
  verbose: true,
};

/**
 * Returns the archive quarter string for a date (e.g., '2026-Q1')
 */
export function getArchiveQuarter(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}
