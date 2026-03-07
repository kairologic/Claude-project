// lib/nppes/snapshot.ts
// ═══ NPPES Snapshot Sync + Delta Detection ═══
// Task 1.3: Creates weekly field-level snapshots for tracked providers,
// then diffs current vs. previous to generate nppes_delta_events.

import type { NppesRecord } from './v2-columns';
import {
  insertSnapshots,
  fetchLatestSnapshots,
  insertDeltaEvents,
  updatePracticeProviderMismatchFlags,
  type SnapshotRow,
  type DeltaEventRow,
} from './supabase-client';

/** Fields we track for drift detection between snapshots */
const TRACKED_FIELDS: Array<{
  field: keyof SnapshotRow;
  signalType: string;
  mismatchFlag: string;
}> = [
  { field: 'address_line_1', signalType: 'address_change', mismatchFlag: 'has_address_mismatch' },
  { field: 'address_line_2', signalType: 'address_change', mismatchFlag: 'has_address_mismatch' },
  { field: 'city',           signalType: 'address_change', mismatchFlag: 'has_address_mismatch' },
  { field: 'state',          signalType: 'address_change', mismatchFlag: 'has_address_mismatch' },
  { field: 'zip_code',       signalType: 'address_change', mismatchFlag: 'has_address_mismatch' },
  { field: 'phone',          signalType: 'phone_change',   mismatchFlag: 'has_phone_mismatch' },
  { field: 'fax',            signalType: 'phone_change',   mismatchFlag: 'has_phone_mismatch' },
  { field: 'primary_taxonomy_code', signalType: 'taxonomy_change', mismatchFlag: 'has_taxonomy_mismatch' },
  { field: 'first_name',     signalType: 'name_change',    mismatchFlag: 'has_name_mismatch' },
  { field: 'last_name',      signalType: 'name_change',    mismatchFlag: 'has_name_mismatch' },
  { field: 'organization_name', signalType: 'name_change', mismatchFlag: 'has_name_mismatch' },
  { field: 'deactivation_date', signalType: 'provider_removed', mismatchFlag: 'has_name_mismatch' },
];

export interface SnapshotSyncResult {
  snapshotsCreated: number;
  deltaEventsCreated: number;
  providersWithChanges: number;
  durationMs: number;
}

/**
 * Create snapshots for a batch of NPPES records, then detect deltas
 * by comparing against the most recent previous snapshots.
 *
 * This is the core of Task 1.3: the weekly snapshot + diff pipeline.
 *
 * @param records - Parsed NPPES records (from the weekly diff or full file)
 * @param snapshotDate - ISO date string for this snapshot (e.g. '2026-03-07')
 * @param sourceFile - Which NPPES file this came from (e.g. 'weekly_diff_20260307')
 * @param trackedNpis - Set of NPIs we're actively monitoring. Only these get snapshots.
 */
export async function createSnapshotsAndDetectDeltas(
  records: NppesRecord[],
  snapshotDate: string,
  sourceFile: string,
  trackedNpis: Set<string>,
): Promise<SnapshotSyncResult> {
  const startTime = Date.now();
  let snapshotsCreated = 0;
  let deltaEventsCreated = 0;
  const providersWithChanges = new Set<string>();

  // 1. Filter to only tracked NPIs
  const trackedRecords = records.filter((r) => trackedNpis.has(r.npi));
  if (trackedRecords.length === 0) {
    return {
      snapshotsCreated: 0,
      deltaEventsCreated: 0,
      providersWithChanges: 0,
      durationMs: Date.now() - startTime,
    };
  }

  console.log(
    `[Snapshot] Processing ${trackedRecords.length} tracked records out of ${records.length} total`,
  );

  // 2. Fetch previous snapshots for comparison
  const trackedNpiList = trackedRecords.map((r) => r.npi);
  const previousSnapshots = await fetchLatestSnapshots(trackedNpiList);
  console.log(
    `[Snapshot] Found ${previousSnapshots.size} previous snapshots for comparison`,
  );

  // 3. Build new snapshot rows
  const snapshotRows: SnapshotRow[] = trackedRecords.map((r) => ({
    npi: r.npi,
    snapshot_date: snapshotDate,
    first_name: r.first_name,
    last_name: r.last_name,
    organization_name: r.organization_name,
    credential: r.credential,
    address_line_1: r.address_line_1,
    address_line_2: r.address_line_2,
    city: r.city,
    state: r.state,
    zip_code: r.zip_code,
    phone: r.phone,
    fax: r.fax,
    primary_taxonomy_code: r.primary_taxonomy_code,
    taxonomy_desc: r.taxonomy_desc,
    entity_type_code: r.entity_type_code,
    last_nppes_update_date: r.last_nppes_update_date,
    deactivation_date: r.deactivation_date,
    gender: r.gender,
    sole_proprietor: r.sole_proprietor,
    source_file: sourceFile,
  }));

  // 4. Insert snapshots in batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < snapshotRows.length; i += BATCH_SIZE) {
    const batch = snapshotRows.slice(i, i + BATCH_SIZE);
    snapshotsCreated += await insertSnapshots(batch);
  }
  console.log(`[Snapshot] Created ${snapshotsCreated} snapshots`);

  // 5. Detect deltas: compare each new snapshot against previous
  const allDeltaEvents: DeltaEventRow[] = [];
  const now = new Date().toISOString();

  for (const record of trackedRecords) {
    const prev = previousSnapshots.get(record.npi);
    if (!prev) continue; // no previous snapshot = first observation, no delta

    const newSnapshot = snapshotRows.find((s) => s.npi === record.npi);
    if (!newSnapshot) continue;

    const deltas = detectFieldDeltas(record.npi, prev, newSnapshot, now);
    if (deltas.length > 0) {
      allDeltaEvents.push(...deltas);
      providersWithChanges.add(record.npi);
    }
  }

  // 6. Insert delta events in batches
  for (let i = 0; i < allDeltaEvents.length; i += BATCH_SIZE) {
    const batch = allDeltaEvents.slice(i, i + BATCH_SIZE);
    deltaEventsCreated += await insertDeltaEvents(batch);
  }
  console.log(
    `[Snapshot] Created ${deltaEventsCreated} delta events for ${providersWithChanges.size} providers`,
  );

  // 7. Update mismatch flags on practice_providers for changed NPIs
  for (const npi of providersWithChanges) {
    const npiDeltas = allDeltaEvents.filter((d) => d.npi === npi);
    const flags = computeMismatchFlags(npiDeltas);
    try {
      await updatePracticeProviderMismatchFlags(npi, flags);
    } catch (err) {
      // practice_providers row may not exist yet for this NPI
      console.warn(`[Snapshot] Could not update flags for NPI ${npi}:`, err);
    }
  }

  return {
    snapshotsCreated,
    deltaEventsCreated,
    providersWithChanges: providersWithChanges.size,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Compare two snapshots field-by-field and generate delta events
 * for any changes detected.
 */
function detectFieldDeltas(
  npi: string,
  previous: SnapshotRow,
  current: SnapshotRow,
  detectedAt: string,
): DeltaEventRow[] {
  const deltas: DeltaEventRow[] = [];

  for (const { field, signalType } of TRACKED_FIELDS) {
    const oldVal = normalizeValue(previous[field] as string | null);
    const newVal = normalizeValue(current[field] as string | null);

    if (oldVal !== newVal) {
      deltas.push({
        npi,
        practice_website_id: null, // NPPES diff doesn't know the practice — linked later by delta engine
        field_name: field,
        old_value: previous[field] as string | null,
        new_value: current[field] as string | null,
        detection_source: 'nppes_diff',
        confidence: 'HIGH',        // NPPES is an authoritative source
        confidence_score: 0.95,
        signal_type: signalType,
        corroborated_by: ['nppes_diff'],
        corroboration_count: 1,
        detected_at: detectedAt,
      });
    }
  }

  return deltas;
}

/**
 * Normalize a field value for comparison.
 * Treats null, empty string, and whitespace-only as equivalent.
 * Lowercases and trims for case-insensitive comparison.
 */
function normalizeValue(val: string | null | undefined): string {
  if (val == null) return '';
  const trimmed = val.trim().toLowerCase();
  return trimmed;
}

/**
 * Compute mismatch flags from delta events for a single NPI.
 * Returns the fields to update on practice_providers.
 */
function computeMismatchFlags(deltas: DeltaEventRow[]): {
  has_address_mismatch: boolean;
  has_phone_mismatch: boolean;
  has_taxonomy_mismatch: boolean;
  has_name_mismatch: boolean;
  active_mismatch_count: number;
} {
  const signals = new Set(deltas.map((d) => d.signal_type));

  return {
    has_address_mismatch: signals.has('address_change'),
    has_phone_mismatch: signals.has('phone_change'),
    has_taxonomy_mismatch: signals.has('taxonomy_change'),
    has_name_mismatch: signals.has('name_change'),
    active_mismatch_count: deltas.length,
  };
}
