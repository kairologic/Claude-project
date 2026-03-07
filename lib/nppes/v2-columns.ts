// lib/nppes/v2-columns.ts
// ═══ NPPES V.2 Column Definitions ═══
// Effective March 3, 2026 — V.1 no longer supported by CMS.
// V.2 key changes: First Name extended to 50 chars, Legal Business Name to 150 chars.
//
// Full NPPES CSV has ~330 columns. We extract only the fields relevant to
// the providers table and provider_nppes_snapshots.

/**
 * Column indexes (0-based) for the fields we extract from NPPES V.2 CSV.
 * These are stable across the V.2 full replacement and weekly diff files.
 *
 * Reference: NPPES Data Dissemination File Layout (V.2)
 * https://download.cms.gov/nppes/NPI_Files.html
 */
export const NPPES_V2_COLUMNS = {
  NPI:                            0,
  ENTITY_TYPE_CODE:               1,   // 1 = Individual, 2 = Organization
  REPLACEMENT_NPI:                2,
  EIN:                            3,

  // Organization name (V.2: extended to 150 chars)
  ORGANIZATION_NAME:              4,
  ORGANIZATION_NAME_OTHER:        5,

  // Individual name (V.2: First Name extended to 50 chars)
  LAST_NAME:                      6,
  FIRST_NAME:                     7,
  MIDDLE_NAME:                    8,
  NAME_PREFIX:                    9,
  NAME_SUFFIX:                    10,
  CREDENTIAL:                     11,

  // Mailing address (less useful for our purposes)
  MAIL_ADDRESS_1:                 20,
  MAIL_ADDRESS_2:                 21,
  MAIL_CITY:                      22,
  MAIL_STATE:                     23,
  MAIL_ZIP:                       24,
  MAIL_COUNTRY:                   25,
  MAIL_PHONE:                     26,
  MAIL_FAX:                       27,

  // Practice location address (PRIMARY for mismatch detection)
  PRAC_ADDRESS_1:                 28,
  PRAC_ADDRESS_2:                 29,
  PRAC_CITY:                      30,
  PRAC_STATE:                     31,
  PRAC_ZIP:                       32,
  PRAC_COUNTRY:                   33,
  PRAC_PHONE:                     34,
  PRAC_FAX:                       35,

  // Enumeration date
  ENUMERATION_DATE:               36,
  LAST_UPDATE_DATE:               37,

  // Deactivation / reactivation
  NPI_DEACTIVATION_REASON:        38,
  NPI_DEACTIVATION_DATE:          39,
  NPI_REACTIVATION_DATE:          40,

  // Gender
  GENDER:                         41,

  // Authorized Official
  AUTH_OFFICIAL_LAST_NAME:        42,
  AUTH_OFFICIAL_FIRST_NAME:       43,
  AUTH_OFFICIAL_MIDDLE_NAME:      44,
  AUTH_OFFICIAL_TITLE:            45,
  AUTH_OFFICIAL_PHONE:            46,

  // Taxonomy (primary is the first one — index 47)
  TAXONOMY_CODE_1:                47,
  PRIMARY_TAXONOMY_SWITCH_1:      48,
  LICENSE_NUMBER_1:               49,
  LICENSE_STATE_1:                50,

  // There are 15 taxonomy slots (47-91), we only need the primary
  // The primary is whichever has PRIMARY_TAXONOMY_SWITCH = 'Y'

  // Sole proprietor
  SOLE_PROPRIETOR:                307,

  // Taxonomy group (V.2 addition area)
  // Columns 308+ contain taxonomy group fields
} as const;

/**
 * Fields we extract and how they map to our database tables.
 * Two targets: `providers` table and `provider_nppes_snapshots`.
 */
export interface NppesRecord {
  npi: string;
  entity_type_code: string;           // '1' or '2'
  organization_name: string | null;
  first_name: string | null;
  last_name: string | null;
  credential: string | null;
  address_line_1: string | null;      // practice location
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country_code: string | null;
  phone: string | null;               // practice phone
  fax: string | null;
  primary_taxonomy_code: string | null;
  taxonomy_desc: string | null;       // resolved from taxonomy lookup
  gender: string | null;
  sole_proprietor: string | null;
  enumeration_date: string | null;
  last_nppes_update_date: string | null;
  deactivation_date: string | null;
  reactivation_date: string | null;
}

/**
 * Parse a single CSV row (array of field values) into an NppesRecord.
 * Handles V.2 extended field lengths natively — no truncation needed
 * since our DB columns are TEXT (unbounded).
 */
export function parseNppesRow(fields: string[]): NppesRecord | null {
  const npi = cleanField(fields[NPPES_V2_COLUMNS.NPI]);
  if (!npi || npi.length !== 10) return null; // skip invalid NPIs

  const entityType = cleanField(fields[NPPES_V2_COLUMNS.ENTITY_TYPE_CODE]);
  if (!entityType) return null;

  // Find primary taxonomy: scan all 15 taxonomy slots for PRIMARY_TAXONOMY_SWITCH = 'Y'
  let primaryTaxonomy: string | null = null;
  for (let i = 0; i < 15; i++) {
    const switchIdx = NPPES_V2_COLUMNS.PRIMARY_TAXONOMY_SWITCH_1 + (i * 4);
    const codeIdx = NPPES_V2_COLUMNS.TAXONOMY_CODE_1 + (i * 4);
    if (fields[switchIdx]?.trim().toUpperCase() === 'Y') {
      primaryTaxonomy = cleanField(fields[codeIdx]);
      break;
    }
  }
  // Fallback to first taxonomy if no primary switch found
  if (!primaryTaxonomy) {
    primaryTaxonomy = cleanField(fields[NPPES_V2_COLUMNS.TAXONOMY_CODE_1]);
  }

  return {
    npi,
    entity_type_code: entityType,
    organization_name: cleanField(fields[NPPES_V2_COLUMNS.ORGANIZATION_NAME]),
    first_name: cleanField(fields[NPPES_V2_COLUMNS.FIRST_NAME]),
    last_name: cleanField(fields[NPPES_V2_COLUMNS.LAST_NAME]),
    credential: cleanField(fields[NPPES_V2_COLUMNS.CREDENTIAL]),
    address_line_1: cleanField(fields[NPPES_V2_COLUMNS.PRAC_ADDRESS_1]),
    address_line_2: cleanField(fields[NPPES_V2_COLUMNS.PRAC_ADDRESS_2]),
    city: cleanField(fields[NPPES_V2_COLUMNS.PRAC_CITY]),
    state: cleanField(fields[NPPES_V2_COLUMNS.PRAC_STATE]),
    zip_code: cleanZip(fields[NPPES_V2_COLUMNS.PRAC_ZIP]),
    country_code: cleanField(fields[NPPES_V2_COLUMNS.PRAC_COUNTRY]) || 'US',
    phone: cleanPhone(fields[NPPES_V2_COLUMNS.PRAC_PHONE]),
    fax: cleanPhone(fields[NPPES_V2_COLUMNS.PRAC_FAX]),
    primary_taxonomy_code: primaryTaxonomy,
    taxonomy_desc: null, // resolved separately via target_taxonomies join
    gender: cleanField(fields[NPPES_V2_COLUMNS.GENDER]),
    sole_proprietor: cleanField(fields[NPPES_V2_COLUMNS.SOLE_PROPRIETOR]),
    enumeration_date: cleanDate(fields[NPPES_V2_COLUMNS.ENUMERATION_DATE]),
    last_nppes_update_date: cleanDate(fields[NPPES_V2_COLUMNS.LAST_UPDATE_DATE]),
    deactivation_date: cleanDate(fields[NPPES_V2_COLUMNS.NPI_DEACTIVATION_DATE]),
    reactivation_date: cleanDate(fields[NPPES_V2_COLUMNS.NPI_REACTIVATION_DATE]),
  };
}

// ── Field cleaning utilities ────────────────────────────────────

function cleanField(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanPhone(val: string | undefined): string | null {
  if (!val) return null;
  // Strip everything except digits
  const digits = val.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function cleanZip(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  // NPPES stores zip as 9-digit string. Keep as-is, frontend formats.
  return trimmed.length >= 5 ? trimmed : null;
}

function cleanDate(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  // NPPES dates are MM/DD/YYYY format
  if (trimmed.length < 8) return null;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return trimmed; // return as-is if already ISO
}
