/**
 * lib/reports/report-definitions.ts
 *
 * Self-service report definitions with field catalogs.
 * Each report type declares its available fields, base query, filters,
 * and join configuration. The query engine uses these definitions to
 * build dynamic SQL based on the caller's field selection.
 *
 * Adding a new report type = adding one definition object here.
 * No new API routes or UI changes needed.
 */

// ─── Field descriptor ───────────────────────────────────────────────────────

export interface FieldDefinition {
  /** Unique key used in API requests and column headers */
  key: string;
  /** Human-readable label for UI and PDF/CSV headers */
  label: string;
  /** Data type hint for frontend filter controls and PDF formatting */
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'json' | 'status';
  /** The actual DB column expression (may include table alias) */
  column: string;
  /** Whether this field is included by default when no fields[] specified */
  default: boolean;
  /** Short description for the field picker UI tooltip */
  description?: string;
  /** If true, this field can be used as a filter */
  filterable?: boolean;
  /** For status/enum fields, the set of possible values */
  enumValues?: string[];
}

export interface FilterDefinition {
  /** Filter parameter name in API request */
  key: string;
  /** Human-readable label */
  label: string;
  /** Filter input type */
  type: 'text' | 'select' | 'date_range' | 'multi_select' | 'number_range';
  /** For select/multi_select, the options available */
  options?: { value: string; label: string }[];
  /** The SQL column this filter applies to */
  column: string;
  /** SQL operator: eq, in, gte, lte, like, between */
  operator: 'eq' | 'in' | 'gte' | 'lte' | 'like' | 'between' | 'ilike';
}

export interface ReportDefinition {
  /** Unique report type key */
  type: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon hint for UI (lucide icon name) */
  icon: string;
  /** Primary table for the query */
  baseTable: string;
  /** Supabase select expression (all possible fields, including joins) */
  baseSelect: string;
  /** All available fields the user can select */
  fields: FieldDefinition[];
  /** Available filters */
  filters: FilterDefinition[];
  /** Default sort column */
  defaultSort: string;
  /** Default sort direction */
  defaultSortDirection: 'asc' | 'desc';
  /** Whether this report requires practice_id scoping */
  practiceScoped: boolean;
  /** The column used to scope by practice_id */
  practiceColumn?: string;
  /** Supported export formats */
  exportFormats: ('csv' | 'pdf')[];
}

// ─── Workflow status options (shared across reports) ────────────────────────

const WORKFLOW_STATUSES = [
  { value: 'action_needed', label: 'Action Needed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting', label: 'Awaiting Confirmation' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
];

const WORKFLOW_TYPES = [
  { value: 'nppes_update', label: 'NPPES Update' },
  { value: 'payer_directory', label: 'Payer Directory' },
  { value: 'onboarding', label: 'Provider Onboarding' },
  { value: 'release', label: 'Provider Release' },
  { value: 'license_renewal', label: 'License Renewal' },
  { value: 'compliance', label: 'Compliance' },
];

const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

const ALERT_SEVERITIES = [
  { value: 'action', label: 'Action Required' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Informational' },
  { value: 'resolved', label: 'Resolved' },
];

// ─── Report: Workflow Status ────────────────────────────────────────────────

export const WORKFLOW_STATUS_REPORT: ReportDefinition = {
  type: 'workflow_status',
  name: 'Workflow Status',
  description: 'Active and historical workflows with task progress, provider details, and resolution tracking.',
  icon: 'ClipboardList',
  baseTable: 'workflow_instances',
  baseSelect: `
    id,
    workflow_type,
    status,
    provider_npi,
    provider_name,
    finding_summary,
    finding_details,
    created_at,
    updated_at,
    completed_at,
    practice_id,
    workflow_tasks (
      id,
      task_type,
      title,
      status,
      completed_at
    )
  `,
  fields: [
    { key: 'id', label: 'Workflow ID', type: 'text', column: 'id', default: false, description: 'Unique workflow instance identifier' },
    { key: 'workflow_type', label: 'Workflow Type', type: 'status', column: 'workflow_type', default: true, filterable: true, description: 'Category of workflow', enumValues: WORKFLOW_TYPES.map(t => t.value) },
    { key: 'status', label: 'Status', type: 'status', column: 'status', default: true, filterable: true, description: 'Current workflow status', enumValues: WORKFLOW_STATUSES.map(s => s.value) },
    { key: 'provider_npi', label: 'NPI', type: 'text', column: 'provider_npi', default: true, filterable: true, description: 'Provider NPI number' },
    { key: 'provider_name', label: 'Provider', type: 'text', column: 'provider_name', default: true, filterable: true, description: 'Provider name' },
    { key: 'finding_summary', label: 'Finding Summary', type: 'text', column: 'finding_summary', default: true, description: 'Brief description of the finding that triggered this workflow' },
    { key: 'finding_details', label: 'Finding Details', type: 'json', column: 'finding_details', default: false, description: 'Full structured finding data (JSON)' },
    { key: 'task_count', label: 'Total Tasks', type: 'number', column: '_computed', default: true, description: 'Number of tasks in this workflow' },
    { key: 'tasks_completed', label: 'Tasks Completed', type: 'number', column: '_computed', default: true, description: 'Number of completed tasks' },
    { key: 'created_at', label: 'Created', type: 'datetime', column: 'created_at', default: true, filterable: true, description: 'When the workflow was created' },
    { key: 'updated_at', label: 'Last Updated', type: 'datetime', column: 'updated_at', default: false, description: 'When the workflow was last modified' },
    { key: 'completed_at', label: 'Completed', type: 'datetime', column: 'completed_at', default: false, filterable: true, description: 'When the workflow was resolved' },
    { key: 'age_days', label: 'Age (Days)', type: 'number', column: '_computed', default: false, description: 'Days since workflow was created' },
    { key: 'resolution_days', label: 'Resolution Time (Days)', type: 'number', column: '_computed', default: false, description: 'Days from creation to completion (resolved workflows only)' },
  ],
  filters: [
    { key: 'status', label: 'Status', type: 'multi_select', options: WORKFLOW_STATUSES, column: 'status', operator: 'in' },
    { key: 'workflow_type', label: 'Workflow Type', type: 'multi_select', options: WORKFLOW_TYPES, column: 'workflow_type', operator: 'in' },
    { key: 'provider_npi', label: 'Provider NPI', type: 'text', column: 'provider_npi', operator: 'eq' },
    { key: 'provider_name', label: 'Provider Name', type: 'text', column: 'provider_name', operator: 'ilike' },
    { key: 'created_after', label: 'Created After', type: 'date_range', column: 'created_at', operator: 'gte' },
    { key: 'created_before', label: 'Created Before', type: 'date_range', column: 'created_at', operator: 'lte' },
  ],
  defaultSort: 'created_at',
  defaultSortDirection: 'desc',
  practiceScoped: true,
  practiceColumn: 'practice_id',
  exportFormats: ['csv', 'pdf'],
};

// ─── Report: Audit Trail ────────────────────────────────────────────────────

export const AUDIT_TRAIL_REPORT: ReportDefinition = {
  type: 'audit_trail',
  name: 'Audit Trail',
  description: 'Complete event log of detections, user actions, and system events with full provenance.',
  icon: 'ScrollText',
  baseTable: 'workflow_events',
  baseSelect: `
    id,
    workflow_id,
    event_type,
    title,
    details,
    actor_email,
    actor_type,
    created_at,
    workflow_instances!inner (
      workflow_type,
      provider_npi,
      provider_name,
      status,
      practice_id
    )
  `,
  fields: [
    { key: 'id', label: 'Event ID', type: 'text', column: 'id', default: false, description: 'Unique event identifier' },
    { key: 'event_type', label: 'Event Type', type: 'text', column: 'event_type', default: true, filterable: true, description: 'Type of event (created, status_changed, task_completed, etc.)' },
    { key: 'title', label: 'Title', type: 'text', column: 'title', default: true, description: 'Human-readable event title' },
    { key: 'actor_email', label: 'Actor', type: 'text', column: 'actor_email', default: true, filterable: true, description: 'Who triggered this event (system or user email)' },
    { key: 'actor_type', label: 'Actor Type', type: 'text', column: 'actor_type', default: false, description: 'Type of actor (system, user, etc.)' },
    { key: 'workflow_type', label: 'Workflow Type', type: 'status', column: 'workflow_instances.workflow_type', default: true, filterable: true, description: 'Parent workflow category', enumValues: WORKFLOW_TYPES.map(t => t.value) },
    { key: 'provider_npi', label: 'NPI', type: 'text', column: 'workflow_instances.provider_npi', default: true, filterable: true, description: 'Provider NPI from parent workflow' },
    { key: 'provider_name', label: 'Provider', type: 'text', column: 'workflow_instances.provider_name', default: true, description: 'Provider name from parent workflow' },
    { key: 'workflow_status', label: 'Workflow Status', type: 'status', column: 'workflow_instances.status', default: false, filterable: true, description: 'Current status of the parent workflow', enumValues: WORKFLOW_STATUSES.map(s => s.value) },
    { key: 'workflow_id', label: 'Workflow ID', type: 'text', column: 'workflow_id', default: false, description: 'Parent workflow instance ID' },
    { key: 'details', label: 'Event Data', type: 'json', column: 'details', default: false, description: 'Structured event details (JSON)' },
    { key: 'created_at', label: 'Timestamp', type: 'datetime', column: 'created_at', default: true, filterable: true, description: 'When the event occurred' },
  ],
  filters: [
    { key: 'event_type', label: 'Event Type', type: 'text', column: 'event_type', operator: 'ilike' },
    { key: 'actor_email', label: 'Actor', type: 'text', column: 'actor_email', operator: 'ilike' },
    { key: 'workflow_type', label: 'Workflow Type', type: 'multi_select', options: WORKFLOW_TYPES, column: 'workflow_instances.workflow_type', operator: 'in' },
    { key: 'provider_npi', label: 'Provider NPI', type: 'text', column: 'workflow_instances.provider_npi', operator: 'eq' },
    { key: 'after', label: 'After Date', type: 'date_range', column: 'created_at', operator: 'gte' },
    { key: 'before', label: 'Before Date', type: 'date_range', column: 'created_at', operator: 'lte' },
  ],
  defaultSort: 'created_at',
  defaultSortDirection: 'desc',
  practiceScoped: true,
  practiceColumn: 'workflow_instances.practice_id',
  exportFormats: ['csv', 'pdf'],
};

// ─── Report: Provider Data Accuracy ─────────────────────────────────────────

export const PROVIDER_ACCURACY_REPORT: ReportDefinition = {
  type: 'provider_accuracy',
  name: 'Provider Data Accuracy',
  description: 'Per-provider, per-source accuracy snapshot showing mismatches, listing status, and correction history.',
  icon: 'ShieldCheck',
  baseTable: 'payer_directory_mismatches',
  baseSelect: `
    id,
    npi,
    payer_code,
    field_name,
    mismatch_type,
    nppes_value,
    website_value,
    payer_value,
    recommended_value,
    fix_via_caqh,
    fix_instructions,
    priority,
    status,
    signal_type,
    detection_count,
    resolved_at,
    created_at,
    practice_website_id
  `,
  fields: [
    { key: 'id', label: 'Mismatch ID', type: 'text', column: 'id', default: false },
    { key: 'npi', label: 'NPI', type: 'text', column: 'npi', default: true, filterable: true, description: 'Provider NPI' },
    { key: 'payer_code', label: 'Payer', type: 'text', column: 'payer_code', default: true, filterable: true },
    { key: 'field_name', label: 'Field', type: 'text', column: 'field_name', default: true, filterable: true, description: 'Which data field has the mismatch' },
    { key: 'mismatch_type', label: 'Mismatch Type', type: 'text', column: 'mismatch_type', default: true, filterable: true },
    { key: 'nppes_value', label: 'NPPES Value', type: 'text', column: 'nppes_value', default: true, description: 'Value from NPPES registry' },
    { key: 'website_value', label: 'Website Value', type: 'text', column: 'website_value', default: false, description: 'Value from practice website' },
    { key: 'payer_value', label: 'Payer Value', type: 'text', column: 'payer_value', default: true, description: 'Value from payer directory' },
    { key: 'recommended_value', label: 'Recommended Value', type: 'text', column: 'recommended_value', default: false, description: 'Recommended correction' },
    { key: 'fix_via_caqh', label: 'Fix via CAQH', type: 'boolean', column: 'fix_via_caqh', default: true, description: 'Whether correction can be submitted through CAQH' },
    { key: 'fix_instructions', label: 'Fix Instructions', type: 'text', column: 'fix_instructions', default: false, description: 'Steps to correct the mismatch' },
    { key: 'priority', label: 'Priority', type: 'number', column: 'priority', default: true, filterable: true },
    { key: 'status', label: 'Status', type: 'text', column: 'status', default: true, filterable: true },
    { key: 'signal_type', label: 'Signal Type', type: 'text', column: 'signal_type', default: false, filterable: true, description: 'Type of detection signal' },
    { key: 'detection_count', label: 'Times Detected', type: 'number', column: 'detection_count', default: false, description: 'How many consecutive syncs found this mismatch' },
    { key: 'resolved_at', label: 'Resolved', type: 'datetime', column: 'resolved_at', default: false },
    { key: 'created_at', label: 'Detected', type: 'datetime', column: 'created_at', default: true, filterable: true },
  ],
  filters: [
    { key: 'npi', label: 'Provider NPI', type: 'text', column: 'npi', operator: 'eq' },
    { key: 'payer_code', label: 'Payer', type: 'multi_select', options: [
      { value: 'uhc', label: 'UnitedHealthcare' },
      { value: 'aetna', label: 'Aetna' },
      { value: 'cigna', label: 'Cigna' },
      { value: 'humana', label: 'Humana' },
      { value: 'bcbs_tx', label: 'BCBS TX' },
      { value: 'bcbs_ca', label: 'Blue Shield CA' },
    ], column: 'payer_code', operator: 'in' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'open', label: 'Open' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'wont_fix', label: "Won't Fix" },
    ], column: 'status', operator: 'eq' },
    { key: 'after', label: 'Detected After', type: 'date_range', column: 'created_at', operator: 'gte' },
    { key: 'before', label: 'Detected Before', type: 'date_range', column: 'created_at', operator: 'lte' },
  ],
  defaultSort: 'created_at',
  defaultSortDirection: 'desc',
  practiceScoped: true,
  practiceColumn: 'practice_website_id',
  exportFormats: ['csv', 'pdf'],
};

// ─── Report: Compliance Findings ────────────────────────────────────────────

export const COMPLIANCE_FINDINGS_REPORT: ReportDefinition = {
  type: 'compliance_findings',
  name: 'Compliance Findings',
  description: 'Website compliance scan results across SB 1188, HB 149, and AB 3030 with remediation status.',
  icon: 'Scale',
  baseTable: 'workflow_instances',
  baseSelect: `
    id,
    workflow_type,
    status,
    provider_npi,
    provider_name,
    finding_summary,
    finding_details,
    created_at,
    updated_at,
    completed_at,
    practice_id
  `,
  fields: [
    { key: 'id', label: 'Finding ID', type: 'text', column: 'id', default: false },
    { key: 'finding_summary', label: 'Finding', type: 'text', column: 'finding_summary', default: true, description: 'What was detected' },
    { key: 'status', label: 'Status', type: 'status', column: 'status', default: true, filterable: true, enumValues: WORKFLOW_STATUSES.map(s => s.value) },
    { key: 'compliance_category', label: 'Category', type: 'text', column: '_computed', default: true, filterable: true, description: 'Data Sovereignty, AI Transparency, or Clinical Integrity' },
    { key: 'regulation', label: 'Regulation', type: 'text', column: '_computed', default: true, description: 'SB 1188, HB 149, or AB 3030' },
    { key: 'severity', label: 'Severity', type: 'text', column: '_computed', default: true, description: 'Finding severity level' },
    { key: 'provider_npi', label: 'NPI', type: 'text', column: 'provider_npi', default: false, filterable: true },
    { key: 'provider_name', label: 'Provider', type: 'text', column: 'provider_name', default: false },
    { key: 'finding_details', label: 'Details', type: 'json', column: 'finding_details', default: false },
    { key: 'created_at', label: 'Detected', type: 'datetime', column: 'created_at', default: true, filterable: true },
    { key: 'completed_at', label: 'Resolved', type: 'datetime', column: 'completed_at', default: false },
  ],
  filters: [
    { key: 'status', label: 'Status', type: 'multi_select', options: WORKFLOW_STATUSES, column: 'status', operator: 'in' },
    { key: 'after', label: 'Detected After', type: 'date_range', column: 'created_at', operator: 'gte' },
    { key: 'before', label: 'Detected Before', type: 'date_range', column: 'created_at', operator: 'lte' },
  ],
  defaultSort: 'created_at',
  defaultSortDirection: 'desc',
  practiceScoped: true,
  practiceColumn: 'practice_id',
  exportFormats: ['csv', 'pdf'],
};

// ─── Registry ───────────────────────────────────────────────────────────────

export const REPORT_REGISTRY: Record<string, ReportDefinition> = {
  workflow_status: WORKFLOW_STATUS_REPORT,
  audit_trail: AUDIT_TRAIL_REPORT,
  provider_accuracy: PROVIDER_ACCURACY_REPORT,
  compliance_findings: COMPLIANCE_FINDINGS_REPORT,
};

/**
 * Returns a summary of all available report types for the field picker UI.
 * Includes report metadata and available fields/filters.
 */
export function getReportCatalog() {
  return Object.values(REPORT_REGISTRY).map(def => ({
    type: def.type,
    name: def.name,
    description: def.description,
    icon: def.icon,
    fields: def.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      default: f.default,
      description: f.description,
      filterable: f.filterable ?? false,
    })),
    filters: def.filters.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options,
    })),
    exportFormats: def.exportFormats,
  }));
}
