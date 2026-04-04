/**
 * Shared test constants and helpers for KairoLogic E2E and API tests.
 */

// Test practice (Brushy Creek Family Physicians)
export const TEST_PRACTICE = {
  id: '5d195c8b-7f3c-498e-b5cf-24a7c0f8a215',
  name: 'Brushy Creek Family Physicians',
  state: 'TX',
};

// Secondary test practice (North Texas Medical Specialists)
export const TEST_PRACTICE_2 = {
  id: '184908d3-43e2-4522-918b-2220f908c54c',
  name: 'North Texas Medical Specialists',
  state: 'TX',
};

// Test user credentials (set via environment)
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@kairologic.net',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

// Dashboard URLs
export const URLS = {
  signIn: '/sign-in',
  dashboard: (id: string) => `/practice/${id}`,
  workflows: (id: string) => `/practice/${id}/workflows`,
  roster: (id: string) => `/practice/${id}/roster`,
  alerts: (id: string) => `/practice/${id}/alerts`,
  payerDirectory: (id: string) => `/practice/${id}/payer-directory`,
  settings: (id: string) => `/practice/${id}/settings`,
  help: (id: string) => `/practice/${id}/help`,
  search: (id: string) => `/practice/${id}/search`,
};

// API endpoints
export const API = {
  workflows: '/api/workflows',
  workflowCreate: '/api/workflows/create',
  workflowById: (id: string) => `/api/workflows/${id}`,
  taskById: (wfId: string, taskId: string) => `/api/workflows/${wfId}/tasks/${taskId}`,
  settingsPractice: '/api/settings/practice',
  settingsTeam: '/api/settings/team',
  alerts: '/api/alerts/mismatch',
  feedback: '/api/feedback',
  search: '/api/search/query',
  reports: '/api/reports/generate',
};

// Valid workflow types
export const WORKFLOW_TYPES = [
  'nppes_update',
  'payer_directory',
  'onboarding',
  'release',
  'license_renewal',
  'compliance',
] as const;

// Status transitions
export const VALID_TRANSITIONS: Record<string, string[]> = {
  action_needed: ['in_progress', 'cancelled'],
  in_progress: ['awaiting', 'resolved', 'action_needed', 'cancelled'],
  awaiting: ['resolved', 'in_progress', 'cancelled'],
  resolved: [],
  cancelled: ['action_needed'],
};
