/**
 * KairoLogic Test Fixtures — shared test data and constants
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

// ── Known test practice (North Texas Medical Surgical Clinic PA) ──
export const TEST_PRACTICE = {
  id: '184908d3-43e2-4522-918b-2220f908c54c',
  name: 'North Texas Medical Surgical Clinic PA',
  city: 'Denton',
  state: 'TX',
  providerCount: 18,
  mismatchCount: 132,
};

// ── Known test user ──
export const TEST_USER = {
  email: 'admin@kairologic.net',
  uuid: '2c2dc7ff-5fd5-4b20-9715-b051275e3e22',
  role: 'admin',
};

// ── Known preview token ──
export const TEST_PREVIEW = {
  token: 'demo-north-texas-med',
  id: '1aec14d9-01b3-4fa5-9810-66a1e190efd6',
};

// ── Known license renewal workflow ──
export const TEST_LICENSE_WORKFLOW = {
  id: '3797e734-072d-4ea6-bd57-8565441614c0',
  provider: 'JOHN SEUNGHUN PAEK',
  licenseExpires: '2026-05-31',
  taskCount: 4,
};

// ── Known providers with issues ──
export const TEST_PROVIDERS = {
  withTwoIssues: {
    name: 'ROBERT CONNAUGHTON',
    issueCount: 2,
  },
  withTwoIssuesAlt: {
    name: 'STEVEN SCHIERLING',
    issueCount: 2,
  },
};

// ── Workflow types and their expected task counts ──
export const WORKFLOW_TYPES = {
  nppes_update: { taskCount: 4, label: 'NPPES Update' },
  payer_directory: { taskCount: 4, label: 'Payer Directory Update' },
  onboarding: { taskCount: 6, label: 'Provider Onboarding' },
  release: { taskCount: 5, label: 'Provider Release' },
  compliance: { taskCount: 3, label: 'Compliance Remediation' },
  license_renewal: { taskCount: 4, label: 'License Renewal' },
} as const;

// ── Valid workflow status transitions ──
export const VALID_TRANSITIONS: Record<string, string[]> = {
  action_needed: ['in_progress', 'cancelled'],
  in_progress: ['awaiting', 'action_needed', 'cancelled'],
  awaiting: ['resolved', 'in_progress', 'cancelled'],
  resolved: [],
  cancelled: [],
};

// ── Invalid transitions (for regression) ──
export const INVALID_TRANSITIONS = [
  { from: 'action_needed', to: 'resolved' },
  { from: 'action_needed', to: 'awaiting' },
  { from: 'resolved', to: 'in_progress' },
  { from: 'cancelled', to: 'action_needed' },
];

// ── Task statuses ──
export const TASK_STATUSES = ['pending', 'active', 'completed', 'skipped'] as const;

// ── Escalation tier thresholds (days) ──
export const ESCALATION_TIERS = {
  nudge: 7,
  warning: 14,
  action: 28,
  stale: 60,
};

// ── Dashboard URLs ──
export const URLS = {
  login: '/dashboard/login',
  home: `/practice/${TEST_PRACTICE.id}`,
  workflows: `/practice/${TEST_PRACTICE.id}/workflows`,
  roster: `/practice/${TEST_PRACTICE.id}/roster`,
  alerts: `/practice/${TEST_PRACTICE.id}/alerts`,
  documents: `/practice/${TEST_PRACTICE.id}/documents`,
  payerDirectory: `/practice/${TEST_PRACTICE.id}/payer-directory`,
  settings: `/practice/${TEST_PRACTICE.id}/settings`,
  preview: `/preview/${TEST_PREVIEW.token}`,
};

// ── API endpoints ──
export const API = {
  magicLink: '/api/auth/magic-link',
  verify: '/api/auth/verify',
  verifyPin: '/api/auth/verify-pin',
  workflowCreate: '/api/workflows/create',
  workflowDetail: (id: string) => `/api/workflows/${id}`,
  workflowTask: (wfId: string, taskId: string) => `/api/workflows/${wfId}/tasks/${taskId}`,
  cronNppesMonitor: '/api/cron/nppes-monitor',
  teamInvite: '/api/settings/team/invite',
  payerSync: '/api/settings/payers/sync',
  searchQuery: '/api/search/query',
};

// ── Payer codes ──
export const PAYERS = ['uhc', 'aetna', 'cigna', 'humana', 'bcbs_tx'] as const;

// ── Statutes for compliance ──
export const STATUTES = {
  SB_1188: { name: 'SB 1188', state: 'Texas', type: 'Data sovereignty' },
  HB_149: { name: 'HB 149', state: 'Texas', type: 'AI transparency' },
  AB_3030: { name: 'AB 3030', state: 'California', type: 'AI transparency' },
};

// ── Sample workflow creation payloads ──
export const SAMPLE_PAYLOADS = {
  nppesUpdate: {
    practice_id: TEST_PRACTICE.id,
    workflow_type: 'nppes_update' as const,
    provider_npi: '1234567890',
    provider_name: 'Test Provider',
    finding_summary: 'Address mismatch between website and NPPES',
    finding_details: {
      field: 'address',
      website_value: '123 Main St, Denton, TX',
      nppes_value: '123 Main Street, Denton, TX 76201',
    },
    priority: 2,
    trigger_source: 'test',
  },
  payerDirectory: {
    practice_id: TEST_PRACTICE.id,
    workflow_type: 'payer_directory' as const,
    provider_npi: '1234567890',
    provider_name: 'Test Provider',
    finding_summary: 'UHC specialty mismatch',
    finding_details: {
      field: 'specialty',
      nppes_value: 'Internal Medicine',
      payer_name: 'UnitedHealthcare',
      payer_value: 'General Practice',
    },
    priority: 1,
    trigger_source: 'test',
  },
  onboarding: {
    practice_id: TEST_PRACTICE.id,
    workflow_type: 'onboarding' as const,
    provider_npi: '9876543210',
    provider_name: 'New Provider MD',
    finding_summary: 'New provider onboarding',
    trigger_source: 'manual',
  },
  release: {
    practice_id: TEST_PRACTICE.id,
    workflow_type: 'release' as const,
    provider_npi: '1234567890',
    provider_name: 'Departing Provider',
    finding_summary: 'Provider departure',
    trigger_source: 'manual',
  },
  compliance: {
    practice_id: TEST_PRACTICE.id,
    workflow_type: 'compliance' as const,
    provider_npi: '1234567890',
    provider_name: 'Test Provider',
    finding_summary: 'SB 1188 violation: foreign data routing',
    finding_details: {
      field: 'data_sovereignty',
      statute: 'SB 1188',
      website_value: 'Routes to EU servers',
      nppes_value: 'N/A',
    },
    priority: 3,
    trigger_source: 'scan',
  },
};

// ── Sentinel regression test practice ──
export const SENTINEL_PRACTICE = {
  id: 'e2e00000-0000-0000-0000-000000000001',
  name: 'SENTINEL TEST PRACTICE',
  state: 'TX',
  providerCount: 3,
  activeProviders: 3,
  departedProviders: 1,
  expectedWorkflowTypes: ['nppes_update', 'payer_directory', 'license_renewal', 'compliance', 'onboarding'] as const,
  expectedDeltaSignals: ['address_change', 'phone_change', 'taxonomy_change'] as const,
};

export const SENTINEL_PROVIDERS = {
  alice: { npi: '9990000001', name: 'ALICE SENTINEL', status: 'active', mismatches: ['address', 'phone'] },
  bob: { npi: '9990000002', name: 'BOB SENTINEL', status: 'active', mismatches: ['taxonomy'] },
  carol: { npi: '9990000003', name: 'CAROL SENTINEL', status: 'active', mismatches: [], licenseIssue: true },
  dave: { npi: '9990000004', name: 'DAVE SENTINEL', status: 'departed', mismatches: [] },
} as const;

export const SENTINEL_URLS = {
  home: `/practice/${SENTINEL_PRACTICE.id}`,
  workflows: `/practice/${SENTINEL_PRACTICE.id}/workflows`,
  roster: `/practice/${SENTINEL_PRACTICE.id}/roster`,
  alerts: `/practice/${SENTINEL_PRACTICE.id}/alerts`,
  payerDirectory: `/practice/${SENTINEL_PRACTICE.id}/payer-directory`,
};
