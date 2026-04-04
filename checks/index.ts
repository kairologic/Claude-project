// checks/index.ts
// ═══ KairoLogic Check Engine v2 — Barrel Export ═══

// Types
export type {
  CheckModule,
  CheckContext,
  CheckResult,
  CheckResultWithId,
  NpiOrgRecord,
  NpiProviderRecord,
  SiteSnapshot,
  ScanSession,
} from './types';

// Registry
export {
  CHECK_REGISTRY,
  getChecksForTier,
  getChecksByCategory,
  getCheckById,
  CATEGORY_META,
} from './registry';

// Check Modules
export { npiAddressCheck, npiPhoneCheck, npiTaxonomyCheck } from './npi-checks';
export { rosterCountCheck, rosterNameCheck } from './roster-checks';

// Engine
export { runScan } from './engine';

// Fetchers
export {
  fetchNpiOrg,
  fetchNpiFromNppes,
  fetchNpiOrgBest,
  fetchNpiProvidersByGeo,
} from './fetchers';

// Utilities
export {
  normalizeAddress,
  addressesMatch,
  normalizePhone,
  phonesMatch,
  normalizeName,
  fuzzyNameMatch,
  specialtyMatches,
  levenshtein,
} from './utils';
