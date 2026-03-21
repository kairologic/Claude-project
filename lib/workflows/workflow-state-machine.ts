import {
  WorkflowType,
  WorkflowStatus,
  TaskStatus,
} from '@/lib/types/dashboard-schema';

/**
 * Represents a template for tasks within a workflow
 */
export interface TaskTemplate {
  taskType: string;
  title: string;
  description: string;
  order: number;
  initialStatus: TaskStatus;
  isAutomated?: boolean;
  isOptional?: boolean;
  estimatedDays?: number;
}

/**
 * Valid state transitions for workflow statuses
 * Maps from current status to allowed next statuses
 */
export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  action_needed: ['in_progress', 'cancelled'],
  in_progress: ['awaiting', 'resolved', 'cancelled'],
  awaiting: ['resolved', 'in_progress', 'cancelled'],
  resolved: ['action_needed'],
  cancelled: [],
};

/**
 * Task templates for each workflow type
 * Defines the standard workflow structure and task sequence
 */
export const WORKFLOW_TASK_TEMPLATES: Record<WorkflowType, TaskTemplate[]> = {
  nppes_update: [
    {
      taskType: 'review_approve',
      title: 'Review & approve correction',
      description:
        'Review the NPPES correction and approve the proposed changes',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'download_form',
      title: 'Download pre-filled NPPES form',
      description:
        'Download and prepare the pre-filled NPPES form for submission',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 1,
    },
    {
      taskType: 'submit_nppes',
      title: 'Submit to NPPES portal',
      description: 'Submit the correction form to the NPPES portal',
      order: 3,
      initialStatus: 'pending',
      estimatedDays: 1,
    },
    {
      taskType: 'monitor_auto_confirm',
      title: 'Monitor & auto-confirm',
      description: 'Monitor submission status and auto-confirm completion',
      order: 4,
      initialStatus: 'pending',
      isAutomated: true,
      estimatedDays: 5,
    },
  ],

  payer_directory: [
    {
      taskType: 'review_findings',
      title: 'Review payer directory findings',
      description: 'Review the findings from payer directory verification',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'update_caqh',
      title: 'Update CAQH ProView',
      description: 'Update provider information in CAQH ProView',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 2,
    },
    {
      taskType: 'verify_payers',
      title: 'Verify payer directories updated',
      description: 'Verify that payer directories have been updated',
      order: 3,
      initialStatus: 'pending',
      estimatedDays: 3,
    },
  ],

  onboarding: [
    {
      taskType: 'npi_lookup',
      title: 'NPI lookup & data snapshot',
      description: 'Perform NPI lookup and capture initial provider data',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'credentialing_checklist',
      title: 'Complete credentialing checklist',
      description: 'Complete all items on the provider credentialing checklist',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 5,
    },
    {
      taskType: 'submit_applications',
      title: 'Submit payer/CAQH applications',
      description: 'Submit applications to payers and CAQH',
      order: 3,
      initialStatus: 'pending',
      estimatedDays: 3,
    },
    {
      taskType: 'monitor_enrollment',
      title: 'Monitor enrollment confirmations',
      description: 'Track and monitor enrollment confirmation responses',
      order: 4,
      initialStatus: 'pending',
      isAutomated: true,
      estimatedDays: 14,
    },
    {
      taskType: 'activate_provider',
      title: 'Activate provider on roster',
      description: 'Activate the provider on the organization roster',
      order: 5,
      initialStatus: 'pending',
      estimatedDays: 1,
    },
  ],

  release: [
    {
      taskType: 'departure_checklist',
      title: 'Complete departure checklist',
      description: 'Complete all items on the provider departure checklist',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'notify_systems',
      title: 'Notify NPPES, payers, website',
      description: 'Notify NPPES, payer directories, and public website of departure',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 2,
    },
    {
      taskType: 'monitor_removal',
      title: 'Monitor removal from directories',
      description: 'Monitor and verify removal from all provider directories',
      order: 3,
      initialStatus: 'pending',
      isAutomated: true,
      estimatedDays: 10,
    },
    {
      taskType: 'archive_provider',
      title: 'Archive provider record',
      description: 'Archive the provider record for compliance and future reference',
      order: 4,
      initialStatus: 'pending',
      estimatedDays: 1,
    },
  ],

  license_renewal: [
    {
      taskType: 'alert_manager',
      title: 'Alert practice manager',
      description: 'Alert practice manager of upcoming license renewal requirement',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'submit_renewal',
      title: 'Submit renewal application',
      description: 'Submit the license renewal application to the state board',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 5,
    },
    {
      taskType: 'monitor_board',
      title: 'Monitor state board',
      description: 'Monitor state board processing of the renewal application',
      order: 3,
      initialStatus: 'pending',
      isAutomated: true,
      estimatedDays: 30,
    },
    {
      taskType: 'confirm_renewal',
      title: 'Confirm renewal complete',
      description: 'Confirm that license renewal has been completed',
      order: 4,
      initialStatus: 'pending',
      estimatedDays: 1,
    },
  ],

  compliance: [
    {
      taskType: 'show_finding',
      title: 'Review compliance finding',
      description: 'Review the compliance finding and required remediation',
      order: 1,
      initialStatus: 'active',
      estimatedDays: 1,
    },
    {
      taskType: 'implement_fix',
      title: 'Implement remediation',
      description: 'Implement the required remediation for the compliance finding',
      order: 2,
      initialStatus: 'pending',
      estimatedDays: 7,
    },
    {
      taskType: 'rescan_confirm',
      title: 'Re-scan & confirm resolved',
      description: 'Re-scan the system and confirm that the finding is resolved',
      order: 3,
      initialStatus: 'pending',
      estimatedDays: 2,
    },
  ],
};

/**
 * Determines if a transition from one status to another is valid
 * @param from - Current workflow status
 * @param to - Target workflow status
 * @returns true if the transition is valid
 */
export function isValidTransition(
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  if (from === to) {
    return false;
  }

  const allowedTransitions = WORKFLOW_TRANSITIONS[from];
  return allowedTransitions ? allowedTransitions.includes(to) : false;
}

/**
 * Determines the next status based on current status and an event
 * This provides a convenience method for common workflow transitions
 * @param currentStatus - Current workflow status
 * @param event - Event that triggered the status change
 * @returns Next status or null if transition is not allowed
 */
export function getNextStatus(
  currentStatus: WorkflowStatus,
  event: string
): WorkflowStatus | null {
  const eventToStatusMap: Record<string, Record<WorkflowStatus, WorkflowStatus | null>> =
    {
      start: {
        action_needed: 'in_progress',
        in_progress: null,
        awaiting: null,
        resolved: null,
        cancelled: null,
      },
      complete_tasks: {
        action_needed: null,
        in_progress: 'awaiting',
        awaiting: null,
        resolved: null,
        cancelled: null,
      },
      auto_confirm: {
        action_needed: null,
        in_progress: 'resolved',
        awaiting: null,
        resolved: null,
        cancelled: null,
      },
      confirm: {
        action_needed: null,
        in_progress: null,
        awaiting: 'resolved',
        resolved: null,
        cancelled: null,
      },
      reopen: {
        action_needed: null,
        in_progress: null,
        awaiting: 'in_progress',
        resolved: 'action_needed',
        cancelled: null,
      },
      cancel: {
        action_needed: 'cancelled',
        in_progress: 'cancelled',
        awaiting: 'cancelled',
        resolved: null,
        cancelled: null,
      },
    };

  const nextStatus = eventToStatusMap[event]?.[currentStatus];
  return nextStatus ?? null;
}

/**
 * Retrieves the task templates for a specific workflow type
 * @param workflowType - The type of workflow
 * @returns Array of task templates for the workflow type
 */
export function getTaskTemplates(workflowType: WorkflowType): TaskTemplate[] {
  return WORKFLOW_TASK_TEMPLATES[workflowType] ?? [];
}

/**
 * Calculates the progress percentage of a workflow based on task statuses
 * Progress is calculated as (completed + in_progress) / total * 100
 * @param tasks - Array of tasks with their statuses
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  tasks: { status: TaskStatus }[]
): number {
  if (tasks.length === 0) {
    return 0;
  }

  const completedCount = tasks.filter(
    (task) => task.status === 'completed'
  ).length;
  const inProgressCount = tasks.filter(
    (task) => task.status === 'active'
  ).length;

  const progress =
    ((completedCount + inProgressCount) / tasks.length) * 100;
  return Math.round(progress);
}

/**
 * Determines if a workflow is overdue based on the overdue timestamp
 * @param overdueAt - ISO 8601 timestamp indicating when workflow became overdue
 * @returns true if overdueAt is set and in the past
 */
export function isOverdue(overdueAt: string | null): boolean {
  if (!overdueAt) {
    return false;
  }

  const overdueTime = new Date(overdueAt).getTime();
  const currentTime = new Date().getTime();
  return currentTime > overdueTime;
}

/**
 * Determines the escalation tier based on how overdue a workflow is
 * Escalation increases as the workflow remains overdue
 * @param overdueAt - ISO 8601 timestamp indicating when workflow became overdue
 * @returns Escalation tier: 'none' | 'reminder' | 'alert' | 'escalated' | 'archive'
 */
export function getEscalationTier(
  overdueAt: string | null
): 'none' | 'reminder' | 'alert' | 'escalated' | 'archive' {
  if (!overdueAt) {
    return 'none';
  }

  const overdueTime = new Date(overdueAt).getTime();
  const currentTime = new Date().getTime();
  const daysOverdue = (currentTime - overdueTime) / (1000 * 60 * 60 * 24);

  if (daysOverdue < 0) {
    return 'none';
  }

  if (daysOverdue < 3) {
    return 'reminder';
  }

  if (daysOverdue < 7) {
    return 'alert';
  }

  if (daysOverdue < 30) {
    return 'escalated';
  }

  return 'archive';
}
