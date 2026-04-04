// lib/trial/index.ts

export {
  getTrialState,
  startTrial,
  downgradeExpiredTrials,
  recordUpgrade,
  getFeatureGates,
  checkFeatureAccess,
  TRIAL_DURATION_DAYS,
  TRIAL_TIER,
  FREE_TIER,
  FOUNDERS_RATE,
  type PlanTier,
  type TrialStatus,
  type TrialState,
  type FeatureGates,
} from './trial-manager';

export {
  runTrialEmailSequence,
  sendDay7Email,
  sendDay12Email,
  sendDay14Email,
  sendDay21Email,
  type SequenceResult,
} from './trial-emails';
