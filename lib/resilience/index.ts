/**
 * lib/resilience/index.ts — Barrel export for resilience utilities.
 *
 * #79a-l: Data gap handling, source outage handling,
 * conflict resolution, stale workflow management.
 */

// Retry & circuit breaker (#79d-f)
export {
  retryWithBackoff,
  CircuitBreaker,
  withTimeout,
} from './retry';

export type {
  RetryOptions,
  RetryResult,
  CircuitState,
  CircuitBreakerOptions,
} from './retry';

// Stale workflow management (#79j-l)
export {
  ESCALATION_TIERS,
  calculateWorkflowHealth,
  generateStaleReport,
  bulkCancelStale,
} from './stale-workflow-manager';

export type {
  EscalationTier,
  WorkflowHealthScore,
  StaleWorkflowReport,
  BulkCleanupResult,
} from './stale-workflow-manager';

// Conflict resolution (#79g-i)
export {
  SOURCE_PRIORITY,
  detectConflict,
  autoResolve,
  summarizeConflicts,
} from './conflict-resolver';

export type {
  DataPoint,
  Conflict,
  ConflictResolution,
  ConflictSummary,
} from './conflict-resolver';
