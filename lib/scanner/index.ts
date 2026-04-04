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

// Phase 1A Task 3: Website "accepting new patients" detector
export {
  detectAcceptingPatients,
  type AcceptingPatientsResult,
  type AcceptingPatientsStatus,
  type AcceptingPatientsConfidence,
} from './accepting-patients-detector';

// Phase 1A Task 5: AI vendor fingerprint detection engine
export {
  detectAITools,
  saveAIToolDetections,
  type DetectedAITool,
  type AIDetectionResult,
  type AIToolCategory,
  type DetectionMethod,
} from './ai-tool-detector';
