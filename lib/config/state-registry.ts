/**
 * lib/config/state-registry.ts
 *
 * Centralized State Configuration Registry.
 *
 * Single source of truth for all state-specific configuration:
 * - License board integrations (parser type, portal URLs, status codes)
 * - PECOS sync coverage
 * - Compliance statutes and scoring weights
 * - Payer directory scope
 * - Monitoring capabilities
 *
 * Add new states here rather than scattering config across parsers/engines.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LicenseBoardConfig {
  name: string;
  abbreviation: string;
  portalUrl: string;
  parserType: 'fixed_width' | 'csv' | 'api' | 'none';
  /** Module path relative to lib/ for the board parser */
  parserModule: string | null;
  /** License status codes → normalized status */
  statusCodes: Record<string, LicenseStatus>;
  renewalMonitoring: boolean;
  newsroomMonitoring: boolean;
}

export type LicenseStatus =
  | 'active'
  | 'active_restricted'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'retired'
  | 'deceased'
  | 'cancelled'
  | 'inactive'
  | 'unknown';

export interface ComplianceStatute {
  code: string;
  name: string;
  /** Scoring weight added when this statute applies */
  baseWeight: number;
  /** Additional weight per mismatch above threshold */
  mismatchWeight: number;
  /** Mismatch count threshold that triggers additional weight */
  mismatchThreshold: number;
  description: string;
}

export interface PayerScope {
  payerCode: string;
  payerName: string;
  /** Whether this payer is state-specific (vs national) */
  stateSpecific: boolean;
}

export interface StateConfig {
  code: string;
  name: string;
  /** Whether PECOS monthly sync is active for this state */
  pecosSync: boolean;
  licenseBoard: LicenseBoardConfig;
  complianceStatutes: ComplianceStatute[];
  /** State-specific payers (BCBS affiliates, regional plans) */
  statePayers: PayerScope[];
  /** Whether real-time board monitoring is operational */
  monitoringActive: boolean;
}

// ─── Texas Configuration ─────────────────────────────────────────────────────

const TEXAS_LICENSE_STATUSES: Record<string, LicenseStatus> = {
  AC:  'active',
  ACN: 'active',
  AE:  'active',
  ALR: 'active_restricted',
  CAN: 'cancelled',
  DEC: 'deceased',
  EXP: 'expired',
  INV: 'active_restricted',
  NRN: 'expired',
  RET: 'retired',
  REV: 'revoked',
  SUS: 'suspended',
  VOL: 'inactive',
};

const TEXAS: StateConfig = {
  code: 'TX',
  name: 'Texas',
  pecosSync: true,
  licenseBoard: {
    name: 'Texas Medical Board',
    abbreviation: 'TMB',
    portalUrl: 'https://profile.tmb.state.tx.us/public/',
    parserType: 'fixed_width',
    parserModule: 'nppes/tmb-parser',
    statusCodes: TEXAS_LICENSE_STATUSES,
    renewalMonitoring: true,
    newsroomMonitoring: true,
  },
  complianceStatutes: [
    {
      code: 'SB 1188',
      name: 'Data Sovereignty',
      baseWeight: 8,
      mismatchWeight: 4,
      mismatchThreshold: 3,
      description: 'Texas Senate Bill 1188 — requires accurate provider data across state-regulated directories',
    },
    {
      code: 'HB 149',
      name: 'AI Transparency',
      baseWeight: 8,
      mismatchWeight: 4,
      mismatchThreshold: 3,
      description: 'Texas House Bill 149 — transparency requirements for AI-driven provider data systems',
    },
  ],
  statePayers: [
    { payerCode: 'bcbstx', payerName: 'BCBS TX', stateSpecific: true },
  ],
  monitoringActive: true,
};

// ─── California Configuration ────────────────────────────────────────────────

const CALIFORNIA_LICENSE_STATUSES: Record<string, LicenseStatus> = {
  A:         'active',
  C:         'active_restricted',
  D:         'deceased',
  R:         'retired',
  S:         'suspended',
  V:         'revoked',
  I:         'inactive',
  CANCELLED: 'cancelled',
  DECEASED:  'deceased',
  RETIRED:   'retired',
};

const CALIFORNIA: StateConfig = {
  code: 'CA',
  name: 'California',
  pecosSync: true,
  licenseBoard: {
    name: 'California Medical Board',
    abbreviation: 'CA MB',
    portalUrl: 'https://mbc.ca.gov/breeze/license_verification.aspx',
    parserType: 'csv',
    parserModule: 'nppes/ca-medical-board',
    statusCodes: CALIFORNIA_LICENSE_STATUSES,
    renewalMonitoring: true,
    newsroomMonitoring: false,
  },
  complianceStatutes: [
    {
      code: 'SB 1188',
      name: 'Data Sovereignty',
      baseWeight: 10,
      mismatchWeight: 5,
      mismatchThreshold: 2,
      description: 'California Senate Bill 1188 — data sovereignty with stricter penalties than TX',
    },
    {
      code: 'HB 149',
      name: 'AI Transparency',
      baseWeight: 10,
      mismatchWeight: 5,
      mismatchThreshold: 2,
      description: 'California AI transparency requirements',
    },
    {
      code: 'AB 3030',
      name: 'Clinical Integrity',
      baseWeight: 10,
      mismatchWeight: 5,
      mismatchThreshold: 2,
      description: 'Assembly Bill 3030 — clinical integrity protections unique to California',
    },
  ],
  statePayers: [
    { payerCode: 'blueshieldca', payerName: 'Blue Shield CA', stateSpecific: true },
  ],
  monitoringActive: false,
};

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * Master state configuration registry.
 * Add new states here as coverage expands.
 */
export const STATE_REGISTRY: Record<string, StateConfig> = {
  TX: TEXAS,
  CA: CALIFORNIA,
};

/** All state codes with active PECOS sync */
export const PECOS_SYNCED_STATES = new Set(
  Object.values(STATE_REGISTRY)
    .filter(s => s.pecosSync)
    .map(s => s.code)
);

/** All state codes with active board monitoring */
export const MONITORED_STATES = new Set(
  Object.values(STATE_REGISTRY)
    .filter(s => s.monitoringActive)
    .map(s => s.code)
);

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

/** Get state config by code. Returns undefined for unsupported states. */
export function getStateConfig(stateCode: string): StateConfig | undefined {
  return STATE_REGISTRY[stateCode.toUpperCase()];
}

/** Check if a state has PECOS sync coverage */
export function hasPecosSync(stateCode: string): boolean {
  return PECOS_SYNCED_STATES.has(stateCode.toUpperCase());
}

/** Get compliance statutes for a state */
export function getComplianceStatutes(stateCode: string): ComplianceStatute[] {
  return getStateConfig(stateCode)?.complianceStatutes ?? [];
}

/**
 * Calculate compliance score contribution for a state.
 * Used by the scoring engine to weight state-specific compliance risk.
 */
export function calculateComplianceScore(
  stateCode: string,
  mismatchCount: number,
): number {
  const statutes = getComplianceStatutes(stateCode);
  let score = 0;
  for (const statute of statutes) {
    score += statute.baseWeight;
    if (mismatchCount >= statute.mismatchThreshold) {
      score += statute.mismatchWeight;
    }
  }
  return score;
}

/**
 * Normalize a raw license status code to a standard LicenseStatus.
 * Looks up the state's license board status code mapping.
 */
export function normalizeLicenseStatus(
  stateCode: string,
  rawStatus: string,
): LicenseStatus {
  const config = getStateConfig(stateCode);
  if (!config) return 'unknown';
  return config.licenseBoard.statusCodes[rawStatus.toUpperCase()] ?? 'unknown';
}

/** Get all state-specific payer codes for a given state */
export function getStatePayers(stateCode: string): PayerScope[] {
  return getStateConfig(stateCode)?.statePayers ?? [];
}

/** List all supported state codes */
export function getSupportedStates(): string[] {
  return Object.keys(STATE_REGISTRY);
}

// ─── National Payer Registry ─────────────────────────────────────────────────

export interface NationalPayerConfig {
  code: string;
  name: string;
  pullsFromCaqh: boolean;
  /** Base URL for provider directory lookup */
  directoryUrl: string | null;
}

/**
 * National payers (not state-specific).
 * State-specific payers are in each StateConfig.statePayers.
 */
export const NATIONAL_PAYERS: NationalPayerConfig[] = [
  {
    code: 'uhc',
    name: 'UnitedHealthcare',
    pullsFromCaqh: true,
    directoryUrl: 'https://www.uhc.com/find-a-doctor',
  },
  {
    code: 'aetna',
    name: 'Aetna',
    pullsFromCaqh: true,
    directoryUrl: 'https://www.aetna.com/find-a-doctor.html',
  },
  {
    code: 'cigna',
    name: 'Cigna',
    pullsFromCaqh: false,
    directoryUrl: 'https://hcpdirectory.cigna.com/',
  },
  {
    code: 'humana',
    name: 'Humana',
    pullsFromCaqh: false,
    directoryUrl: 'https://www.humana.com/find-a-doctor',
  },
  {
    code: 'pecos',
    name: 'PECOS (Medicare)',
    pullsFromCaqh: false,
    directoryUrl: 'https://pecos.cms.hhs.gov/',
  },
];

/** Payer codes that pull from CAQH (for update workflows) */
export const CAQH_PAYERS = new Set(
  NATIONAL_PAYERS.filter(p => p.pullsFromCaqh).map(p => p.code)
);
