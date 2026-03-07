// lib/nppes/index.ts
// ═══ NPPES Module Exports ═══

export { NPPES_V2_COLUMNS, parseNppesRow, type NppesRecord } from './v2-columns';
export { parseNppesFile, parseNppesFileStreaming, type ParseOptions, type ParseResult } from './parser';
export { createSnapshotsAndDetectDeltas, type SnapshotSyncResult } from './snapshot';
export {
  upsertProviders,
  insertSnapshots,
  fetchLatestSnapshots,
  insertDeltaEvents,
  fetchTrackedNpis,
  fetchProviderNpisByState,
  updatePracticeProviderMismatchFlags,
  type ProviderUpsertRow,
  type SnapshotRow,
  type DeltaEventRow,
} from './supabase-client';

export {
  parsePecosFile,
  parseReassignmentFile,
  enrichWithReassignments,
  upsertPecosRecords,
  PECOS_URLS,
  type PecosRecord,
  type PecosParseResult,
} from './pecos-client';

export {
  parseRecord as parseTmbRecord,
  parseTMBFile,
  toProviderLicenseRow,
  upsertTmbRecords,
  type TMBPhysician,
} from './tmb-parser';
