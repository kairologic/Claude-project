// lib/nppes/pecos-client.ts
// ═══ CMS PECOS Public Provider Enrollment Ingest ═══
// Task 1.4: Monthly download from data.cms.gov, parse into provider_pecos table.
//
// Data source: Medicare Fee-For-Service Public Provider Enrollment
// URL: https://data.cms.gov/public-provider-enrollment
// Auth: None. Free public data.
// Update cadence: Quarterly from CMS, we sync monthly to catch any updates.
//
// Three files published:
//   1. Base enrollment file (individual + org providers)
//   2. Reassignment file (provider → group billing relationships)
//   3. Practice location file (secondary practice locations)
//
// We primarily use (1) base enrollment for the NPI resolution bridge,
// augmented with (2) reassignment for group practice associations.

import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BASE_URL = `${SUPABASE_URL}/rest/v1`;

// ── CMS download URLs ────────────────────────────────────────────
// These are the direct CSV download endpoints from data.cms.gov.
// The base enrollment file contains the core fields we need for NPI resolution.

const PECOS_BASE_ENROLLMENT_URL =
  'https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment/data.csv';

const PECOS_REASSIGNMENT_URL =
  'https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/reassignment-sub-file/data.csv';

// ── Field mapping ────────────────────────────────────────────────
// CMS PPEF base enrollment file columns (header names, case-sensitive):
//
// NPI, PECOS ID, ENRLMT_ID, PROVIDER_TYPE_CD, PROVIDER_TYPE_DESC,
// STATE_CD, FIRST_NAME, MDL_NAME, LAST_NAME, ORG_NAME,
// GNDR_SW, CRED, MED_SCH, GRD_YR,
// PRI_SPEC, SEC_SPEC_1, SEC_SPEC_2, SEC_SPEC_3, SEC_SPEC_4,
// CITY, ZIP, RNDRNG_PRVDR_RUCA, RNDRNG_PRVDR_RUCA_DESC

// Reassignment file columns:
// RNDRNG_NPI, RNDRNG_PRVDR_LAST_NAME_ORG, RNDRNG_PRVDR_FIRST_NAME,
// RCV_NPI, RCV_PRVDR_LAST_NAME_ORG, RCV_PRVDR_FIRST_NAME,
// STATE_CD, RNDRNG_PRVDR_RUCA, RNDRNG_PRVDR_RUCA_DESC

export interface PecosRecord {
  npi: string;
  enrollment_id: string | null;
  enrollment_status: string;          // 'Approved' for active enrollees
  enrollment_type: string | null;     // individual / organization
  practice_type: string | null;       // provider type description
  provider_name: string | null;       // combined display name
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  specialty: string | null;           // primary specialty
  pecos_specialty: string | null;     // CMS provider type code
  city: string | null;
  state: string | null;
  zip_code: string | null;
  reassignment_npi: string | null;    // populated from reassignment file
  reassignment_name: string | null;
  source_file: string;
  source_date: string;
}

/**
 * Parse a single row from the PECOS base enrollment CSV.
 * Uses header-based field lookup (not positional) for robustness.
 */
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

  // Build display name
  let providerName: string | null = null;
  if (orgName) {
    providerName = orgName;
  } else if (firstName && lastName) {
    providerName = `${lastName}, ${firstName}`;
  }

  // Determine entity type from provider type code
  const providerTypeCd = row['PROVIDER_TYPE_CD']?.trim() || '';
  const isOrg = !firstName && !!orgName;

  return {
    npi,
    enrollment_id: row['ENRLMT_ID']?.trim() || null,
    enrollment_status: 'Approved', // PPEF only contains approved/active enrollees
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
    reassignment_npi: null,       // populated later from reassignment file
    reassignment_name: null,
    source_file: sourceFile,
    source_date: sourceDate,
  };
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

export interface PecosParseResult {
  records: PecosRecord[];
  totalLines: number;
  matched: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

/**
 * Parse the PECOS base enrollment CSV file with header-based field lookup.
 * Streams line-by-line for memory efficiency.
 */
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
      headers.forEach((h, idx) => {
        row[h] = fields[idx] || '';
      });

      const record = parsePecosRow(row, `pecos_base_${sourceDate}`, sourceDate);
      if (!record) {
        skipped++;
        continue;
      }

      // State filter
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

/**
 * Parse the reassignment file and build a lookup map:
 *   rendering NPI → receiving NPI (the group/org they bill through)
 */
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
      headers = parseCSVLineQuoted(line).map((h) => h.trim());
      isHeader = false;
      continue;
    }

    try {
      const fields = parseCSVLineQuoted(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = fields[idx] || '';
      });

      const renderNpi = row['RNDRNG_NPI']?.trim();
      const recvNpi = row['RCV_NPI']?.trim();
      if (!renderNpi || !recvNpi) continue;

      const recvName =
        row['RCV_PRVDR_LAST_NAME_ORG']?.trim() ||
        row['RCV_PRVDR_FIRST_NAME']?.trim() ||
        '';

      // Keep first reassignment per rendering NPI (primary)
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

/**
 * Enrich base enrollment records with reassignment data.
 */
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

/**
 * Batch upsert PECOS records into provider_pecos table.
 * Uses ON CONFLICT (npi) to update existing records.
 */
export async function upsertPecosRecords(
  records: PecosRecord[],
): Promise<number> {
  if (records.length === 0) return 0;

  const rows = records.map((r) => ({
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

  // Batch in chunks of 500
  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${BASE_URL}/provider_pecos`, {
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
  }

  return upserted;
}

// ── Download helper ──────────────────────────────────────────────

/**
 * Download a CSV file from CMS using curl.
 */
export function downloadCmsFile(
  url: string,
  destPath: string,
  label: string,
): void {
  console.log(`[PECOS] Downloading ${label}...`);
  const { execSync } = require('child_process');
  execSync(`curl -sS -L -o "${destPath}" "${url}"`, {
    stdio: 'inherit',
    timeout: 300_000, // 5 minute timeout
  });

  const { statSync } = require('fs');
  const size = statSync(destPath).size;
  console.log(
    `[PECOS] Downloaded ${label}: ${(size / 1024 / 1024).toFixed(1)} MB`,
  );
}

// Export URLs for use in the sync script
export const PECOS_URLS = {
  baseEnrollment: PECOS_BASE_ENROLLMENT_URL,
  reassignment: PECOS_REASSIGNMENT_URL,
};
