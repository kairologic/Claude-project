'use client';

import { useEffect, useState, useCallback } from 'react';
import { colors, statusColors, statusBgColors, statusLabels, workflowTypeLabels } from '@/lib/design-tokens';
import FindingReview from './FindingReview';
import ApproveCorrection from './ApproveCorrection';
import SubmitNppes from './SubmitNppes';
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
}

// Map DB task_type → view name
// DB uses 'review_approve' (combined) instead of separate review/approve tasks
type ActiveView = 'main' | 'review_finding' | 'approve_correction' | 'submit_nppes' | 'download_form' | 'monitor';

const TASK_TYPE_TO_VIEW: Record<string, ActiveView> = {
  review_approve: 'review_finding',
  review_finding: 'review_finding',
  approve_correction: 'approve_correction',
  download_form: 'download_form',
  submit_nppes: 'submit_nppes',
  monitor_auto_confirm: 'monitor',
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

export default function WorkflowDetailPanel({ workflowId, practiceId, onClose }: WorkflowDetailPanelProps) {
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

  const typeInfo = workflow && workflowTypeLabels[workflow.workflow_type as keyof typeof workflowTypeLabels];
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
    setTasks((prev) => prev.map((t) =>
      t.task_type === 'submit_nppes' ? { ...t, status: 'completed' } : t
    ));
    if (workflow) {
      setWorkflow({ ...workflow, status: 'awaiting' });
    }
  }

  // Get finding data from workflow or the review task metadata
  function getFindingForReview() {
    if (!workflow) return { finding: {} as FindingDetails, comparisonData: undefined, options: undefined };

    const finding = workflow.finding_details;
    const task = activeTask || reviewApproveTask;
    const meta = task?.metadata || {};

    const comparisonData = meta.comparison_data || (finding.website_value && finding.nppes_value
      ? {
          field: finding.field || 'unknown',
          sources: [
            { source: 'Website', value: finding.website_value },
            { source: 'NPPES', value: finding.nppes_value },
          ],
        }
      : undefined);

    const options = meta.options || (finding.website_value && finding.nppes_value
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
          boxShadow: '-2px 0 8px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
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
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            {isLoading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: colors.gray400 }}>Loading...</div>
              </div>
            ) : fetchError ? (
              <div style={{ color: colors.red, fontSize: 12 }}>
                Error: {fetchError}
                <button onClick={fetchWorkflowData} style={{
                  marginLeft: 8, color: colors.blue, background: 'none',
                  border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline',
                }}>
                  Retry
                </button>
              </div>
            ) : workflow ? (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}>
                  {typeInfo && (
                    <div style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: colors.goldPale,
                      color: colors.gold,
                      padding: '2px 8px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {typeInfo.label}
                    </div>
                  )}
                  {statusColor && (
                    <div style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: statusBg || undefined,
                      color: statusColor,
                      padding: '2px 8px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {statusLabel}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.navy,
                }}>
                  {workflow.provider_name || 'Unknown Provider'}
                </div>
                <div style={{
                  fontSize: 12,
                  color: colors.gray600,
                  marginTop: 6,
                  lineHeight: 1.4,
                }}>
                  {workflow.finding_summary || 'No summary'}
                </div>
              </>
            ) : null}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: colors.gray400,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          }}
        >
          {activeView === 'main' && (
            <>
              {/* Task checklist */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: colors.gray400,
                  marginBottom: 10,
                }}>
                  Tasks
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      style={{
                        background: colors.white,
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 6,
                        padding: 10,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.gray50;
                        e.currentTarget.style.borderColor = colors.blue;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.white;
                        e.currentTarget.style.borderColor = colors.gray200;
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
                        <div style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: colors.navy,
                          marginBottom: 2,
                        }}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{
                            fontSize: 11,
                            color: colors.gray600,
                          }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline/Events */}
              {events.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: colors.gray400,
                    marginBottom: 10,
                  }}>
                    Activity
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    {events.map((event, idx) => (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          gap: 10,
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

                        <div style={{ paddingBottom: 12, flex: 1 }}>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.navy,
                            marginBottom: 2,
                          }}>
                            {event.title}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: colors.gray400,
                          }}>
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
          {activeView === 'review_finding' && workflow && (() => {
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
          {activeView === 'approve_correction' && workflow && (() => {
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>&#128196;</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.navy, marginBottom: 6 }}>
                  Download NPPES Form
                </div>
                <div style={{ fontSize: 12, color: colors.gray600, lineHeight: 1.5 }}>
                  The pre-filled PDF correction form is ready for download.
                </div>
              </div>
              <a
                href={`/api/workflows/nppes-form?workflowId=${workflowId}`}
                download
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: colors.green, color: colors.white,
                  padding: '10px 20px', borderRadius: 6, textDecoration: 'none',
                  fontWeight: 700, fontSize: 13,
                }}
              >
                &#128229; Download PDF Form
              </a>
              <button
                onClick={() => setActiveView('main')}
                style={{
                  background: colors.gray200, color: colors.navy, border: 'none',
                  borderRadius: 6, padding: '10px 16px', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', marginTop: 8,
                }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>&#128225;</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.navy, marginBottom: 6 }}>
                  Monitoring NPPES
                </div>
                <div style={{ fontSize: 12, color: colors.gray600, lineHeight: 1.5, maxWidth: 320 }}>
                  KairoLogic is automatically monitoring the NPPES registry for confirmation that the update has been applied. This typically takes 1-2 weeks.
                </div>
              </div>
              {activeTask?.metadata?.expected_value && (
                <div style={{
                  background: colors.bluePale, border: `1px solid ${colors.blue}`,
                  borderRadius: 6, padding: 12, fontSize: 12, color: colors.navy, maxWidth: 340,
                }}>
                  <strong>Expected value:</strong><br />
                  {activeTask.metadata.expected_value as string}
                </div>
              )}
              <button
                onClick={() => setActiveView('main')}
                style={{
                  background: colors.gray200, color: colors.navy, border: 'none',
                  borderRadius: 6, padding: '10px 16px', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', marginTop: 8,
                }}
              >
                &larr; Back to tasks
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
