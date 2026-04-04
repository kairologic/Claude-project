'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  colors,
  statusColors,
  statusBgColors,
  statusLabels,
  workflowTypeLabels,
  shadows,
  transitions,
  radii,
  spacing,
  typography,
} from '@/lib/design-tokens';
import { LoadingSpinner, Skeleton } from './ui';
import FindingReview from './FindingReview';
import ApproveCorrection from './ApproveCorrection';
import SubmitNppes from './SubmitNppes';
import PayerMismatchReview from './PayerMismatchReview';
import CredentialingChecklist from './CredentialingChecklist';
import DepartureChecklist from './DepartureChecklist';
import ComplianceFinding from './ComplianceFinding';
import { CorrectionValuePair } from '@/components/workflows/CorrectionValuePair';
import { CorrectionLink, type DeepLinkData } from '@/components/workflows/CorrectionLink';
import VerificationBadge from '@/components/workflows/VerificationBadge';
import VerificationTimeline from '@/components/workflows/VerificationTimeline';
import MarkAsSubmitted from '@/components/workflows/MarkAsSubmitted';
import type { FindingDetails, WorkflowTask, WorkflowEvent } from '@/lib/types/dashboard-schema';

interface WorkflowDetailPanelProps {
  workflowId: string;
  practiceId: string;
  onClose: () => void;
}

interface WorkflowData {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  provider_npi: string | null;
  finding_summary: string | null;
  finding_details: FindingDetails;
  approved_value: string | null;
  created_at: string;
  practice_id?: string;
  // Guided Correction Engine verification fields
  verification_status?: string;
  verification_attempts?: number;
  correction_submitted_at?: string | null;
  last_verification_at?: string | null;
  verified_fixed_at?: string | null;
  approved_source?: string | null;
}

// Map DB task_type → view name
// DB uses 'review_approve' (combined) instead of separate review/approve tasks
type ActiveView =
  | 'main'
  | 'review_finding'
  | 'approve_correction'
  | 'submit_nppes'
  | 'download_form'
  | 'monitor'
  | 'payer_mismatch_review'
  | 'credentialing_checklist'
  | 'departure_checklist'
  | 'compliance_finding';

const TASK_TYPE_TO_VIEW: Record<string, ActiveView> = {
  // NPPES Update
  review_approve: 'review_finding',
  review_finding: 'review_finding',
  approve_correction: 'approve_correction',
  download_form: 'download_form',
  submit_nppes: 'submit_nppes',
  monitor_auto_confirm: 'monitor',
  // Payer Directory
  review_payer_finding: 'payer_mismatch_review',
  update_caqh: 'payer_mismatch_review',
  verify_payer: 'payer_mismatch_review',
  confirm_payer: 'monitor',
  // Onboarding
  npi_lookup: 'credentialing_checklist',
  update_website: 'credentialing_checklist',
  enroll_caqh: 'credentialing_checklist',
  credential_payers: 'credentialing_checklist',
  enroll_pecos: 'credentialing_checklist',
  monitor_credentialing: 'credentialing_checklist',
  // Release
  remove_website: 'departure_checklist',
  update_nppes_release: 'departure_checklist',
  notify_payers: 'departure_checklist',
  update_pecos_release: 'departure_checklist',
  monitor_removal: 'departure_checklist',
  // Compliance
  show_finding: 'compliance_finding',
  provide_template: 'compliance_finding',
  rescan_confirm: 'compliance_finding',
};

const TASK_STATUS_ICONS: Record<string, string> = {
  pending: '○',
  active: '◐',
  completed: '✓',
  skipped: '−',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: colors.gray400,
  active: colors.gold,
  completed: colors.green,
  skipped: colors.gray300,
};

export default function WorkflowDetailPanel({
  workflowId,
  practiceId,
  onClose,
}: WorkflowDetailPanelProps) {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const fetchWorkflowData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load workflow' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setWorkflow(data.workflow);
      setTasks(data.tasks || []);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch workflow:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  const typeInfo =
    workflow && workflowTypeLabels[workflow.workflow_type as keyof typeof workflowTypeLabels];
  const statusColor = workflow && statusColors[workflow.status as keyof typeof statusColors];
  const statusBg = workflow && statusBgColors[workflow.status as keyof typeof statusBgColors];
  const statusLabel = workflow && statusLabels[workflow.status as keyof typeof statusLabels];

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  // For review_approve combined task, also find it when in approve_correction view
  const reviewApproveTask = tasks.find((t) => t.task_type === 'review_approve');

  function handleTaskClick(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTaskId(taskId);
      const view = TASK_TYPE_TO_VIEW[task.task_type];
      if (view) {
        setActiveView(view);
      }
    }
  }

  async function handleApproveCorrection(selectedValue: string, source: string) {
    // Update workflow with approved value
    const [wfRes, taskRes] = await Promise.all([
      fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_value: selectedValue,
          approved_at: new Date().toISOString(),
          status: 'in_progress',
        }),
      }),
      // Mark the review_approve or approve_correction task as completed
      activeTaskId
        ? fetch(`/api/workflows/${workflowId}/tasks/${activeTaskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: {
                ...(activeTask?.metadata || {}),
                approved_value: selectedValue,
                approved_source: source,
              },
            }),
          })
        : Promise.resolve(null),
    ]);

    if (!wfRes.ok) {
      const err = await wfRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save approval');
    }

    // Refresh data to get updated statuses
    await fetchWorkflowData();
  }

  async function handleMarkSubmitted(submissionRef?: string) {
    const submitTask = tasks.find((t) => t.task_type === 'submit_nppes');

    const [wfRes] = await Promise.all([
      fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'awaiting' }),
      }),
      submitTask
        ? fetch(`/api/workflows/${workflowId}/tasks/${submitTask.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              completed_at: new Date().toISOString(),
              confirmation_data: submissionRef ? { submission_ref: submissionRef } : {},
            }),
          })
        : Promise.resolve(null),
    ]);

    if (!wfRes.ok) {
      const err = await wfRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update status');
    }

    // Update local state immediately for responsive UI
    setTasks((prev) =>
      prev.map((t) => (t.task_type === 'submit_nppes' ? { ...t, status: 'completed' } : t)),
    );
    if (workflow) {
      setWorkflow({ ...workflow, status: 'awaiting' });
    }
  }

  // Build verification timeline events from workflow data
  function buildVerificationTimeline() {
    if (!workflow) return [];
    const timelineEvents: Array<{
      date: string;
      description: string;
      type:
        | 'detection'
        | 'submission'
        | 'verification_pass'
        | 'verification_fail'
        | 'escalation'
        | 'archive';
    }> = [];

    // Detection event (workflow creation)
    timelineEvents.push({
      date: workflow.created_at,
      description: workflow.finding_summary || 'Data discrepancy detected',
      type: 'detection',
    });

    // Submission event
    if (workflow.correction_submitted_at) {
      timelineEvents.push({
        date: workflow.correction_submitted_at,
        description: 'Correction submitted for verification',
        type: 'submission',
      });
    }

    // Verification result events
    if (workflow.verification_status === 'verified_fixed' && workflow.verified_fixed_at) {
      timelineEvents.push({
        date: workflow.verified_fixed_at,
        description: 'Correction verified — data now matches',
        type: 'verification_pass',
      });
    } else if (
      workflow.verification_status === 'still_mismatched' &&
      workflow.last_verification_at
    ) {
      timelineEvents.push({
        date: workflow.last_verification_at,
        description: `Verification attempt ${workflow.verification_attempts || 0} — still mismatched`,
        type: 'verification_fail',
      });
    } else if (workflow.verification_status === 'escalated') {
      timelineEvents.push({
        date: workflow.last_verification_at || new Date().toISOString(),
        description: 'Auto-verification exhausted — escalated for manual review',
        type: 'escalation',
      });
    }

    return timelineEvents;
  }

  // Determine external system and correction type from workflow data
  function getCorrectionContext(): {
    systemName: string;
    correctionType: string;
    deepLink: DeepLinkData | null;
  } {
    if (!workflow) return { systemName: '', correctionType: '', deepLink: null };

    const fd = workflow.finding_details;
    let systemName = 'NPPES';
    let correctionType = 'address';

    if (workflow.workflow_type === 'nppes_update') {
      systemName = 'NPPES';
      correctionType =
        fd?.field === 'phone' ? 'contact' : fd?.field === 'taxonomy' ? 'taxonomy' : 'address';
    } else if (workflow.workflow_type === 'payer_directory') {
      systemName = fd?.payer_name || 'CAQH';
      correctionType = 'profile';
    }

    // Build a deep link data structure from finding details metadata
    const deepLink: DeepLinkData | null = fd?.deep_link
      ? {
          url_template: fd.deep_link.url_template || '',
          display_label: fd.deep_link.display_label || `Open ${systemName}`,
          instructions: fd.deep_link.instructions || [],
          icon: fd.deep_link.icon || '',
        }
      : null;

    return { systemName, correctionType, deepLink };
  }

  const verificationStatus = workflow?.verification_status || 'pending';
  const verificationTimeline = buildVerificationTimeline();
  const correctionContext = getCorrectionContext();

  // Get finding data from workflow or the review task metadata
  function getFindingForReview() {
    if (!workflow)
      return { finding: {} as FindingDetails, comparisonData: undefined, options: undefined };

    const finding = workflow.finding_details;
    const task = activeTask || reviewApproveTask;
    const meta = task?.metadata || {};

    const comparisonData =
      meta.comparison_data ||
      (finding.website_value && finding.nppes_value
        ? {
            field: finding.field || 'unknown',
            sources: [
              { source: 'Website', value: finding.website_value },
              { source: 'NPPES', value: finding.nppes_value },
            ],
          }
        : undefined);

    const options =
      meta.options ||
      (finding.website_value && finding.nppes_value
        ? [
            { source: 'website', value: finding.website_value },
            { source: 'nppes', value: finding.nppes_value },
          ]
        : undefined);

    return { finding, comparisonData, options };
  }

  return (
    <>
      {/* Dark overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 99,
        }}
      />

      {/* Side panel */}
      <div
        role="dialog"
        aria-label="Workflow details panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 500,
          background: colors.white,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: shadows.xl,
          animation: 'slideInPanel 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideInPanel {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            borderBottom: `1px solid ${colors.gray200}`,
            padding: spacing.lg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: spacing.md,
          }}
        >
          <div style={{ flex: 1 }}>
            {isLoading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <LoadingSpinner size={24} />
                <div style={{ ...typography.bodySmall, color: colors.gray400 }}>
                  Loading workflow...
                </div>
              </div>
            ) : fetchError ? (
              <div style={{ ...typography.bodySmall, color: colors.red }}>
                Error: {fetchError}
                <button
                  onClick={fetchWorkflowData}
                  style={{
                    marginLeft: spacing.xs,
                    color: colors.blue,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    ...typography.bodySmall,
                    textDecoration: 'underline',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : workflow ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  {typeInfo && (
                    <div
                      style={{
                        ...typography.label,
                        background: colors.goldPale,
                        color: colors.gold,
                        padding: `2px ${spacing.sm}px`,
                        borderRadius: radii.sm,
                      }}
                    >
                      {typeInfo.label}
                    </div>
                  )}
                  {statusColor && (
                    <div
                      style={{
                        ...typography.label,
                        background: statusBg || undefined,
                        color: statusColor,
                        padding: `2px ${spacing.sm}px`,
                        borderRadius: radii.sm,
                      }}
                    >
                      {statusLabel}
                    </div>
                  )}
                  {workflow.verification_status && workflow.verification_status !== 'pending' && (
                    <VerificationBadge
                      verificationStatus={workflow.verification_status as any}
                      verificationAttempts={workflow.verification_attempts}
                    />
                  )}
                </div>
                <div
                  style={{
                    ...typography.h3,
                    color: colors.navy,
                  }}
                >
                  {workflow.provider_name || 'Unknown Provider'}
                </div>
                <div
                  style={{
                    ...typography.bodySmall,
                    color: colors.gray600,
                    marginTop: spacing.xs,
                    lineHeight: 1.4,
                  }}
                >
                  {workflow.finding_summary || 'No summary'}
                </div>
              </>
            ) : null}
          </div>

          <button
            onClick={onClose}
            aria-label="Close workflow details"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: colors.gray400,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              transition: `color ${transitions.fast}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.navy)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.gray400)}
          >
            &times;
          </button>
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: spacing.lg,
          }}
        >
          {activeView === 'main' && (
            <>
              {/* Task checklist */}
              <div style={{ marginBottom: spacing['2xl'] }}>
                <div
                  style={{
                    ...typography.label,
                    color: colors.gray400,
                    marginBottom: spacing.sm,
                  }}
                >
                  Tasks
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                  }}
                >
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      style={{
                        background: colors.white,
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: radii.sm,
                        padding: spacing.sm,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: `all ${transitions.base}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: spacing.sm,
                        boxShadow: shadows.xs,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.gray50;
                        e.currentTarget.style.borderColor = colors.blue;
                        e.currentTarget.style.boxShadow = shadows.md;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.white;
                        e.currentTarget.style.borderColor = colors.gray200;
                        e.currentTarget.style.boxShadow = shadows.xs;
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: TASK_STATUS_COLORS[task.status] || colors.gray400,
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {TASK_STATUS_ICONS[task.status] || '○'}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            ...typography.body,
                            fontWeight: 700,
                            color: colors.navy,
                            marginBottom: 2,
                          }}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div
                            style={{
                              ...typography.caption,
                              color: colors.gray600,
                            }}
                          >
                            {task.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Correction Value Pair — shows incorrect vs correct when approved */}
              {workflow && workflow.approved_value && workflow.finding_details && (
                <div style={{ marginBottom: spacing['2xl'] }}>
                  <div
                    style={{
                      ...typography.label,
                      color: colors.gray400,
                      marginBottom: spacing.sm,
                    }}
                  >
                    Correction Details
                  </div>
                  <CorrectionValuePair
                    fieldLabel={workflow.finding_details.field || 'Field'}
                    incorrectValue={
                      workflow.finding_details.nppes_value ||
                      workflow.finding_details.current_value ||
                      '—'
                    }
                    correctValue={workflow.approved_value}
                    source={workflow.workflow_type === 'nppes_update' ? 'NPPES' : 'Payer Directory'}
                    verifiedAt={workflow.verified_fixed_at || undefined}
                  />

                  {/* Deep Link + Instructions */}
                  {correctionContext.deepLink && (
                    <div style={{ marginTop: spacing.md }}>
                      <CorrectionLink
                        systemName={correctionContext.systemName}
                        correctionType={correctionContext.correctionType}
                        npi={workflow.provider_npi || undefined}
                        providerName={workflow.provider_name || undefined}
                        correctValue={workflow.approved_value}
                        deepLink={correctionContext.deepLink}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Mark as Submitted + Verification Status */}
              {workflow && workflow.approved_value && (
                <div style={{ marginBottom: spacing['2xl'] }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      flexWrap: 'wrap',
                    }}
                  >
                    <MarkAsSubmitted
                      workflowId={workflowId}
                      practiceId={practiceId}
                      currentStatus={verificationStatus}
                      onStatusChange={() => fetchWorkflowData()}
                    />
                    <VerificationBadge
                      verificationStatus={verificationStatus as any}
                      verificationAttempts={workflow.verification_attempts}
                    />
                  </div>
                </div>
              )}

              {/* Verification Timeline */}
              {verificationTimeline.length > 1 && (
                <div style={{ marginBottom: spacing['2xl'] }}>
                  <div
                    style={{
                      ...typography.label,
                      color: colors.gray400,
                      marginBottom: spacing.sm,
                    }}
                  >
                    Verification History
                  </div>
                  <VerificationTimeline events={verificationTimeline} />
                </div>
              )}

              {/* Timeline/Events */}
              {events.length > 0 && (
                <div role="region" aria-label="Activity timeline">
                  <div
                    style={{
                      ...typography.label,
                      color: colors.gray400,
                      marginBottom: spacing.sm,
                    }}
                  >
                    Activity
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.sm,
                    }}
                  >
                    {events.map((event, idx) => (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          gap: spacing.sm,
                        }}
                      >
                        {idx < events.length - 1 && (
                          <div
                            style={{
                              position: 'relative',
                              width: 2,
                              background: colors.gray300,
                              marginLeft: 6,
                              marginRight: 0,
                            }}
                          />
                        )}

                        <div
                          style={{
                            minWidth: 14,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: colors.blue,
                            border: `2px solid ${colors.white}`,
                            boxShadow: `0 0 0 1px ${colors.gray300}`,
                            marginTop: 2,
                          }}
                        />

                        <div style={{ paddingBottom: spacing.sm, flex: 1 }}>
                          <div
                            style={{
                              ...typography.body,
                              fontWeight: 600,
                              color: colors.navy,
                              marginBottom: 2,
                            }}
                          >
                            {event.title}
                          </div>
                          <div
                            style={{
                              ...typography.caption,
                              color: colors.gray400,
                            }}
                          >
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Review Finding view — handles both 'review_finding' and 'review_approve' DB task types */}
          {activeView === 'review_finding' &&
            workflow &&
            (() => {
              const { finding, comparisonData } = getFindingForReview();
              return (
                <FindingReview
                  finding={finding}
                  comparisonData={comparisonData}
                  onProceedToApprove={() => setActiveView('approve_correction')}
                />
              );
            })()}

          {/* Approve Correction view */}
          {activeView === 'approve_correction' &&
            workflow &&
            (() => {
              const { finding, options } = getFindingForReview();
              return (
                <ApproveCorrection
                  workflowId={workflowId}
                  finding={finding}
                  options={options}
                  onApprove={handleApproveCorrection}
                  onBack={() => setActiveView('review_finding')}
                />
              );
            })()}

          {/* Download Form view — shows PDF download inline */}
          {activeView === 'download_form' && workflow && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.lg,
                padding: `${spacing.lg}px 0`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40 }}>&#128196;</div>
              <div>
                <div style={{ ...typography.h2, color: colors.navy, marginBottom: spacing.xs }}>
                  Download NPPES Form
                </div>
                <div style={{ ...typography.body, color: colors.gray600, lineHeight: 1.5 }}>
                  The pre-filled PDF correction form is ready for download.
                </div>
              </div>
              <a
                href={`/api/workflows/nppes-form?workflowId=${workflowId}`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  background: colors.green,
                  color: colors.white,
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  borderRadius: radii.md,
                  textDecoration: 'none',
                  ...typography.body,
                  fontWeight: 700,
                  transition: `all ${transitions.fast}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                &#128229; Download PDF Form
              </a>
              <button
                onClick={() => setActiveView('main')}
                style={{
                  background: colors.gray200,
                  color: colors.navy,
                  border: 'none',
                  borderRadius: radii.md,
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  ...typography.body,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: spacing.sm,
                  transition: `all ${transitions.fast}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.gray300)}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.gray200)}
              >
                &larr; Back to tasks
              </button>
            </div>
          )}

          {/* Submit to NPPES view */}
          {activeView === 'submit_nppes' && workflow && (
            <SubmitNppes
              workflowId={workflowId}
              providerName={workflow.provider_name}
              portalUrl={activeTask?.metadata?.portal_url || 'https://nppes.cms.hhs.gov/'}
              pdfUrl={`/api/workflows/nppes-form?workflowId=${workflowId}`}
              onMarkSubmitted={handleMarkSubmitted}
              onBack={() => setActiveView('main')}
            />
          )}

          {/* Monitor view — read-only status */}
          {activeView === 'monitor' && workflow && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.lg,
                padding: `${spacing.lg}px 0`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40 }}>&#128225;</div>
              <div>
                <div style={{ ...typography.h2, color: colors.navy, marginBottom: spacing.xs }}>
                  {workflow.workflow_type === 'payer_directory'
                    ? 'Monitoring Payer Directories'
                    : 'Monitoring NPPES'}
                </div>
                <div
                  style={{
                    ...typography.body,
                    color: colors.gray600,
                    lineHeight: 1.5,
                    maxWidth: 320,
                  }}
                >
                  {workflow.workflow_type === 'payer_directory'
                    ? 'KairoLogic is automatically monitoring payer directories via FHIR to confirm the update has propagated. This typically takes 1-2 weeks.'
                    : 'KairoLogic is automatically monitoring the NPPES registry for confirmation that the update has been applied. This typically takes 1-2 weeks.'}
                </div>
              </div>
              {Boolean(activeTask?.metadata?.expected_value) && (
                <div
                  style={{
                    background: colors.bluePale,
                    border: `1px solid ${colors.blue}`,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    ...typography.body,
                    color: colors.navy,
                    maxWidth: 340,
                  }}
                >
                  <strong>Expected value:</strong>
                  <br />
                  {String(activeTask?.metadata?.expected_value ?? '')}
                </div>
              )}
              <button
                onClick={() => setActiveView('main')}
                style={{
                  background: colors.gray200,
                  color: colors.navy,
                  border: 'none',
                  borderRadius: radii.md,
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  ...typography.body,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: spacing.sm,
                  transition: `all ${transitions.fast}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.gray300)}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.gray200)}
              >
                &larr; Back to tasks
              </button>
            </div>
          )}

          {/* Payer Mismatch Review */}
          {activeView === 'payer_mismatch_review' &&
            workflow &&
            (() => {
              const { finding, comparisonData } = getFindingForReview();
              return (
                <PayerMismatchReview
                  workflowId={workflowId}
                  finding={finding}
                  comparisonData={comparisonData}
                  onBack={() => setActiveView('main')}
                />
              );
            })()}

          {/* Credentialing Checklist (Onboarding) */}
          {activeView === 'credentialing_checklist' && workflow && (
            <CredentialingChecklist
              workflowId={workflowId}
              providerName={workflow.provider_name}
              tasks={tasks}
              onTaskAction={async (taskId, action) => {
                if (action === 'complete') {
                  await fetch(`/api/workflows/${workflowId}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                    }),
                  });
                  await fetchWorkflowData();
                }
              }}
              onBack={() => setActiveView('main')}
            />
          )}

          {/* Departure Checklist (Release) */}
          {activeView === 'departure_checklist' && workflow && (
            <DepartureChecklist
              workflowId={workflowId}
              providerName={workflow.provider_name}
              tasks={tasks}
              onTaskAction={async (taskId, action) => {
                if (action === 'complete') {
                  await fetch(`/api/workflows/${workflowId}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                    }),
                  });
                  await fetchWorkflowData();
                }
              }}
              onBack={() => setActiveView('main')}
            />
          )}

          {/* Compliance Finding */}
          {activeView === 'compliance_finding' && workflow && (
            <ComplianceFinding
              workflowId={workflowId}
              finding={workflow.finding_details}
              providerName={workflow.provider_name}
              tasks={tasks}
              onTaskAction={async (taskId, action) => {
                if (action === 'complete') {
                  await fetch(`/api/workflows/${workflowId}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                    }),
                  });
                  await fetchWorkflowData();
                }
              }}
              onBack={() => setActiveView('main')}
            />
          )}
        </div>
      </div>
    </>
  );
}
