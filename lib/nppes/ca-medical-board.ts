// lib/nppes/ca-medical-board.ts
// ═══ California Medical Board Bulk Ingest ═══
// Task 1.8: Weekly download of CA Medical Board license data.
//
// Data source: CA Department of Consumer Affairs (DCA)
// URL: https://data.ca.gov (open data portal) + MBC website downloads
// Format: CSV (weekly Tuesday publication)
// Auth: None. Free public data.
// NPI: NOT included in source — resolved via PECOS bridge (Task 1.6)
//
// Also supports targeted DCA API lookups for individual license resolution.
// DCA API: https://data.ca.gov/api/3/action/datastore_search
//
// Fields available: license number, name, status, address, specialty,
// issue date, expiration date, school, actions.

import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// ── Types ────────────────────────────────────────────────

export interface CaMbRecord {
  license_number: string;
  license_type: string;           // 'MD' or 'DO' (physician vs osteopath)
  licensee_name: string;
  first_name: string | null;
  last_name: string | null;
  license_status: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  specialty: string | null;
  secondary_specialty: string | null;
  school: string | null;
  issue_date: string | null;      // ISO date
  expiration_date: string | null; // ISO date
  has_disciplinary_action: boolean;
  disciplinary_details: string | null;
}

export interface CaMbParseResult {
  records: CaMbRecord[];
  total_lines: number;
  matched: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

// ── CA License Status Codes ──────────────────────────────

const CA_LICENSE_STATUSES: Record<string, string> = {
  'A':       'Current/Active',
  'C':       'Current/Active',
  'CURRENT': 'Current/Active',
  'D':       'Delinquent',
  'DELINQUENT': 'Delinquent',
  'R':       'Revoked',
  'REVOKED': 'Revoked',
  'S':       'Suspended',
  'SUSPENDED': 'Suspended',
  'V':       'Voluntary Surrender',
  'SURRENDER': 'Voluntary Surrender',
  'I':       'Inactive',
  'INACTIVE': 'Inactive',
  'CANCELLED': 'Cancelled',
  'DECEASED': 'Deceased',
  'RETIRED': 'Retired',
};

const ACTIVE_STATUSES = new Set(['A', 'C', 'CURRENT', 'Current/Active']);

// ── CSV Parser (header-based) ────────────────────────────

function parseCSVLine(line: string): string[] {
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
      if (char === '"') { inQuotes = true; i++; }
      else if (char === ',') { fields.push(current); current = ''; i++; }
      else { current += char; i++; }
    }
  }
  fields.push(current);
  return fields;
}

// ── Column Mapping ───────────────────────────────────────
// CA MBC CSV headers vary slightly by download source.
// We map common header names to our fields.

const HEADER_MAP: Record<string, string> = {
  // License identifiers
  'license_number': 'license_number',
  'license_no': 'license_number',
  'lic_no': 'license_number',
  'license number': 'license_number',
  'license #': 'license_number',

  // License type
  'license_type': 'license_type',
  'lic_type': 'license_type',
  'type': 'license_type',

  // Names
  'name': 'full_name',
  'licensee_name': 'full_name',
  'full_name': 'full_name',
  'last_name': 'last_name',
  'first_name': 'first_name',

  // Status
  'status': 'status',
  'license_status': 'status',
  'lic_status': 'status',

  // Address
  'address': 'address',
  'street_address': 'address',
  'address_line_1': 'address',
  'city': 'city',
  'state': 'state',
  'zip': 'zip_code',
  'zip_code': 'zip_code',
  'postal_code': 'zip_code',

  // Specialty
  'specialty': 'specialty',
  'primary_specialty': 'specialty',
  'secondary_specialty': 'secondary_specialty',

  // School
  'school': 'school',
  'medical_school': 'school',

  // Dates
  'issue_date': 'issue_date',
  'original_issue_date': 'issue_date',
  'expiration_date': 'expiration_date',
  'exp_date': 'expiration_date',

  // Disciplinary
  'actions': 'actions',
  'disciplinary_action': 'actions',
  'enforcement_action': 'actions',
};

/**
 * Parse a CA Medical Board CSV file.
 * Handles varying header formats from different download sources.
 */
export async function parseCaMbFile(
  filePath: string,
  options: {
    activeOnly?: boolean;
    limit?: number;
    onProgress?: (processed: number, matched: number) => void;
  } = {},
): Promise<CaMbParseResult> {
  const startTime = Date.now();
  const { activeOnly = false, limit = 0, onProgress } = options;

  const records: CaMbRecord[] = [];
  let headers: string[] = [];
  let headerMap: Record<string, number> = {};
  let isHeader = true;
  let totalLines = 0;
  let matched = 0;
  let skipped = 0;
  let errors = 0;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (isHeader) {
      headers = parseCSVLine(line).map(h => h.trim().toLowerCase());

      // Build column index map using HEADER_MAP
      for (let i = 0; i < headers.length; i++) {
        const normalized = headers[i].replace(/[^a-z0-9_\s#]/g, '').trim();
        const mapped = HEADER_MAP[normalized];
        if (mapped) headerMap[mapped] = i;
      }

      isHeader = false;
      continue;
    }

    totalLines++;
    if (limit > 0 && matched >= limit) break;

    try {
      const fields = parseCSVLine(line);
      const record = mapCaMbRecord(fields, headerMap);

      if (!record) {
        skipped++;
        continue;
      }

      if (activeOnly && !isActiveStatus(record.license_status)) {
        skipped++;
        continue;
      }

      records.push(record);
      matched++;
    } catch {
      errors++;
    }

    if (onProgress && totalLines % 10000 === 0) {
      onProgress(totalLines, matched);
    }
  }

  return {
    records,
    total_lines: totalLines,
    matched,
    skipped,
    errors,
    duration_ms: Date.now() - startTime,
  };
}

function mapCaMbRecord(
  fields: string[],
  headerMap: Record<string, number>,
): CaMbRecord | null {
  const get = (key: string): string =>
    headerMap[key] !== undefined ? (fields[headerMap[key]] || '').trim() : '';

  const licenseNumber = get('license_number');
  if (!licenseNumber) return null;

  // Parse name
  const fullName = get('full_name');
  let firstName = get('first_name') || null;
  let lastName = get('last_name') || null;

  if (!firstName && !lastName && fullName) {
    // Parse "Last, First" or "First Last" format
    if (fullName.includes(',')) {
      const parts = fullName.split(',');
      lastName = parts[0].trim();
      firstName = parts[1]?.trim().split(/\s+/)[0] || null;
    } else {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || null;
      lastName = parts[parts.length - 1] || null;
    }
  }

  const licenseName = fullName || [firstName, lastName].filter(Boolean).join(' ') || licenseNumber;

  // Parse status
  const rawStatus = get('status');
  const status = CA_LICENSE_STATUSES[rawStatus.toUpperCase()] || rawStatus || 'Unknown';

  // Parse disciplinary
  const actions = get('actions');
  const hasDisciplinary = !!actions && actions.toLowerCase() !== 'none' && actions.length > 2;

  // Parse dates
  const issueDate = parseFlexibleDate(get('issue_date'));
  const expDate = parseFlexibleDate(get('expiration_date'));

  return {
    license_number: licenseNumber,
    license_type: get('license_type') || 'MD',
    licensee_name: licenseName,
    first_name: firstName,
    last_name: lastName,
    license_status: status,
    address_line_1: get('address') || null,
    city: get('city') || null,
    state: get('state') || 'CA',
    zip_code: get('zip_code') || null,
    specialty: get('specialty') || null,
    secondary_specialty: get('secondary_specialty') || null,
    school: get('school') || null,
    issue_date: issueDate,
    expiration_date: expDate,
    has_disciplinary_action: hasDisciplinary,
    disciplinary_details: hasDisciplinary ? actions : null,
  };
}

function isActiveStatus(status: string): boolean {
  const upper = status.toUpperCase();
  return upper.includes('CURRENT') || upper.includes('ACTIVE') || ACTIVE_STATUSES.has(upper);
}

function parseFlexibleDate(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  // MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;

  // YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  return null;
}

// ── Supabase Upsert ──────────────────────────────────────

/**
 * Map a parsed CA MB record to the provider_licenses table schema.
 */
export function toProviderLicenseRow(r: CaMbRecord, syncedAt: Date) {
  return {
    npi: null as string | null,     // resolved via PECOS bridge
    license_number: r.license_number,
    state: 'CA',                     // issuing state
    board_name: 'California Medical Board',
    licensee_name: r.licensee_name,
    license_type: r.license_type,
    license_status: r.license_status,
    specialty: r.specialty,
    address_line_1: r.address_line_1,
    address_line_2: null as string | null,
    city: r.city,
    license_state: r.state || 'CA',
    zip_code: r.zip_code,
    issue_date: r.issue_date,
    expiration_date: r.expiration_date,
    last_renewal: null as string | null,
    has_disciplinary_action: r.has_disciplinary_action,
    disciplinary_details: r.disciplinary_details,
    source: 'ca_mb_bulk',
    source_updated_at: null as string | null,
    last_synced_at: syncedAt.toISOString(),
  };
}

/**
 * Batch upsert CA MB records into provider_licenses.
 * Uses ON CONFLICT (license_number, state) to merge duplicates.
 */
export async function upsertCaMbRecords(
  rows: ReturnType<typeof toProviderLicenseRow>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/provider_licenses`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`CA MB upsert failed (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${response.status} ${err}`);
    }

    upserted += batch.length;
  }

  return upserted;
}

// ── DCA API Lookup (targeted, for ambiguous matches) ─────

/**
 * Query the CA DCA API for a specific license number.
 * Returns NPI when provider has supplied it to the board.
 * Used as a tertiary resolution method for ambiguous PECOS matches.
 *
 * API: https://data.ca.gov/api/3/action/datastore_search
 * No auth required. Rate limit: be respectful (~1 req/sec).
 */
export async function dcaApiLookup(
  licenseNumber: string,
): Promise<{ npi: string | null; name: string | null; status: string | null } | null> {
  try {
    // The DCA license search resource ID may change;
    // this is the medical board physicians dataset
    const url = `https://data.ca.gov/api/3/action/datastore_search?resource_id=_RESOURCE_ID_&filters={"LICENSE_NUMBER":"${encodeURIComponent(licenseNumber)}"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const records = data?.result?.records;

    if (!records || records.length === 0) return null;

    const record = records[0];
    return {
      npi: record.NPI || record.npi || null,
      name: record.NAME || record.FULL_NAME || null,
      status: record.STATUS || record.LICENSE_STATUS || null,
    };
  } catch {
    return null;
  }
}
