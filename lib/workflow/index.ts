/**
 * lib/workflow/index.ts — Barrel export for the workflow engine.
 */

export {
  WORKFLOW_STATUSES,
  TASK_STATUSES,
  canTransitionWorkflow,
  canTransitionTask,
  deriveWorkflowStatus,
  getNotificationsForEvent,
  NOTIFICATION_TRIGGERS,
} from './state-machine';

export type {
  WorkflowStatus,
  TaskStatus,
  TransitionResult,
  WorkflowEvent,
  WorkflowEventType,
  NotificationTrigger,
} from './state-machine';

export {
  logWorkflowEvent,
  logStatusChange,
  logTaskChange,
  logApproval,
  logAutoConfirmed,
  logEscalation,
  shouldNotify,
} from './audit-logger';

export { sendWorkflowNotification, getPracticeEmails } from './email-notifications';

export { confirmWorkflow, escalateWorkflow } from './confirmation-engine';

export type { ConfirmationResult } from './confirmation-engine';

export {
  WORKFLOW_TASK_TEMPLATES,
  NPPES_UPDATE_TASKS,
  PAYER_DIRECTORY_TASKS,
  ONBOARDING_TASKS,
  RELEASE_TASKS,
  COMPLIANCE_TASKS,
  getTaskTemplates,
} from './workflow-templates';

export type { TaskTemplate } from './workflow-templates';
