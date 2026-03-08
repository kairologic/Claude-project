// lib/scanner/index.ts
// ═══ Scanner Module Exports ═══

export {
  runScheduler,
  scanSite,
  fetchDueSites,
  type PracticeWebsite,
  type ScanResult,
  type SchedulerResult,
  type MatchedProvider,
} from './scan-scheduler';

export {
  runDeltaDetection,
  runDeltaDetectionBatch,
  assembleProviderData,
  detectDeltas,
  type DeltaEvent,
  type ProviderDataSources,
  type DeltaEngineResult,
} from './delta-engine';
