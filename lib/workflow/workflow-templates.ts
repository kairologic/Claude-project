/**
 * lib/workflow/workflow-templates.ts
 *
 * Task templates for every workflow type.
 * Each template defines the ordered list of tasks that get created
 * when a new workflow of that type is triggered.
 */

import type { WorkflowType } from '../types/dashboard-schema';

// ── Task template shape ───────────────────────────────────────

export interface TaskTemplate {
  task_order: number;
  task_type: string;
  title: string;
  description: string;
  /** Task group for UI grouping (credentialing workflows) */
  group?: 'immediate' | 'submit_wait' | 'monitoring' | 'complete';
}

// ── NPPES Update ──────────────────────────────────────────────

export const NPPES_UPDATE_TASKS: TaskTemplate[] = [
  { task_order: 1, task_type: 'review_approve', title: 'Review & approve correction', description: 'Compare NPPES vs website data and select the correct value' },
  { task_order: 2, task_type: 'download_form', title: 'Download pre-filled NPPES form', description: 'PDF with corrected data pre-populated' },
  { task_order: 3, task_type: 'submit_nppes', title: 'Submit form to NPPES', description: 'Upload or mail correction form to CMS' },
  { task_order: 4, task_type: 'monitor_auto_confirm', title: 'Monitor & auto-confirm', description: 'Auto-checks weekly; closes workflow when NPPES reflects update' },
];

// ── Payer Directory Update ────────────────────────────────────

export const PAYER_DIRECTORY_TASKS: TaskTemplate[] = [
  {
    task_order: 1,
    task_type: 'review_payer_finding',
    title: 'Review payer directory mismatch',
    description: 'Compare provider data across payer directories and NPPES',
  },
  {
    task_order: 2,
    task_type: 'update_caqh',
    title: 'Update CAQH ProView profile',
    description: 'Log in to CAQH and correct the mismatched fields — payers that pull from CAQH will auto-update',
  },
  {
    task_order: 3,
    task_type: 'verify_payer',
    title: 'Verify payer directories updated',
    description: 'Confirm each affected payer directory now shows the corrected data',
  },
  {
    task_order: 4,
    task_type: 'confirm_payer',
    title: 'Monitor & auto-confirm sync',
    description: 'Auto-checks via FHIR weekly; closes workflow when all payers reflect the update',
  },
];

// ── Provider Onboarding (Credentialing) ───────────────────────

export const ONBOARDING_TASKS: TaskTemplate[] = [
  {
    task_order: 1,
    task_type: 'npi_lookup',
    title: 'Verify NPI & data snapshot',
    description: 'Confirm provider NPI exists in NPPES and capture baseline data',
    group: 'immediate',
  },
  {
    task_order: 2,
    task_type: 'update_website',
    title: 'Add provider to practice website',
    description: 'Add name, photo, specialty, and bio to the public-facing provider directory',
    group: 'immediate',
  },
  {
    task_order: 3,
    task_type: 'enroll_caqh',
    title: 'Create or update CAQH ProView profile',
    description: 'Enroll the provider in CAQH ProView with current credentials and practice address',
    group: 'submit_wait',
  },
  {
    task_order: 4,
    task_type: 'credential_payers',
    title: 'Submit payer credentialing applications',
    description: 'Apply with each contracted payer — UHC, Aetna, Cigna, Humana, BCBS',
    group: 'submit_wait',
  },
  {
    task_order: 5,
    task_type: 'enroll_pecos',
    title: 'Enroll in PECOS (Medicare)',
    description: 'Submit CMS-855 enrollment via the PECOS portal for Medicare billing',
    group: 'submit_wait',
  },
  {
    task_order: 6,
    task_type: 'monitor_credentialing',
    title: 'Monitor credentialing status',
    description: 'Auto-checks payer directories weekly until provider appears in all contracted payers',
    group: 'monitoring',
  },
];

// ── Provider Release (Departure) ──────────────────────────────

export const RELEASE_TASKS: TaskTemplate[] = [
  {
    task_order: 1,
    task_type: 'remove_website',
    title: 'Remove provider from website',
    description: 'Remove or mark as departed on the public-facing provider directory',
    group: 'immediate',
  },
  {
    task_order: 2,
    task_type: 'update_nppes_release',
    title: 'Update NPPES practice address',
    description: 'Remove the departing provider\'s association with this practice address in NPPES',
    group: 'immediate',
  },
  {
    task_order: 3,
    task_type: 'notify_payers',
    title: 'Notify payers of departure',
    description: 'Submit termination notice to each contracted payer and update CAQH',
    group: 'submit_wait',
  },
  {
    task_order: 4,
    task_type: 'update_pecos_release',
    title: 'Update PECOS enrollment',
    description: 'Submit change of information in PECOS to remove practice association',
    group: 'submit_wait',
  },
  {
    task_order: 5,
    task_type: 'monitor_removal',
    title: 'Monitor phantom listing removal',
    description: 'Auto-checks weekly for 90 days to ensure provider no longer appears in directories',
    group: 'monitoring',
  },
];

// ── Compliance Remediation ────────────────────────────────────

export const COMPLIANCE_TASKS: TaskTemplate[] = [
  {
    task_order: 1,
    task_type: 'show_finding',
    title: 'Review compliance finding',
    description: 'Review the specific statutory requirement and how the practice is out of compliance',
  },
  {
    task_order: 2,
    task_type: 'provide_template',
    title: 'Apply remediation template',
    description: 'Use the auto-generated template or guide to fix the compliance gap',
  },
  {
    task_order: 3,
    task_type: 'rescan_confirm',
    title: 'Rescan & confirm compliance',
    description: 'KairoLogic rescans the practice website and confirms the issue is resolved',
  },
];

// ── Master lookup ─────────────────────────────────────────────

export const WORKFLOW_TASK_TEMPLATES: Record<WorkflowType, TaskTemplate[]> = {
  nppes_update: NPPES_UPDATE_TASKS,
  payer_directory: PAYER_DIRECTORY_TASKS,
  onboarding: ONBOARDING_TASKS,
  release: RELEASE_TASKS,
  license_renewal: [], // TODO: Day 3
  compliance: COMPLIANCE_TASKS,
};

/**
 * Returns the task templates for a given workflow type.
 * Throws if the type is not recognized.
 */
export function getTaskTemplates(workflowType: WorkflowType): TaskTemplate[] {
  const templates = WORKFLOW_TASK_TEMPLATES[workflowType];
  if (!templates) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }
  return templates;
}
