// lib/nppes/pecos-client.ts
// ═══ CMS PECOS Public Provider Enrollment Ingest ═══
// Task 1.4: Monthly download from data.cms.gov, parse into provider_pecos table.
//
// Data source: Medicare Fee-For-Service Public Provider Enrollment
// URL: https://data.cms.gov/public-provider-enrollment
// Auth: None. Free public data.
// Update cadence: Quarterly from CMS, we sync monthly to catch any updates.
//
// ── API-first approach (v2) ─────────────────────────────────────
// The original approach downloaded a 500MB CSV via the data.json catalog
// resolver. This failed because data.json itself is 100MB+ and times out.
//
// New approach: Hit the CMS Data API directly with the known dataset ID.
// Benefits: no temp files, server-side state filtering, JSON pagination.
// The file-based functions are retained as fallback for GitHub Actions.

import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BASE_URL = `${SUPABASE_URL}/rest/v1`;

// ── CMS Data API constants ────────────────────────────────────────
// Dataset IDs are stable across releases. These point to the "latest" version.
// Confirmed working as of March 2026.

const CMS_DATA_API_BASE = 'https://data.cms.gov/data-api/v1/dataset';

/** Base enrollment dataset — individual + org providers */
const PECOS_BASE_DATASET_ID = '2457ea29-fc82-48b0-86ec-3b0755de7515';

/** Reassignment dataset — provider → group billing relationships */
// TODO: Discover this ID. For now reassignment enrichment is skipped
// when using the API path. The base enrollment data alone is sufficient
// for the NPI resolution bridge (name + state + specialty).
const PECOS_REASSIGNMENT_DATASET_ID = '';

// Legacy catalog constants (kept for backwards compat)
const CMS_DATA_JSON_URL = 'https://data.cms.gov/data.json';
const PPEF_DATASET_TITLE = 'Medicare Fee-For-Service Public Provider Enrollment';

// ── Field mapping ────────────────────────────────────────────────
// CMS PPEF base enrollment API returns JSON with these keys:
// NPI, MULTIPLE_NPI_FLAG, PECOS_ASCT_CNTL_ID, ENRLMT_ID,
// PROVIDER_TYPE_CD, PROVIDER_TYPE_DESC, STATE_CD,
// FIRST_NAME, MDL_NAME, LAST_NAME, ORG_NAME,
// GNDR_SW, CRED, MED_SCH, GRD_YR,
// PRI_SPEC, SEC_SPEC_1, SEC_SPEC_2, SEC_SPEC_3, SEC_SPEC_4,
// CITY, ZIP, RNDRNG_PRVDR_RUCA, RNDRNG_PRVDR_RUCA_DESC

export interface PecosRecord {
  npi: string;
  enrollment_id: string | null;
  enrollment_status: string;
  enrollment_type: string | null;
  practice_type: string | null;
  provider_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  specialty: string | null;
  pecos_specialty: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  reassignment_npi: string | null;
  reassignment_name: string | null;
  source_file: string;
  source_date: string;
}

export interface PecosParseResult {
  records: PecosRecord[];
  totalLines: number;
  matched: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// NEW: API-based fetch (primary method)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch PECOS enrollment data directly from the CMS Data API.
 * Uses server-side state filtering and pagination — no temp files needed.
 *
 * This replaces the download-CSV-then-parse approach which failed because
 * the data.json catalog resolver times out (100MB+ JSON file).
 *
 * @param states - Array of state codes to fetch (e.g., ['TX', 'CA'])
 * @param options - limit, onProgress callback
 */
export async function fetchPecosFromApi(
  states: string[],
  options: {
    limit?: number;
    pageSize?: number;
    onProgress?: (fetched: number, state: string) => void;
  } = {},
): Promise<PecosParseResult> {
  const startTime = Date.now();
  const { limit = 0, pageSize = 5000, onProgress } = options;

  const allRecords: PecosRecord[] = [];
  let totalFetched = 0;
  let skipped = 0;
  let errors = 0;
  const sourceDate = new Date().toISOString().split('T')[0];

  for (const state of states) {
    console.log(`[PECOS API] Fetching ${state} providers...`);
    let offset = 0;
    let stateTotal = 0;
    let hasMore = true;

    while (hasMore) {
      if (limit > 0 && allRecords.length >= limit) {
        hasMore = false;
        break;
      }

      const url =
        `${CMS_DATA_API_BASE}/${PECOS_BASE_DATASET_ID}/data` +
        `?filter[STATE_CD]=${state}` +
        `&size=${pageSize}` +
        `&offset=${offset}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[PECOS API] HTTP ${res.status} at offset ${offset} for ${state}`);
          errors++;
          // Retry once after a brief pause
          await sleep(2000);
          const retry = await fetch(url);
          if (!retry.ok) {
            console.error(`[PECOS API] Retry failed, skipping batch`);
            errors++;
            break;
          }
          const retryData = await retry.json();
          processPage(retryData);
          continue;
        }

        const data = await res.json();

        // API returns an array of objects
        const rows: any[] = Array.isArray(data) ? data : [];

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          const record = apiRowToPecosRecord(row, sourceDate);
          if (record) {
            allRecords.push(record);
            stateTotal++;
          } else {
            skipped++;
          }
        }

        totalFetched += rows.length;
        offset += pageSize;

        if (onProgress) {
          onProgress(totalFetched, state);
        }

        // If we got fewer than pageSize, we've reached the end
        if (rows.length < pageSize) {
          hasMore = false;
        }

        // Small delay between pages to be respectful
        if (hasMore) {
          await sleep(200);
        }
      } catch (err: any) {
        console.error(`[PECOS API] Error at offset ${offset}: ${err.message}`);
        errors++;
        break;
      }
    }

    console.log(`[PECOS API] ${state}: ${stateTotal.toLocaleString()} records fetched`);
  }

  function processPage(data: any) {
    const rows: any[] = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const record = apiRowToPecosRecord(row, sourceDate);
      if (record) {
        allRecords.push(record);
      } else {
        skipped++;
      }
    }
    totalFetched += rows.length;
    offset += pageSize;
  }

  return {
    records: allRecords,
    totalLines: totalFetched,
    matched: allRecords.length,
    skipped,
    errors,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Convert a CMS API JSON row to a PecosRecord.
 */
function apiRowToPecosRecord(
  row: Record<string, string>,
  sourceDate: string,
): PecosRecord | null {
  const npi = row['NPI']?.trim();
  if (!npi || npi.length !== 10) return null;

  const firstName = row['FIRST_NAME']?.trim() || null;
  const lastName = row['LAST_NAME']?.trim() || null;
  const orgName = row['ORG_NAME']?.trim() || null;

  let providerName: string | null = null;
  if (orgName) {
    providerName = orgName;
  } else if (firstName && lastName) {
    providerName = `${lastName}, ${firstName}`;
  }

  const providerTypeCd = row['PROVIDER_TYPE_CD']?.trim() || '';
  const isOrg = !firstName && !!orgName;

  return {
    npi,
    enrollment_id: row['ENRLMT_ID']?.trim() || null,
    enrollment_status: 'Approved',
    enrollment_type: isOrg ? 'organization' : 'individual',
    practice_type: row['PROVIDER_TYPE_DESC']?.trim() || null,
    provider_name: providerName,
    first_name: firstName,
    last_name: lastName,
    organization_name: orgName,
    specialty: row['PRI_SPEC']?.trim() || null,
    pecos_specialty: providerTypeCd || null,
    city: row['CITY']?.trim() || null,
    state: row['STATE_CD']?.trim() || null,
    zip_code: row['ZIP']?.trim() || null,
    reassignment_npi: null,
    reassignment_name: null,
    source_file: `pecos_api_${sourceDate}`,
    source_date: sourceDate,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY: File-based functions (retained for GitHub Actions fallback)
// ═══════════════════════════════════════════════════════════════════

/**
 * Resolve download URLs from CMS catalog.
 * WARNING: data.json is 100MB+ and may time out on local machines.
 * Use fetchPecosFromApi() instead for interactive runs.
 */
export async function resolvePecosDownloadUrls(): Promise<{
  baseEnrollmentUrl: string;
  reassignmentUrl: string;
}> {
  console.log('[PECOS] Resolving download URLs from CMS catalog...');
  console.log('[PECOS] WARNING: data.json is ~100MB. This may take several minutes.');

  const catalogRes = await fetch(CMS_DATA_JSON_URL);
  if (!catalogRes.ok) {
    throw new Error(
      `Failed to fetch CMS data.json: HTTP ${catalogRes.status}`,
    );
  }

  const catalog = await catalogRes.json();

  const dataset = catalog.dataset?.find(
    (ds: any) => ds.title === PPEF_DATASET_TITLE,
  );
  if (!dataset) {
    throw new Error(
      `Dataset "${PPEF_DATASET_TITLE}" not found in CMS catalog. ` +
        `The title may have changed — check https://data.cms.gov/data.json`,
    );
  }

  const csvDist = dataset.distribution?.find(
    (d: any) => d.mediaType === 'text/csv',
  );
  if (!csvDist?.downloadURL) {
    throw new Error(
      'No CSV downloadURL found for PPEF base enrollment in CMS catalog',
    );
  }

  console.log(`[PECOS] Base enrollment URL: ${csvDist.downloadURL}`);

  const resourcesApiUrl = csvDist.resourcesAPI;
  if (!resourcesApiUrl) {
    throw new Error(
      'No resourcesAPI URL found in PPEF distribution.',
    );
  }

  const resourcesRes = await fetch(resourcesApiUrl);
  if (!resourcesRes.ok) {
    throw new Error(
      `Failed to fetch PPEF resources list: HTTP ${resourcesRes.status}`,
    );
  }

  const resources = await resourcesRes.json();

  const reassignmentResource = resources.data?.find((r: any) =>
    r.name?.toLowerCase().includes('reassignment'),
  );
  if (!reassignmentResource?.downloadURL) {
    throw new Error(
      'Reassignment Sub-File not found in PPEF resources. ' +
        `Available resources: ${resources.data?.map((r: any) => r.name).join(', ')}`,
    );
  }

  console.log(`[PECOS] Reassignment URL: ${reassignmentResource.downloadURL}`);

  return {
    baseEnrollmentUrl: csvDist.downloadURL,
    reassignmentUrl: reassignmentResource.downloadURL,
  };
}

export function downloadCmsFile(
  url: string,
  destPath: string,
  label: string,
): void {
  console.log(`[PECOS] Downloading ${label}...`);
  const { execSync } = require('child_process');
  const { statSync } = require('fs');

  execSync(`curl -sS -L --retry 3 --retry-delay 5 -o "${destPath}" "${url}"`, {
    stdio: 'inherit',
    timeout: 600_000,
  });

  const size = statSync(destPath).size;
  console.log(
    `[PECOS] Downloaded ${label}: ${(size / 1024 / 1024).toFixed(1)} MB`,
  );

  if (size < 1024) {
    throw new Error(
      `[PECOS] ${label} download appears empty or invalid (${size} bytes). ` +
        `The resolved URL may be stale — re-run resolvePecosDownloadUrls() to refresh.`,
    );
  }
}

// ── CSV parser (header-based) ────────────────────────────────────

function parseCSVLineQuoted(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parsePecosRow(
  row: Record<string, string>,
  sourceFile: string,
  sourceDate: string,
): PecosRecord | null {
  const npi = row['NPI']?.trim();
  if (!npi || npi.length !== 10) return null;

  const firstName = row['FIRST_NAME']?.trim() || null;
  const lastName = row['LAST_NAME']?.trim() || null;
  const orgName = row['ORG_NAME']?.trim() || null;

  let providerName: string | null = null;
  if (orgName) {
    providerName = orgName;
  } else if (firstName && lastName) {
    providerName = `${lastName}, ${firstName}`;
  }

  const providerTypeCd = row['PROVIDER_TYPE_CD']?.trim() || '';
  const isOrg = !firstName && !!orgName;

  return {
    npi,
    enrollment_id: row['ENRLMT_ID']?.trim() || null,
    enrollment_status: 'Approved',
    enrollment_type: isOrg ? 'organization' : 'individual',
    practice_type: row['PROVIDER_TYPE_DESC']?.trim() || null,
    provider_name: providerName,
    first_name: firstName,
    last_name: lastName,
    organization_name: orgName,
    specialty: row['PRI_SPEC']?.trim() || null,
    pecos_specialty: providerTypeCd || null,
    city: row['CITY']?.trim() || null,
    state: row['STATE_CD']?.trim() || null,
    zip_code: row['ZIP']?.trim() || null,
    reassignment_npi: null,
    reassignment_name: null,
    source_file: sourceFile,
    source_date: sourceDate,
  };
}

export async function parsePecosFile(
  filePath: string,
  sourceDate: string,
  options: {
    filterStates?: Set<string>;
    limit?: number;
    onProgress?: (processed: number, matched: number) => void;
  } = {},
): Promise<PecosParseResult> {
  const startTime = Date.now();
  const { filterStates, limit = 0, onProgress } = options;

  const records: PecosRecord[] = [];
  let headers: string[] = [];
  let totalLines = 0;
  let matched = 0;
  let skipped = 0;
  let errors = 0;
  let isHeader = true;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (isHeader) {
      headers = parseCSVLineQuoted(line).map((h) => h.trim());
      isHeader = false;
      continue;
    }

    totalLines++;
    if (limit > 0 && matched >= limit) break;

    try {
      const fields = parseCSVLineQuoted(line);
      const row: Record<string, string> = {};
      headers.forEach((h: any, idx: any) => {
        row[h] = fields[idx] || '';
      });

      const record = parsePecosRow(row, `pecos_base_${sourceDate}`, sourceDate);
      if (!record) {
        skipped++;
        continue;
      }

      if (filterStates && record.state && !filterStates.has(record.state)) {
        skipped++;
        continue;
      }

      records.push(record);
      matched++;
    } catch (err) {
      errors++;
    }

    if (onProgress && totalLines % 50000 === 0) {
      onProgress(totalLines, matched);
    }
  }

  return {
    records,
    totalLines,
    matched,
    skipped,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// ── Reassignment enrichment ──────────────────────────────────────

interface ReassignmentRecord {
  renderingNpi: string;
  receivingNpi: string;
  receivingName: string;
}

export async function parseReassignmentFile(
  filePath: string,
): Promise<Map<string, ReassignmentRecord>> {
  const map = new Map<string, ReassignmentRecord>();

  let headers: string[] = [];
  let isHeader = true;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (isHeader) {
      headers = parseCSVLineQuoted(line).map((h: any) => h.trim());
      isHeader = false;
      continue;
    }

    try {
      const fields = parseCSVLineQuoted(line);
      const row: Record<string, string> = {};
      headers.forEach((h: any, idx: any) => {
        row[h] = fields[idx] || '';
      });

      const renderNpi = row['RNDRNG_NPI']?.trim();
      const recvNpi = row['RCV_NPI']?.trim();
      if (!renderNpi || !recvNpi) continue;

      const recvName =
        row['RCV_PRVDR_LAST_NAME_ORG']?.trim() ||
        row['RCV_PRVDR_FIRST_NAME']?.trim() ||
        '';

      if (!map.has(renderNpi)) {
        map.set(renderNpi, {
          renderingNpi: renderNpi,
          receivingNpi: recvNpi,
          receivingName: recvName,
        });
      }
    } catch {
      // skip bad rows
    }
  }

  return map;
}

export function enrichWithReassignments(
  records: PecosRecord[],
  reassignments: Map<string, ReassignmentRecord>,
): PecosRecord[] {
  for (const record of records) {
    const reassignment = reassignments.get(record.npi);
    if (reassignment) {
      record.reassignment_npi = reassignment.receivingNpi;
      record.reassignment_name = reassignment.receivingName;
    }
  }
  return records;
}

// ── Supabase upsert ──────────────────────────────────────────────

export async function upsertPecosRecords(
  records: PecosRecord[],
): Promise<number> {
  if (records.length === 0) return 0;

  // Deduplicate by NPI — keep first occurrence
  // (PECOS can have multiple enrollments per NPI, e.g. different specialties)
  const seen = new Set<string>();
  const unique = records.filter((r: any) => {
    if (seen.has(r.npi)) return false;
    seen.add(r.npi);
    return true;
  });
  console.log(`[PECOS] Deduplicated: ${records.length.toLocaleString()} → ${unique.length.toLocaleString()} unique NPIs`);

  const rows = unique.map((r: any) => ({
    npi: r.npi,
    enrollment_id: r.enrollment_id,
    enrollment_status: r.enrollment_status,
    enrollment_type: r.enrollment_type,
    practice_type: r.practice_type,
    provider_name: r.provider_name,
    first_name: r.first_name,
    last_name: r.last_name,
    organization_name: r.organization_name,
    specialty: r.specialty,
    pecos_specialty: r.pecos_specialty,
    city: r.city,
    state: r.state,
    zip_code: r.zip_code,
    reassignment_npi: r.reassignment_npi,
    reassignment_name: r.reassignment_name,
    source_file: r.source_file,
    source_date: r.source_date,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${BASE_URL}/provider_pecos?on_conflict=npi`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `PECOS upsert failed (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${response.status} ${errorText}`,
      );
    }

    upserted += batch.length;

    if (upserted % 5000 === 0) {
      console.log(`[PECOS] Upserted ${upserted.toLocaleString()} records...`);
    }
  }

  return upserted;
}

// ── Backwards-compat export ──────────────────────────────────────
export const PECOS_URLS = {
  catalog: CMS_DATA_JSON_URL,
  datasetTitle: PPEF_DATASET_TITLE,
  baseDatasetId: PECOS_BASE_DATASET_ID,
};
