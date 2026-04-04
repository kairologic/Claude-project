/**
 * KairoLogic Test Coverage Map
 *
 * Maps source files → test files → use case IDs.
 * Used by audit-coverage.ts to detect when code changes
 * don't have corresponding test updates.
 *
 * HOW TO MAINTAIN:
 * When you add/modify a dashboard component or API route,
 * add its entry here. The audit script will warn if a source
 * file was changed but its mapped test file was NOT changed
 * in the same commit/PR.
 */

export interface CoverageEntry {
  source: string; // Source file glob pattern
  tests: string[]; // Test file(s) that cover it
  useCases: string[]; // Use case IDs from USE_CASES_AND_TEST_PLAN.md
  category: string; // Human-readable category
}

export const COVERAGE_MAP: CoverageEntry[] = [
  // ── Authentication ──
  {
    source: 'app/api/auth/magic-link/route.ts',
    tests: ['tests/e2e/auth.api.spec.ts'],
    useCases: ['UC-AUTH-01'],
    category: 'Authentication',
  },
  {
    source: 'app/api/auth/verify/route.ts',
    tests: ['tests/e2e/auth.api.spec.ts'],
    useCases: ['UC-AUTH-02', 'UC-AUTH-03'],
    category: 'Authentication',
  },
  {
    source: 'app/api/auth/verify-pin/route.ts',
    tests: ['tests/e2e/auth.api.spec.ts'],
    useCases: ['UC-AUTH-02'],
    category: 'Authentication',
  },
  {
    source: 'app/api/auth/complete-invite/route.ts',
    tests: ['tests/e2e/auth.api.spec.ts'],
    useCases: ['UC-AUTH-06'],
    category: 'Authentication',
  },
  {
    source: 'app/api/settings/team/invite/route.ts',
    tests: ['tests/e2e/auth.api.spec.ts'],
    useCases: ['UC-AUTH-05'],
    category: 'Authentication',
  },

  // ── Dashboard Home ──
  {
    source: 'components/dashboard/DashboardHome.tsx',
    tests: ['tests/e2e/dashboard-home.e2e.spec.ts'],
    useCases: ['UC-HOME-01', 'UC-HOME-02', 'UC-HOME-03', 'UC-HOME-04', 'UC-HOME-05', 'UC-HOME-06'],
    category: 'Dashboard Home',
  },
  {
    source: 'app/practice/[id]/page.tsx',
    tests: ['tests/e2e/dashboard-home.e2e.spec.ts'],
    useCases: ['UC-HOME-01'],
    category: 'Dashboard Home',
  },

  // ── Workflow API ──
  {
    source: 'app/api/workflows/create/route.ts',
    tests: ['tests/e2e/workflows-crud.api.spec.ts'],
    useCases: ['UC-WF1-01', 'UC-WF2-01', 'UC-WF3-01', 'UC-WF4-01', 'UC-WF5-01'],
    category: 'Workflow API',
  },
  {
    source: 'app/api/workflows/[id]/route.ts',
    tests: ['tests/e2e/workflows-crud.api.spec.ts', 'tests/e2e/workflow-state-machine.api.spec.ts'],
    useCases: ['UC-WF1-02', 'UC-WF1-04', 'UC-WF1-06', 'UC-WF1-09', 'UC-REG-04'],
    category: 'Workflow API',
  },
  {
    source: 'app/api/workflows/[id]/tasks/[taskId]/route.ts',
    tests: ['tests/e2e/workflows-crud.api.spec.ts'],
    useCases: ['UC-WF1-04', 'UC-WF3-03'],
    category: 'Workflow API',
  },

  // ── Workflow Engine ──
  {
    source: 'lib/workflow/state-machine.ts',
    tests: ['tests/e2e/workflow-state-machine.api.spec.ts'],
    useCases: ['UC-REG-04'],
    category: 'Workflow Engine',
  },
  {
    source: 'lib/workflow/workflow-templates.ts',
    tests: ['tests/e2e/workflows-crud.api.spec.ts'],
    useCases: ['UC-WF1-01', 'UC-WF2-01', 'UC-WF3-01', 'UC-WF4-01', 'UC-WF5-01'],
    category: 'Workflow Engine',
  },
  {
    source: 'lib/workflow/audit-logger.ts',
    tests: ['tests/e2e/workflows-crud.api.spec.ts'],
    useCases: ['UC-WF1-04'],
    category: 'Workflow Engine',
  },
  {
    source: 'lib/workflow/email-notifications.ts',
    tests: ['tests/e2e/resilience.api.spec.ts'],
    useCases: ['UC-ALRT-05'],
    category: 'Workflow Engine',
  },

  // ── NPPES Workflow UI ──
  {
    source: 'components/dashboard/WorkflowDetailPanel.tsx',
    tests: [
      'tests/e2e/workflow-nppes.e2e.spec.ts',
      'tests/e2e/workflow-payer.e2e.spec.ts',
      'tests/e2e/workflow-onboarding.e2e.spec.ts',
      'tests/e2e/workflow-release.e2e.spec.ts',
      'tests/e2e/workflow-compliance.e2e.spec.ts',
    ],
    useCases: ['UC-WF1-02', 'UC-WF1-03', 'UC-WF2-02', 'UC-WF3-02', 'UC-WF4-02', 'UC-WF5-02'],
    category: 'Workflow Detail',
  },
  {
    source: 'components/dashboard/FindingReview.tsx',
    tests: ['tests/e2e/workflow-nppes.e2e.spec.ts'],
    useCases: ['UC-WF1-03'],
    category: 'NPPES Workflow',
  },
  {
    source: 'components/dashboard/ApproveCorrection.tsx',
    tests: ['tests/e2e/workflow-nppes.e2e.spec.ts'],
    useCases: ['UC-WF1-04'],
    category: 'NPPES Workflow',
  },
  {
    source: 'components/dashboard/SubmitNppes.tsx',
    tests: ['tests/e2e/workflow-nppes.e2e.spec.ts'],
    useCases: ['UC-WF1-06'],
    category: 'NPPES Workflow',
  },

  // ── Payer Directory ──
  {
    source: 'components/dashboard/PayerMismatchReview.tsx',
    tests: ['tests/e2e/workflow-payer.e2e.spec.ts'],
    useCases: ['UC-WF2-02', 'UC-WF2-03', 'UC-WF2-04', 'UC-WF2-05'],
    category: 'Payer Directory',
  },
  {
    source: 'components/dashboard/PayerDirectoryView.tsx',
    tests: ['tests/e2e/workflow-payer.e2e.spec.ts'],
    useCases: ['UC-PAYR-01', 'UC-PAYR-02', 'UC-PAYR-03', 'UC-PAYR-04'],
    category: 'Payer Directory',
  },

  // ── Onboarding ──
  {
    source: 'components/dashboard/CredentialingChecklist.tsx',
    tests: ['tests/e2e/workflow-onboarding.e2e.spec.ts'],
    useCases: ['UC-WF3-02', 'UC-WF3-04', 'UC-WF3-05', 'UC-WF3-06'],
    category: 'Onboarding',
  },

  // ── Release ──
  {
    source: 'components/dashboard/DepartureChecklist.tsx',
    tests: ['tests/e2e/workflow-release.e2e.spec.ts'],
    useCases: ['UC-WF4-02', 'UC-WF4-03', 'UC-WF4-04'],
    category: 'Release',
  },

  // ── Compliance ──
  {
    source: 'components/dashboard/ComplianceFinding.tsx',
    tests: ['tests/e2e/workflow-compliance.e2e.spec.ts'],
    useCases: ['UC-WF5-02', 'UC-WF5-03', 'UC-WF5-04'],
    category: 'Compliance',
  },

  // ── Provider Roster ──
  {
    source: 'components/dashboard/ProviderRosterView.tsx',
    tests: ['tests/e2e/provider-roster.e2e.spec.ts'],
    useCases: ['UC-ROST-01', 'UC-ROST-02', 'UC-ROST-03', 'UC-ROST-04', 'UC-ROST-05'],
    category: 'Provider Roster',
  },
  {
    source: 'app/practice/[id]/roster/page.tsx',
    tests: ['tests/e2e/provider-roster.e2e.spec.ts'],
    useCases: ['UC-ROST-01'],
    category: 'Provider Roster',
  },

  // ── Alerts ──
  {
    source: 'components/dashboard/AlertsView.tsx',
    tests: ['tests/e2e/alerts.e2e.spec.ts'],
    useCases: ['UC-ALRT-01', 'UC-ALRT-02', 'UC-ALRT-03', 'UC-ALRT-04'],
    category: 'Alerts',
  },
  {
    source: 'app/practice/[id]/alerts/page.tsx',
    tests: ['tests/e2e/alerts.e2e.spec.ts'],
    useCases: ['UC-ALRT-01'],
    category: 'Alerts',
  },

  // ── Navigation ──
  {
    source: 'components/dashboard/Sidebar.tsx',
    tests: ['tests/e2e/navigation.e2e.spec.ts'],
    useCases: ['UC-NAV-01'],
    category: 'Navigation',
  },
  {
    source: 'components/dashboard/SearchBar.tsx',
    tests: ['tests/e2e/navigation.e2e.spec.ts'],
    useCases: ['UC-NAV-02', 'UC-NAV-03'],
    category: 'Navigation',
  },

  // ── Resilience ──
  {
    source: 'lib/resilience/retry.ts',
    tests: ['tests/e2e/resilience.api.spec.ts'],
    useCases: ['UC-REG-06'],
    category: 'Resilience',
  },
  {
    source: 'lib/resilience/stale-workflow-manager.ts',
    tests: ['tests/e2e/resilience.api.spec.ts'],
    useCases: ['UC-WF1-08'],
    category: 'Resilience',
  },
  {
    source: 'lib/resilience/conflict-resolver.ts',
    tests: ['tests/e2e/resilience.api.spec.ts'],
    useCases: ['UC-REG-06'],
    category: 'Resilience',
  },

  // ── NPPES Monitor Cron ──
  {
    source: 'app/api/cron/nppes-monitor/route.ts',
    tests: ['tests/e2e/resilience.api.spec.ts', 'tests/e2e/workflows-crud.api.spec.ts'],
    useCases: ['UC-WF1-07', 'UC-WF1-08', 'UC-REG-06'],
    category: 'Cron Jobs',
  },

  // ── Outreach Scoring ──
  {
    source: 'lib/outreach/scoring-engine.ts',
    tests: [], // TODO: add outreach scoring tests
    useCases: [],
    category: 'Outreach',
  },

  // ── Address Density ──
  {
    source: 'lib/scanner/address-density-filter.ts',
    tests: [], // TODO: add density filter tests
    useCases: [],
    category: 'Data Quality',
  },
];

/**
 * Look up which tests cover a given source file path.
 * Supports partial matching (e.g., "DashboardHome" matches the full path).
 */
export function getTestsForSource(sourcePath: string): CoverageEntry | undefined {
  return COVERAGE_MAP.find(
    (entry) => sourcePath.includes(entry.source) || entry.source.includes(sourcePath),
  );
}

/**
 * Find source files that have no test coverage.
 */
export function getUncoveredSources(): CoverageEntry[] {
  return COVERAGE_MAP.filter((entry) => entry.tests.length === 0);
}

/**
 * Get all use case IDs that are covered by tests.
 */
export function getCoveredUseCases(): string[] {
  const all = new Set<string>();
  COVERAGE_MAP.forEach((entry) => entry.useCases.forEach((uc) => all.add(uc)));
  return Array.from(all).sort();
}
