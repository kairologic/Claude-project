/**
 * lib/resilience/conflict-resolver.ts
 *
 * #79g-i — Multi-source conflict resolution.
 * When NPPES, website, and payer directories disagree, this module
 * surfaces the conflict, ranks by priority, and records the resolution.
 */

// ── Source priority ──────────────────────────────────────────

/**
 * Priority order for data sources (highest first).
 * Used when auto-resolving conflicts.
 */
export const SOURCE_PRIORITY: Record<string, number> = {
  nppes: 100, // Federal registry — gold standard
  state_board: 90, // State licensing board
  'payer:uhc': 70, // Major national payers
  'payer:aetna': 70,
  'payer:cigna': 70,
  'payer:humana': 70,
  'payer:bcbs_tx': 65,
  'payer:bcbs_ca': 65,
  website: 50, // Practice website — may be stale
  caqh: 80, // CAQH ProView — authoritative for credentialing
};

// ── Conflict types ──────────────────────────────────────────

export interface DataPoint {
  source: string;
  value: string;
  captured_at: string;
  confidence: number; // 0-1
}

export interface Conflict {
  field: string; // 'address', 'phone', 'specialty', 'name'
  npi: string;
  practice_id: string;
  data_points: DataPoint[];
  distinct_values: string[];
  /** The recommended value based on source priority */
  recommended_value: string;
  recommended_source: string;
  /** Conflict severity: 'critical' if NPPES disagrees, 'moderate' if payers disagree */
  severity: 'critical' | 'moderate' | 'low';
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  resolved_value: string;
  resolved_by: 'auto' | 'user';
  resolved_source: string;
  resolved_at: string;
  notes?: string;
}

// ── Detect conflicts ────────────────────────────────────────

/**
 * Given data from multiple sources for the same field,
 * detect and classify the conflict.
 */
export function detectConflict(
  field: string,
  npi: string,
  practiceId: string,
  dataPoints: DataPoint[],
): Conflict | null {
  // Filter out empty values
  const valid = dataPoints.filter((dp) => dp.value && dp.value.trim().length > 0);

  if (valid.length < 2) return null;

  // Normalize values for comparison
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  const groups = new Map<string, DataPoint[]>();

  for (const dp of valid) {
    const key = normalize(dp.value);
    const existing = groups.get(key) || [];
    existing.push(dp);
    groups.set(key, existing);
  }

  // If all values normalize to the same thing, no conflict
  if (groups.size <= 1) return null;

  // Find distinct values
  const distinctValues = [...new Set(valid.map((dp) => dp.value))];

  // Determine recommended value by source priority
  const sorted = [...valid].sort((a, b) => {
    const prioA = SOURCE_PRIORITY[a.source] || 0;
    const prioB = SOURCE_PRIORITY[b.source] || 0;
    if (prioB !== prioA) return prioB - prioA;
    // Tie-break by recency
    return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
  });

  const recommended = sorted[0];

  // Determine severity
  const nppesPoint = valid.find((dp) => dp.source === 'nppes');
  const nppesValue = nppesPoint ? normalize(nppesPoint.value) : null;
  const othersDisagreeWithNppes =
    nppesValue && valid.some((dp) => dp.source !== 'nppes' && normalize(dp.value) !== nppesValue);

  let severity: Conflict['severity'] = 'low';
  if (othersDisagreeWithNppes) {
    severity = 'critical';
  } else if (groups.size > 2) {
    severity = 'moderate';
  }

  return {
    field,
    npi,
    practice_id: practiceId,
    data_points: valid,
    distinct_values: distinctValues,
    recommended_value: recommended.value,
    recommended_source: recommended.source,
    severity,
  };
}

// ── Auto-resolve ────────────────────────────────────────────

/**
 * Auto-resolve a conflict using source priority.
 * Only auto-resolves if confidence is high enough.
 */
export function autoResolve(conflict: Conflict, minConfidence = 0.8): ConflictResolution | null {
  // Don't auto-resolve critical conflicts (NPPES disagrees)
  if (conflict.severity === 'critical') return null;

  // Check if the recommended source has high enough confidence
  const recommended = conflict.data_points.find((dp) => dp.source === conflict.recommended_source);

  if (!recommended || recommended.confidence < minConfidence) return null;

  // Check if majority agrees with recommendation
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  const recNorm = normalize(conflict.recommended_value);
  const agreeing = conflict.data_points.filter((dp) => normalize(dp.value) === recNorm);

  // Need at least 2 sources to agree, or the highest-priority source
  if (agreeing.length < 2 && (SOURCE_PRIORITY[conflict.recommended_source] || 0) < 80) {
    return null;
  }

  return {
    resolved_value: conflict.recommended_value,
    resolved_by: 'auto',
    resolved_source: conflict.recommended_source,
    resolved_at: new Date().toISOString(),
    notes: `Auto-resolved: ${agreeing.length} of ${conflict.data_points.length} sources agree. Priority source: ${conflict.recommended_source}`,
  };
}

// ── Build conflict summary for display ──────────────────────

export interface ConflictSummary {
  total_conflicts: number;
  critical: number;
  moderate: number;
  low: number;
  auto_resolved: number;
  needs_review: number;
  conflicts: Conflict[];
}

/**
 * Process a batch of multi-source data and return a conflict summary.
 */
export function summarizeConflicts(conflicts: Conflict[]): ConflictSummary {
  let autoResolved = 0;
  const processed = conflicts.map((c) => {
    if (!c.resolution) {
      const resolution = autoResolve(c);
      if (resolution) {
        c.resolution = resolution;
        autoResolved++;
      }
    }
    return c;
  });

  return {
    total_conflicts: processed.length,
    critical: processed.filter((c) => c.severity === 'critical').length,
    moderate: processed.filter((c) => c.severity === 'moderate').length,
    low: processed.filter((c) => c.severity === 'low').length,
    auto_resolved: autoResolved,
    needs_review: processed.filter((c) => !c.resolution).length,
    conflicts: processed,
  };
}
