// lib/nppes/supabase-client.ts
// ═══ Supabase REST Client for NPPES Sync Pipeline ═══
// Lightweight REST client for batch upserts. No SDK dependency —
// GitHub Actions runner doesn't need the full Supabase JS client.

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
  );
}

const BASE_URL = `${SUPABASE_URL}/rest/v1`;

interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  prefer?: string;
}

/**
 * Make an authenticated request to the Supabase REST API.
 */
async function supabaseRequest(
  path: string,
  options: FetchOptions = {},
): Promise<any> {
  const { method = 'GET', body, headers = {}, prefer } = options;

  const requestHeaders: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...headers,
  };

  if (prefer) {
    requestHeaders['Prefer'] = prefer;
  }

  const response = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase ${method} ${path} failed (${response.status}): ${errorText}`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

// ── Providers table operations ──────────────────────────────────

export interface ProviderUpsertRow {
  npi: string;
  entity_type_code: string | null;
  organization_name: string | null;
  first_name: string | null;
  last_name: string | null;
  credential: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country_code: string | null;
  phone: string | null;
  fax: string | null;
  primary_taxonomy_code: string | null;
  last_nppes_update_date: string | null;
  deactivation_date: string | null;
  last_updated_at: string;
}

/**
 * Batch upsert providers from NPPES data.
 * Uses Supabase upsert (INSERT ... ON CONFLICT) on the NPI primary key.
 */
export async function upsertProviders(
  rows: ProviderUpsertRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  await supabaseRequest('providers', {
    method: 'POST',
    body: rows,
    prefer: 'resolution=merge-duplicates',
  });

  return rows.length;
}

// ── Snapshot operations ─────────────────────────────────────────

export interface SnapshotRow {
  npi: string;
  snapshot_date: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  credential: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  fax: string | null;
  primary_taxonomy_code: string | null;
  taxonomy_desc: string | null;
  entity_type_code: string | null;
  last_nppes_update_date: string | null;
  deactivation_date: string | null;
  gender: string | null;
  sole_proprietor: string | null;
  source_file: string;
}

/**
 * Batch insert NPPES snapshots.
 * Uses ON CONFLICT (npi, snapshot_date) DO NOTHING — if a snapshot
 * already exists for this NPI + date, skip it.
 */
export async function insertSnapshots(
  rows: SnapshotRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  await supabaseRequest('provider_nppes_snapshots', {
    method: 'POST',
    body: rows,
    prefer: 'resolution=ignore-duplicates',
    headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
  });

  return rows.length;
}

/**
 * Fetch the most recent snapshot for a set of NPIs (for delta comparison).
 * Returns a map of NPI → most recent snapshot row.
 */
export async function fetchLatestSnapshots(
  npis: string[],
): Promise<Map<string, SnapshotRow>> {
  const map = new Map<string, SnapshotRow>();
  if (npis.length === 0) return map;

  // Process in chunks of 200 (URL length limits)
  const chunkSize = 200;
  for (let i = 0; i < npis.length; i += chunkSize) {
    const chunk = npis.slice(i, i + chunkSize);
    const npiList = chunk.map((n) => `"${n}"`).join(',');

    // Use Supabase's distinct on + order to get latest per NPI
    const rows: SnapshotRow[] = await supabaseRequest(
      `provider_nppes_snapshots?npi=in.(${npiList})&order=npi.asc,snapshot_date.desc&select=*`,
    );

    // Keep only the first (most recent) per NPI
    for (const row of rows) {
      if (!map.has(row.npi)) {
        map.set(row.npi, row);
      }
    }
  }

  return map;
}

// ── Delta event operations ──────────────────────────────────────

export interface DeltaEventRow {
  npi: string;
  practice_website_id: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  detection_source: string;
  confidence: string;
  confidence_score: number;
  signal_type: string;
  corroborated_by: string[];
  corroboration_count: number;
  detected_at: string;
}

/**
 * Batch insert delta events. These are immutable — always INSERT, never UPDATE.
 */
export async function insertDeltaEvents(
  rows: DeltaEventRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  await supabaseRequest('nppes_delta_events', {
    method: 'POST',
    body: rows,
    prefer: 'return=minimal',
  });

  return rows.length;
}

// ── Practice provider lookups ───────────────────────────────────

/**
 * Fetch all NPIs that are currently tracked in practice_providers.
 * These are the providers we need to create snapshots for.
 */
export async function fetchTrackedNpis(): Promise<Set<string>> {
  const npis = new Set<string>();

  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const rows: Array<{ npi: string }> = await supabaseRequest(
      `practice_providers?select=npi&offset=${offset}&limit=${pageSize}`,
    );

    for (const row of rows) {
      npis.add(row.npi);
    }

    hasMore = rows.length === pageSize;
    offset += pageSize;
  }

  return npis;
}

/**
 * Fetch all NPIs from the providers table for specific states.
 * Used during initial snapshot seeding before practice_providers is populated.
 */
export async function fetchProviderNpisByState(
  states: string[],
  entityType: string = '1',
): Promise<Set<string>> {
  const npis = new Set<string>();
  const stateList = states.map((s) => `"${s}"`).join(',');

  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const rows: Array<{ npi: string }> = await supabaseRequest(
      `providers?select=npi&state=in.(${stateList})&entity_type_code=eq.${entityType}&deactivation_date=is.null&offset=${offset}&limit=${pageSize}`,
    );

    for (const row of rows) {
      npis.add(row.npi);
    }

    hasMore = rows.length === pageSize;
    offset += pageSize;
  }

  return npis;
}

/**
 * Update cached mismatch fields on practice_providers for a given NPI.
 */
export async function updatePracticeProviderMismatchFlags(
  npi: string,
  flags: {
    has_address_mismatch?: boolean;
    has_phone_mismatch?: boolean;
    has_taxonomy_mismatch?: boolean;
    has_name_mismatch?: boolean;
    active_mismatch_count?: number;
  },
): Promise<void> {
  await supabaseRequest(
    `practice_providers?npi=eq.${npi}`,
    {
      method: 'PATCH',
      body: { ...flags, updated_at: new Date().toISOString() },
      prefer: 'return=minimal',
    },
  );
}
