/**
 * TMB ORSSP Physician Fixed-Width File Parser
 * Layout source: http://orssp.tmb.state.tx.us/layouts/PHY_layout.pdf
 * Record length: 508 characters per line
 *
 * Usage:
 *   npx ts-node tmb-parser.ts ./PHY_20260101.txt
 *   or import parseTMBFile() into your ingest pipeline
 */

// ── FIELD LAYOUT (1-indexed positions from PDF, converted to 0-indexed) ─────

const FIELDS = [
  { name: 'id',           start:   0, end:   7, desc: 'Unique ID Number' },
  { name: 'lic',          start:   7, end:  16, desc: 'Physician License Number' },
  // filler: positions 16-21 (5 chars) — skip
  { name: 'last_name',    start:  21, end:  46, desc: 'Last Name' },
  { name: 'first_name',   start:  46, end:  68, desc: 'First Name' },
  { name: 'suffix',       start:  68, end:  71, desc: 'Suffix (MD, DO, etc.)' },
  { name: 'mail_addr1',   start:  71, end: 101, desc: 'Mailing Address Line 1' },
  { name: 'mail_addr2',   start: 101, end: 131, desc: 'Mailing Address Line 2' },
  { name: 'mail_city',    start: 131, end: 151, desc: 'Mailing City' },
  { name: 'mail_state',   start: 151, end: 153, desc: 'Mailing State' },
  { name: 'mail_zip',     start: 153, end: 163, desc: 'Mailing Zip Code' },
  { name: 'prac_addr1',   start: 163, end: 193, desc: 'Practice Address Line 1' },
  { name: 'prac_addr2',   start: 193, end: 223, desc: 'Practice Address Line 2' },
  { name: 'prac_city',    start: 223, end: 243, desc: 'Practice City' },
  { name: 'prac_state',   start: 243, end: 245, desc: 'Practice State' },
  { name: 'prac_zip',     start: 245, end: 255, desc: 'Practice Zip Code' },
  { name: 'year_of_birth',start: 255, end: 263, desc: 'Year of Birth (YYYY)' },
  { name: 'birthplace',   start: 263, end: 293, desc: 'Birthplace' },
  { name: 'specialty1',   start: 293, end: 323, desc: 'Primary Specialty' },
  { name: 'specialty2',   start: 323, end: 353, desc: 'Secondary Specialty' },
  { name: 'med_school',   start: 353, end: 420, desc: 'Medical School' },
  { name: 'grad_year',    start: 420, end: 424, desc: 'Medical School Grad Year (YYYY)' },
  { name: 'degree',       start: 424, end: 426, desc: 'Medical School Degree' },
  { name: 'lic_issue_dt', start: 426, end: 434, desc: 'License Issuance Date (MMDDYYYY)' },
  { name: 'method_lic',   start: 434, end: 435, desc: 'Method of Licensure Code' },
  { name: 'reciprocity',  start: 435, end: 465, desc: 'Reciprocity State/Country' },
  { name: 'lic_exp_dt',   start: 465, end: 473, desc: 'License Expiration Date (MMDDYYYY)' },
  { name: 'practice_type',start: 473, end: 475, desc: 'Practice Type Code' },
  { name: 'prac_setting', start: 475, end: 477, desc: 'Practice Setting Code' },
  { name: 'prac_time',    start: 477, end: 479, desc: 'Practice Time Code' },
  { name: 'reg_status',   start: 479, end: 482, desc: 'Registration Status Code' },
  { name: 'reg_status_dt',start: 482, end: 490, desc: 'Registration Status Date (MMDDYYYY)' },
  { name: 'county',       start: 490, end: 503, desc: 'County Name' },
  { name: 'gender',       start: 503, end: 504, desc: 'Gender Code' },
  { name: 'race',         start: 504, end: 507, desc: 'Race Code' },
  { name: 'hispanic',     start: 507, end: 508, desc: 'Hispanic Origin' },
] as const;

// ── LOOKUP TABLES (from PDF disclaimer section) ───────────────────────────────

const REGISTRATION_STATUS: Record<string, string> = {
  'AC':  'Active',
  'ACN': 'Active Not Practicing',
  'AE':  'Applied for Relicensure',
  'ALR': 'Administrative — License Rescinded',
  'AM':  'Administrative Medicine Only',
  'BC':  'Bad Credit',
  'CC':  'Cancelled — Superseded by New License',
  'CN':  'Considered Canceled',
  'CNB': 'Cancelled Non Payment by Board',
  'CNS': 'Cancelled Non Payment',
  'CP':  'Complete, Pending Reinstatement',
  'CR':  'Cancelled by Request',
  'CRB': 'Cancelled by Request by Board',
  'CTL': 'CME Temporary License',
  'DC':  'Deceased',
  'DQ':  'Delinquent Non Payment',
  'IA':  'Inactive — Unable to Practice',
  'LD':  'License Issued Due to Admin Error',
  'LI':  'License Issued',
  'LS':  'License Superseded — Other License Issued',
  'NA':  'Not Active',
  'NR':  'Non Standard Retired Affidavit Exam',
  'PPD': 'Payment Processing Delay',
  'PR':  'Inactive Prelim to Becoming CR',
  'SBA': 'Suspended by the Board — Active',
  'TI':  'Texas License Issued',
  'TR':  'Texas Retired',
  'TRE': 'Texas Retired — Emeritus',
  'UTP': 'Unable to Practice',
  'VC':  'Voluntary Charity Care Only',
};

const PRACTICE_TYPE: Record<string, string> = {
  '0': 'Direct Medical Care',
  '1': 'Medical Teaching or Medical School Facility',
  '2': 'Resident/Fellow',
  '3': 'Administrative Medicine',
  '4': 'Research',
  '5': 'Not in Practice',
  '6': 'Did Not Answer',
};

const PRACTICE_SETTING: Record<string, string> = {
  'E':  'Direct Patient Care',
  'R':  'Research',
  'L':  'Medical School Faculty',
  'C':  'PHS',
  'M':  'Military',
  'VA': 'VA',
  'HMO':'HMO',
  'H':  'Hospital Based',
};

const PRACTICE_TIME: Record<string, string> = {
  '1': '40+ Hours per Week',
  '2': '20-39 Hours per Week',
  '3': '11-19 Hours per Week',
  '4': '1-10 Hours per Week',
  '5': 'Not Applicable',
  '6': 'Did Not Answer',
};

const METHOD_LICENSURE: Record<string, string> = {
  'M': 'Examination',
  'R': 'Reciprocity',
  'L': 'Licensure',
  'C': 'Compact',
};

const GENDER: Record<string, string> = {
  'M': 'Male',
  'F': 'Female',
};

// ── TYPES ──────────────────────────────────────────────────────────────────────

export interface TMBPhysician {
  // raw fields
  id:             string;
  lic:            string;
  last_name:      string;
  first_name:     string;
  suffix:         string;
  mail_addr1:     string;
  mail_addr2:     string;
  mail_city:      string;
  mail_state:     string;
  mail_zip:       string;
  prac_addr1:     string;
  prac_addr2:     string;
  prac_city:      string;
  prac_state:     string;
  prac_zip:       string;
  year_of_birth:  string;
  birthplace:     string;
  specialty1:     string;
  specialty2:     string;
  med_school:     string;
  grad_year:      string;
  degree:         string;
  lic_issue_dt:   string;
  method_lic:     string;
  reciprocity:    string;
  lic_exp_dt:     string;
  practice_type:  string;
  prac_setting:   string;
  prac_time:      string;
  reg_status:     string;
  reg_status_dt:  string;
  county:         string;
  gender:         string;
  race:           string;
  hispanic:       string;

  // derived/decoded fields
  full_name:           string;
  prac_address_full:   string;
  mail_address_full:   string;
  reg_status_label:    string;
  practice_type_label: string;
  prac_setting_label:  string;
  prac_time_label:     string;
  method_lic_label:    string;
  gender_label:        string;
  lic_issue_date:      Date | null;
  lic_exp_date:        Date | null;
  reg_status_date:     Date | null;
  is_active:           boolean;
  is_texas_practice:   boolean;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function trim(s: string): string {
  return s.trim();
}

/** Parse MMDDYYYY → Date or null */
function parseMMDDYYYY(s: string): Date | null {
  const clean = s.trim();
  if (!clean || clean.length !== 8 || clean === '00000000') return null;
  const mm = parseInt(clean.slice(0, 2), 10);
  const dd = parseInt(clean.slice(2, 4), 10);
  const yyyy = parseInt(clean.slice(4, 8), 10);
  if (isNaN(mm) || isNaN(dd) || isNaN(yyyy)) return null;
  return new Date(yyyy, mm - 1, dd);
}

/** Build a single-line address string from parts */
function buildAddress(a1: string, a2: string, city: string, state: string, zip: string): string {
  const parts = [a1, a2].map(trim).filter(Boolean);
  const line1 = parts.join(', ');
  const line2 = [city, state].map(trim).filter(Boolean).join(', ');
  const full = [line1, line2, trim(zip)].filter(Boolean).join(', ');
  return full;
}

const ACTIVE_STATUSES = new Set(['AC', 'ACN', 'AM', 'LI', 'TI', 'VC']);

// ── CORE PARSER ───────────────────────────────────────────────────────────────

export function parseRecord(line: string): TMBPhysician | null {
  // Record must be exactly 508 chars. Pad if short (some files omit trailing spaces).
  if (line.length < 7) return null; // not a data line
  const rec = line.padEnd(508, ' ');

  const raw: Record<string, string> = {};
  for (const field of FIELDS) {
    raw[field.name] = rec.slice(field.start, field.end);
  }

  const regStatus    = trim(raw.reg_status);
  const practiceType = trim(raw.practice_type);
  const pracSetting  = trim(raw.prac_setting);
  const pracTime     = trim(raw.prac_time);
  const methodLic    = trim(raw.method_lic);
  const genderCode   = trim(raw.gender);

  const physician: TMBPhysician = {
    // raw
    id:             trim(raw.id),
    lic:            trim(raw.lic),
    last_name:      trim(raw.last_name),
    first_name:     trim(raw.first_name),
    suffix:         trim(raw.suffix),
    mail_addr1:     trim(raw.mail_addr1),
    mail_addr2:     trim(raw.mail_addr2),
    mail_city:      trim(raw.mail_city),
    mail_state:     trim(raw.mail_state),
    mail_zip:       trim(raw.mail_zip),
    prac_addr1:     trim(raw.prac_addr1),
    prac_addr2:     trim(raw.prac_addr2),
    prac_city:      trim(raw.prac_city),
    prac_state:     trim(raw.prac_state),
    prac_zip:       trim(raw.prac_zip),
    year_of_birth:  trim(raw.year_of_birth),
    birthplace:     trim(raw.birthplace),
    specialty1:     trim(raw.specialty1),
    specialty2:     trim(raw.specialty2),
    med_school:     trim(raw.med_school),
    grad_year:      trim(raw.grad_year),
    degree:         trim(raw.degree),
    lic_issue_dt:   trim(raw.lic_issue_dt),
    method_lic:     methodLic,
    reciprocity:    trim(raw.reciprocity),
    lic_exp_dt:     trim(raw.lic_exp_dt),
    practice_type:  practiceType,
    prac_setting:   pracSetting,
    prac_time:      pracTime,
    reg_status:     regStatus,
    reg_status_dt:  trim(raw.reg_status_dt),
    county:         trim(raw.county),
    gender:         genderCode,
    race:           trim(raw.race),
    hispanic:       trim(raw.hispanic),

    // derived
    full_name:           [trim(raw.first_name), trim(raw.last_name), trim(raw.suffix)]
                           .filter(Boolean).join(' '),
    prac_address_full:   buildAddress(
                           raw.prac_addr1, raw.prac_addr2,
                           raw.prac_city,  raw.prac_state, raw.prac_zip
                         ),
    mail_address_full:   buildAddress(
                           raw.mail_addr1, raw.mail_addr2,
                           raw.mail_city,  raw.mail_state, raw.mail_zip
                         ),
    reg_status_label:    REGISTRATION_STATUS[regStatus]    ?? regStatus,
    practice_type_label: PRACTICE_TYPE[practiceType]       ?? practiceType,
    prac_setting_label:  PRACTICE_SETTING[pracSetting]     ?? pracSetting,
    prac_time_label:     PRACTICE_TIME[pracTime]           ?? pracTime,
    method_lic_label:    METHOD_LICENSURE[methodLic]       ?? methodLic,
    gender_label:        GENDER[genderCode]                ?? genderCode,
    lic_issue_date:      parseMMDDYYYY(raw.lic_issue_dt),
    lic_exp_date:        parseMMDDYYYY(raw.lic_exp_dt),
    reg_status_date:     parseMMDDYYYY(raw.reg_status_dt),
    is_active:           ACTIVE_STATUSES.has(regStatus),
    is_texas_practice:   trim(raw.prac_state).toUpperCase() === 'TX',
  };

  return physician;
}

// ── FILE PARSER ───────────────────────────────────────────────────────────────

import fs   from 'fs';
import path from 'path';
import readline from 'readline';

export async function parseTMBFile(filePath: string): Promise<{
  records:  TMBPhysician[];
  total:    number;
  active:   number;
  errors:   number;
  skipped:  number;
}> {
  const records: TMBPhysician[] = [];
  let total   = 0;
  let errors  = 0;
  let skipped = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(path.resolve(filePath)),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Skip blank lines and any header rows (TMB files sometimes have a short header)
    if (!line.trim() || line.length < 7) {
      skipped++;
      continue;
    }

    total++;
    try {
      const record = parseRecord(line);
      if (record) {
        records.push(record);
      } else {
        skipped++;
      }
    } catch (e) {
      errors++;
      console.error(`Parse error on line ${total}: ${e}`);
    }
  }

  const active = records.filter(r => r.is_active).length;

  return { records, total, active, errors, skipped };
}

// ── SUPABASE UPSERT MAPPER ────────────────────────────────────────────────────
// Maps parsed physician records to the provider_licenses table schema
// defined in sprint1_full_migration.sql.
//
// UNIQUE constraint: (license_number, state) — upserts on this key.

export function toProviderLicenseRow(p: TMBPhysician, downloadedAt: Date) {
  // Determine if any disciplinary-adjacent status
  const DISCIPLINARY_STATUSES = new Set([
    'SBA', 'ALR', 'IA', 'UTP', 'CNB', 'CRB',
  ]);
  const hasDisciplinary = DISCIPLINARY_STATUSES.has(p.reg_status);

  return {
    // NPI left null — resolved via PECOS bridge (NPI resolution engine, Task 1.6)
    npi:                    null as string | null,
    license_number:         p.lic,
    state:                  'TX',                                 // issuing state
    board_name:             'Texas Medical Board',

    // Identity
    licensee_name:          p.full_name,
    license_type:           p.degree || (p.suffix === 'DO' ? 'DO' : 'MD'),
    license_status:         p.reg_status_label,
    specialty:              p.specialty1,

    // Practice address (legally enforced, highest-signal source)
    address_line_1:         p.prac_addr1 || null,
    address_line_2:         p.prac_addr2 || null,
    city:                   p.prac_city || null,
    license_state:          p.prac_state || 'TX',                 // address state
    zip_code:               p.prac_zip || null,

    // Dates
    issue_date:             p.lic_issue_date?.toISOString().split('T')[0] ?? null,
    expiration_date:        p.lic_exp_date?.toISOString().split('T')[0] ?? null,
    last_renewal:           null as string | null,                 // not in TMB ORSSP layout

    // Disciplinary
    has_disciplinary_action: hasDisciplinary,
    disciplinary_details:   hasDisciplinary
      ? `Status: ${p.reg_status_label} (${p.reg_status}) as of ${p.reg_status_date?.toISOString()?.split('T')[0] ?? 'unknown'}`
      : null,

    // Sync metadata
    source:                 'tmb_orssp',
    source_updated_at:      p.reg_status_date?.toISOString() ?? null,
    last_synced_at:         downloadedAt.toISOString(),
  };
}

/**
 * Batch upsert TMB records into provider_licenses via Supabase REST API.
 * Uses ON CONFLICT (license_number, state) to merge duplicates.
 */
export async function upsertTmbRecords(
  rows: ReturnType<typeof toProviderLicenseRow>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/provider_licenses`, {
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
        `TMB upsert failed (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${response.status} ${errorText}`,
      );
    }

    upserted += batch.length;
  }

  return upserted;
}

// ── CLI ENTRYPOINT ────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node tmb-parser.ts <path-to-tmb-file.txt>');
    process.exit(1);
  }

  console.log(`\nParsing TMB ORSSP file: ${filePath}\n`);
  const result = await parseTMBFile(filePath);

  console.log('─'.repeat(48));
  console.log(`Total lines processed : ${result.total}`);
  console.log(`Records parsed        : ${result.records.length}`);
  console.log(`Active licenses       : ${result.active}`);
  console.log(`Skipped (blank/header): ${result.skipped}`);
  console.log(`Parse errors          : ${result.errors}`);
  console.log('─'.repeat(48));

  // Sample: print first 3 records
  if (result.records.length > 0) {
    console.log('\nSample records:\n');
    result.records.slice(0, 3).forEach((r, i) => {
      console.log(`[${i + 1}] ${r.full_name}`);
      console.log(`    License  : ${r.lic}`);
      console.log(`    Status   : ${r.reg_status_label} (${r.reg_status})`);
      console.log(`    Specialty: ${r.specialty1}`);
      console.log(`    Practice : ${r.prac_address_full}`);
      console.log(`    Active   : ${r.is_active}`);
      console.log(`    TX prac  : ${r.is_texas_practice}`);
      console.log();
    });
  }
}

main().catch(console.error);
