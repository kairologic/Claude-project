'use client';

import { useEffect, useState } from 'react';
import { colors, statusColors, statusBgColors, statusLabels, workflowTypeLabels } from '@/lib/design-tokens';
import FindingReview from './FindingReview';
import ApproveCorrection from './ApproveCorrection';
import SubmitNppes from './SubmitNppes';
import type { FindingDetails, TaskMetadata, WorkflowTask, WorkflowEvent } from '@/lib/types/dashboard-schema';

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
  finding_summary: string | null;
  finding_details: FindingDetails;
  created_at: string;
}

type ActiveView = 'main' | 'review_finding' | 'approve_correction' | 'submit_nppes';

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

/**
 * TODO: Replace MOCK_WORKFLOW with actual Supabase data fetch
 * Use supabase client to fetch WorkflowWithTasks data
 */
const MOCK_WORKFLOW: WorkflowData = {
  id: 'wf-123',
  workflow_type: 'nppes_update',
  status: 'action_needed',
  provider_name: 'Dr. Sarah Johnson',
  finding_summary: 'Address mismatch between website and NPPES',
  finding_details: {
    field: 'address',
    website_value: '123 Main St, Suite 100, Springfield, IL 62701',
    nppes_value: '123 Main St, Springfield, IL 62701',
  },
  created_at: new Date(Date.now() - 3600000).toISOString(),
};

const MOCK_TASKS: WorkflowTask[] = [
  {
    id: 'task-1',
    workflow_id: 'wf-123',
    task_order: 1,
    task_type: 'review_finding',
    title: 'Review Finding',
    description: 'Compare website value with NPPES record',
    status: 'active',
    assigned_to: null,
    completed_by: null,
    completed_at: null,
    confirmation_source: null,
    confirmed_at: null,
    confirmation_data: null,
    metadata: {
      comparison_data: {
        field: 'address',
        sources: [
          { source: 'website', value: '123 Main St, Suite 100, Springfield, IL 62701' },
          { source: 'nppes', value: '123 Main St, Springfield, IL 62701' },
        ],
      },
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'task-2',
    workflow_id: 'wf-123',
    task_order: 2,
    task_type: 'approve_correction',
    title: 'Approve Correction',
    description: 'Select the correct value and approve',
    status: 'pending',
    assigned_to: null,
    completed_by: null,
    completed_at: null,
    confirmation_source: null,
    confirmed_at: null,
    confirmation_data: null,
    metadata: {
      options: [
        { source: 'website', value: '123 Main St, Suite 100, Springfield, IL 62701' },
        { source: 'nppes', value: '123 Main St, Springfield, IL 62701' },
      ],
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'task-3',
    workflow_id: 'wf-123',
    task_order: 3,
    task_type: 'submit_nppes',
    title: 'Submit to NPPES',
    description: 'Submit the corrected form to NPPES',
    status: 'pending',
    assigned_to: null,
    completed_by: null,
    completed_at: null,
    confirmation_source: null,
    confirmed_at: null,
    confirmation_data: null,
    metadata: { portal_url: 'https://nppes.cms.hhs.gov/' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_EVENTS: WorkflowEvent[] = [
  {
    id: 'evt-1',
    workflow_id: 'wf-123',
    event_type: 'created',
    actor_id: 'system',
    actor_type: 'system',
    title: 'Workflow created',
    details: { source: 'nppes_sync' },
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'evt-2',
    workflow_id: 'wf-123',
    event_type: 'status_changed',
    actor_id: null,
    actor_type: 'system',
    title: 'Status changed to action_needed',
    details: { previous_status: 'in_progress', new_status: 'action_needed' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function WorkflowDetailPanel({ workflowId, practiceId, onClose }: WorkflowDetailPanelProps) {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch from Supabase instead of using mock data
    // const fetchWorkflowData = async () => {
    //   setIsLoading(true);
    //   try {
    //     const { data, error } = await supabase
    //       .from('workflow_instances')
    //       .select('*, workflow_tasks(*), workflow_events(*)')
    //       .eq('id', workflowId)
    //       .single();
    //     if (error) throw error;
    //     setWorkflow(data);
    //     setTasks(data.workflow_tasks);
    //     setEvents(data.workflow_events);
    //   } catch (err) {
    //     console.error('Failed to fetch workflow:', err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchWorkflowData();

    setIsLoading(true);
    setTimeout(() => {
      setWorkflow(MOCK_WORKFLOW);
      setTasks(MOCK_TASKS);
      setEvents(MOCK_EVENTS);
      setIsLoading(false);
    }, 300);
  }, [workflowId]);

  const typeInfo = workflow && workflowTypeLabels[workflow.workflow_type as keyof typeof workflowTypeLabels];
  const statusColor = workflow && statusColors[workflow.status as keyof typeof statusColors];
  const statusBg = workflow && statusBgColors[workflow.status as keyof typeof statusBgColors];
  const statusLabel = workflow && statusLabels[workflow.status as keyof typeof statusLabels];

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  function handleTaskClick(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTaskId(taskId);
      if (task.task_type === 'review_finding') {
        setActiveView('review_finding');
      } else if (task.task_type === 'approve_correction') {
        setActiveView('approve_correction');
      } else if (task.task_type === 'submit_nppes') {
        setActiveView('submit_nppes');
      }
    }
  }

  async function handleApproveCorrection(selectedValue: string, source: string) {
    // TODO: Call API to update workflow with approved value
    // const { error } = await supabase
    //   .from('workflow_instances')
    //   .update({ approved_value: selectedValue, approved_by: userId, approved_at: new Date() })
    //   .eq('id', workflowId);
    // if (error) throw error;
    console.log(`Approved value: ${selectedValue} from source: ${source}`);
    // Simulate success
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async function handleMarkSubmitted(submissionRef?: string) {
    // TODO: Call API to update workflow status to 'awaiting' and task to 'completed'
    // const { error } = await supabase
    //   .from('workflow_instances')
    //   .update({ status: 'awaiting' })
    //   .eq('id', workflowId);
    // if (error) throw error;
    // await supabase
    //   .from('workflow_tasks')
    //   .update({ status: 'completed', confirmation_data: { submission_ref: submissionRef } })
    //   .eq('workflow_id', workflowId)
    //   .eq('task_type', 'submit_nppes');
    console.log(`Marked as submitted. Ref: ${submissionRef || '(none)'}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Update local state
    setTasks((prev) => prev.map((t) =>
      t.task_type === 'submit_nppes' ? { ...t, status: 'completed' } : t
    ));
    if (workflow) {
      setWorkflow({ ...workflow, status: 'awaiting' });
    }
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
                      background: statusBg,
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
            ×
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
              <div style={{
                marginBottom: 24,
              }}>
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
                          color: TASK_STATUS_COLORS[task.status],
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {TASK_STATUS_ICONS[task.status]}
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
                      {/* Timeline line */}
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
            </>
          )}

          {activeView === 'review_finding' && workflow && (
            <FindingReview
              finding={workflow.finding_details}
              comparisonData={activeTask?.metadata?.comparison_data}
              onProceedToApprove={() => setActiveView('approve_correction')}
            />
          )}

          {activeView === 'approve_correction' && workflow && (
            <ApproveCorrection
              workflowId={workflowId}
              finding={workflow.finding_details}
              options={activeTask?.metadata?.options}
              onApprove={handleApproveCorrection}
              onBack={() => setActiveView('review_finding')}
            />
          )}

          {activeView === 'submit_nppes' && workflow && (
            <SubmitNppes
              workflowId={workflowId}
              providerName={workflow.provider_name}
              portalUrl={activeTask?.metadata?.portal_url || 'https://nppes.cms.hhs.gov/'}
              pdfUrl={`/api/workflows/${workflowId}/generate-pdf`}
              onMarkSubmitted={handleMarkSubmitted}
              onBack={() => setActiveView('approve_correction')}
            />
          )}
        </div>
      </div>
    </>
  );
}
