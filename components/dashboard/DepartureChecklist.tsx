'use client';

import { useState } from 'react';
import { colors, credentialingGroupLabels, payerPortals } from '@/lib/design-tokens';
import type { WorkflowTask } from '@/lib/types/dashboard-schema';

interface DepartureChecklistProps {
  workflowId: string;
  providerName: string | null;
  tasks: WorkflowTask[];
  onTaskAction: (taskId: string, action: string) => Promise<void>;
  onBack: () => void;
}

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
 * DepartureChecklist — for provider release workflows.
 * Similar to CredentialingChecklist but focused on removal tasks.
 * Shows a 90-day phantom listing monitoring status.
 */
export default function DepartureChecklist({
  workflowId,
  providerName,
  tasks,
  onTaskAction,
  onBack,
}: DepartureChecklistProps) {
  const [actioningTask, setActioningTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group tasks by their metadata.group
  const grouped: Record<string, WorkflowTask[]> = {};
  for (const task of tasks) {
    const group = (task.metadata?.group as string) || 'immediate';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(task);
  }

  const groupOrder = ['immediate', 'submit_wait', 'monitoring'];

  function getPortalForTask(taskType: string): { name: string; url: string } | null {
    const map: Record<string, string> = {
      update_nppes_release: 'nppes',
      notify_payers: 'caqh',
      update_pecos_release: 'pecos',
    };
    const key = map[taskType];
    if (key && payerPortals[key]) {
      return { name: payerPortals[key].name, url: payerPortals[key].url };
    }
    return null;
  }

  async function handleAction(taskId: string, action: string) {
    setError(null);
    setActioningTask(taskId);
    try {
      await onTaskAction(taskId, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioningTask(null);
    }
  }

  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Check if monitoring task is active
  const monitorTask = tasks.find(t => t.task_type === 'monitor_removal');
  const isMonitoring = monitorTask?.status === 'active';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: '16px 0',
    }}>
      {/* Header */}
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.gray400,
          marginBottom: 6,
        }}>
          Provider departure
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.navy,
        }}>
          Departure Checklist
        </div>
        {providerName && (
          <div style={{
            fontSize: 12,
            color: colors.gray600,
            marginTop: 4,
          }}>
            Departing provider: <strong style={{ color: colors.red }}>{providerName}</strong>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: colors.gray600,
          marginBottom: 6,
        }}>
          <span>{completedCount} of {tasks.length} tasks complete</span>
          <span style={{ fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{
          height: 6,
          background: colors.gray200,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: progress === 100 ? colors.green : colors.red,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Phantom listing warning */}
      {isMonitoring && (
        <div style={{
          background: colors.redPale,
          border: `1px solid ${colors.red}`,
          borderRadius: 8,
          padding: 14,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <div style={{ fontSize: 20 }}>&#128680;</div>
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.red,
              marginBottom: 4,
            }}>
              Phantom listing monitoring active
            </div>
            <div style={{
              fontSize: 11,
              color: colors.gray600,
              lineHeight: 1.5,
            }}>
              KairoLogic is monitoring payer directories for 90 days to ensure {providerName || 'this provider'} no
              longer appears. Phantom listings can cause misdirected patients and compliance issues.
            </div>
          </div>
        </div>
      )}

      {/* Task groups */}
      {groupOrder.map((groupKey) => {
        const groupTasks = grouped[groupKey];
        if (!groupTasks || groupTasks.length === 0) return null;
        const groupInfo = credentialingGroupLabels[groupKey] || {
          label: groupKey,
          icon: '📋',
          description: '',
        };

        return (
          <div key={groupKey}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 14 }}>{groupInfo.icon}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: colors.gray600,
              }}>
                {groupInfo.label}
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {groupTasks.map((task) => {
                const portal = getPortalForTask(task.task_type);
                const isActioning = actioningTask === task.id;

                return (
                  <div
                    key={task.id}
                    style={{
                      background: colors.white,
                      border: `1px solid ${task.status === 'active' ? colors.gold : colors.gray200}`,
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: TASK_STATUS_COLORS[task.status] || colors.gray400,
                      minWidth: 20,
                      textAlign: 'center',
                      marginTop: 1,
                    }}>
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
                          marginBottom: 6,
                          lineHeight: 1.4,
                        }}>
                          {task.description}
                        </div>
                      )}

                      {task.status === 'active' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {portal && (
                            <a
                              href={portal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: colors.blue,
                                color: colors.white,
                                padding: '4px 10px',
                                borderRadius: 4,
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: 10,
                              }}
                            >
                              Open {portal.name}
                            </a>
                          )}
                          <button
                            onClick={() => handleAction(task.id, 'complete')}
                            disabled={isActioning}
                            style={{
                              background: colors.green,
                              color: colors.white,
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 10px',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: isActioning ? 'not-allowed' : 'pointer',
                              opacity: isActioning ? 0.6 : 1,
                            }}
                          >
                            {isActioning ? 'Updating...' : 'Mark complete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Error */}
      {error && (
        <div style={{
          background: colors.redPale,
          border: `1px solid ${colors.red}`,
          borderRadius: 6,
          padding: 10,
          fontSize: 12,
          color: colors.red,
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: colors.gray200,
          color: colors.navy,
          border: 'none',
          borderRadius: 6,
          padding: '10px 16px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        &larr; Back to tasks
      </button>
    </div>
  );
}
