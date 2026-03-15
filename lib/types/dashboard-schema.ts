// ============================================================================
// KairoLogic — Dashboard Database Types
// Generated from: 20260315_001_dashboard_foundation.sql
// ============================================================================

// ─── Enums ────────────────────────────────────────────────────────────────────

export type WorkflowType =
  | 'nppes_update'
  | 'payer_directory'
  | 'onboarding'
  | 'release'
  | 'license_renewal'
  | 'compliance';

export type WorkflowStatus =
  | 'action_needed'
  | 'in_progress'
  | 'awaiting'
  | 'resolved'
  | 'cancelled';

export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped';

export type AlertSeverity = 'action' | 'warning' | 'info' | 'resolved';

export type ProviderRosterStatus = 'active' | 'onboarding' | 'departing' | 'departed';

export type PracticeRole = 'admin' | 'viewer' | 'editor';

// ─── Dashboard status mapping (UI layer) ──────────────────────────────────────

/** Maps workflow_status enum to dashboard display */
export const WORKFLOW_STATUS_DISPLAY: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  action_needed: { label: 'Needs action', color: '#D64545', bgColor: '#FDEEEE' },
  in_progress:   { label: 'In progress',  color: '#D4A017', bgColor: '#FDF6E3' },
  awaiting:      { label: 'Awaiting',      color: '#185FA5', bgColor: '#EEF4FF' },
  resolved:      { label: 'Resolved',      color: '#1A9E6D', bgColor: '#E6F7F2' },
  cancelled:     { label: 'Cancelled',     color: '#9AA3AE', bgColor: '#F4F5F7' },
};

/** Maps workflow_type enum to display label + tooltip */
export const WORKFLOW_TYPE_DISPLAY: Record<WorkflowType, {
  label: string;
  tooltip: string;
}> = {
  nppes_update:    { label: 'NPPES UPDATE',      tooltip: 'The National Plan and Provider Enumeration System — the federal registry for all healthcare providers' },
  payer_directory: { label: 'PAYER DIRECTORY',    tooltip: 'Insurance company provider directories queried via FHIR PDex Plan-Net APIs' },
  onboarding:      { label: 'ONBOARDING',         tooltip: 'New provider credentialing workflow — CAQH, payer enrollment, NPPES, website updates' },
  release:         { label: 'RELEASE',             tooltip: 'Provider departure workflow — website removal, NPPES update, payer notifications' },
  license_renewal: { label: 'LICENSE RENEWAL',     tooltip: 'State medical board license status monitoring' },
  compliance:      { label: 'COMPLIANCE',          tooltip: 'State regulatory compliance — SB 1188, HB 149, AB 3030' },
};

// ─── Table Types ──────────────────────────────────────────────────────────────

export interface PracticeUser {
  id: string;
  practice_id: string;
  user_id: string;
  role: PracticeRole;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;
  is_primary: boolean;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  practice_id: string;
  workflow_type: WorkflowType;
  status: WorkflowStatus;
  priority: number;

  // Provider context
  provider_npi: string | null;
  provider_name: string | null;

  // Trigger context
  trigger_source: string | null;
  trigger_ref_id: string | null;
  trigger_ref_table: string | null;
  finding_summary: string | null;
  finding_details: FindingDetails;

  // Approval
  approved_value: string | null;
  approved_by: string | null;
  approved_at: string | null;

  // Lifecycle
  target_completion: string | null;
  overdue_at: string | null;
  completed_at: string | null;
  completed_reason: string | null;

  created_at: string;
  updated_at: string;
}

/** Structured finding details stored in workflow_instances.finding_details */
export interface FindingDetails {
  field?: string;                    // 'address', 'phone', 'specialty', 'name'
  website_value?: string;
  nppes_value?: string;
  payer_name?: string;               // For payer directory workflows
  payer_value?: string;
  license_number?: string;           // For license renewal
  license_expiration?: string;
  statute?: string;                  // For compliance: 'SB 1188', 'HB 149', 'AB 3030'
  [key: string]: unknown;
}

export interface WorkflowTask {
  id: string;
  workflow_id: string;
  task_order: number;
  task_type: string;
  title: string;
  description: string | null;
  status: TaskStatus;

  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;

  confirmation_source: string | null;
  confirmed_at: string | null;
  confirmation_data: Record<string, unknown> | null;

  metadata: TaskMetadata;

  created_at: string;
  updated_at: string;
}

/** Task-specific metadata */
export interface TaskMetadata {
  portal_url?: string;        // TMB renewal portal, CAQH login, payer portal
  form_url?: string;          // Generated PDF download URL
  payer_name?: string;        // For per-payer tasks
  comparison_data?: {         // For review_finding task
    field: string;
    sources: Array<{
      source: string;         // 'website', 'nppes', 'payer:uhc', etc.
      value: string;
    }>;
  };
  options?: Array<{           // For approve_correction task
    source: string;
    value: string;
  }>;
  [key: string]: unknown;
}

export interface WorkflowEvent {
  id: string;
  workflow_id: string;
  event_type: string;
  actor_id: string | null;
  actor_type: 'user' | 'system' | 'automation';
  title: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: string;
  practice_id: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;

  workflow_id: string | null;
  provider_npi: string | null;
  provider_name: string | null;

  source: string | null;
  is_active: boolean;
  resolved_at: string | null;

  created_at: string;
}

export interface UserAlertRead {
  id: string;
  user_id: string;
  alert_id: string;
  seen_at: string;
}

export interface WorkflowArtifact {
  id: string;
  workflow_id: string;
  practice_id: string;

  name: string;
  artifact_type: 'pdf' | 'checklist' | 'template' | 'guide' | 'link';
  category: 'auto_generated' | 'template' | 'upload';

  storage_path: string | null;
  storage_url: string | null;
  file_size_kb: number | null;

  content: Record<string, unknown> | null;
  external_url: string | null;

  generated_by: string;
  created_at: string;
}

export interface PreviewToken {
  id: string;
  practice_website_id: string;   // FK to practice_websites (existing MVP column)
  token: string;
  token_type: 'preview' | 'verify' | 'invite';

  // Verify/invite flow (dashboard additions)
  email: string | null;
  role: PracticeRole | null;
  invited_by: string | null;

  // Lifecycle
  expires_at: string;
  used_at: string | null;
  is_used: boolean;

  // Claim tracking (existing MVP columns)
  is_claimed: boolean;
  claimed_at: string | null;
  claimed_by: string | null;

  // Analytics (existing MVP columns)
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;

  // Campaign tracking (existing MVP columns)
  campaign_id: string | null;
  email_sent_at: string | null;
  email_opened_at: string | null;
  followup_1_sent: boolean;
  followup_2_sent: boolean;
  followup_3_sent: boolean;
  mismatch_summary: Record<string, unknown> | null;

  created_at: string;
}

// ─── View Types ───────────────────────────────────────────────────────────────

export interface WorkflowKPIs {
  practice_id: string;
  action_needed_count: number;
  in_progress_count: number;
  awaiting_count: number;
  resolved_count: number;
  active_count: number;
  overdue_count: number;
}

export interface UnseenAlertCount {
  user_id: string;
  practice_id: string;
  unseen_count: number;
}

// ─── Composite Types (for API/UI) ─────────────────────────────────────────────

/** Workflow with tasks, for the detail panel */
export interface WorkflowWithTasks extends WorkflowInstance {
  tasks: WorkflowTask[];
  events: WorkflowEvent[];
  artifacts: WorkflowArtifact[];
}

/** Alert with user's seen state */
export interface AlertWithReadState extends Alert {
  is_seen: boolean;
}

/** Provider roster row for the table view */
export interface ProviderRosterRow {
  npi: string;
  provider_name: string;
  specialty: string;
  roster_status: ProviderRosterStatus;
  active_issue_count: number;
  added_date: string | null;
  departed_date: string | null;
}

// ─── Task Type Constants ──────────────────────────────────────────────────────

/** Standard task types used across workflows */
export const TASK_TYPES = {
  // NPPES Update workflow
  REVIEW_FINDING: 'review_finding',
  APPROVE_CORRECTION: 'approve_correction',
  DOWNLOAD_FORM: 'download_form',
  SUBMIT_NPPES: 'submit_nppes',
  MONITOR_SYNC: 'monitor_sync',
  AUTO_CONFIRM: 'auto_confirm',

  // Payer Directory workflow
  UPDATE_CAQH: 'update_caqh',
  VERIFY_PAYER: 'verify_payer',
  CONFIRM_PAYER: 'confirm_payer',

  // License Renewal workflow
  ALERT_MANAGER: 'alert_manager',
  SUBMIT_RENEWAL: 'submit_renewal',
  MONITOR_BOARD: 'monitor_board',
  CONFIRM_RENEWAL: 'confirm_renewal',

  // Onboarding workflow (Day 2)
  NPI_LOOKUP: 'npi_lookup',
  DATA_SNAPSHOT: 'data_snapshot',
  CREDENTIALING_CHECKLIST: 'credentialing_checklist',

  // Release workflow (Day 2)
  DEPARTURE_CHECKLIST: 'departure_checklist',
  MONITOR_REMOVAL: 'monitor_removal',

  // Compliance workflow (Day 2)
  SHOW_FINDING: 'show_finding',
  PROVIDE_TEMPLATE: 'provide_template',
  RESCAN_CONFIRM: 'rescan_confirm',
} as const;

/** Event types for workflow_events */
export const EVENT_TYPES = {
  CREATED: 'created',
  TASK_COMPLETED: 'task_completed',
  STATUS_CHANGED: 'status_changed',
  APPROVED: 'approved',
  AUTO_CONFIRMED: 'auto_confirmed',
  OVERDUE: 'overdue',
  COMMENT: 'comment',
  ARTIFACT_GENERATED: 'artifact_generated',
  ESCALATED: 'escalated',
} as const;
