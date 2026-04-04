/**
 * components/dashboard/CredentialingTimeline.tsx
 *
 * Horizontal timeline visualization for credentialing workflows.
 * Shows progress through stages (Assessment → CAQH → Payers → ... → Complete).
 * Compact height (~70px), all inline styles.
 */

'use client';

import { colors } from '@/lib/design-tokens';

interface Task {
  task_type: string;
  status: string;
  metadata?: any;
}

interface CredentialingTimelineProps {
  workflowType: 'credentialing_onboarding' | 'credentialing_departure';
  tasks: Task[];
  estimatedWeeks?: number;
  createdAt?: string;
}

// ─── Stage definitions ──────────────────────────────────────────────────────

interface Stage {
  key: string;
  label: string;
  taskTypes: string[];
}

const ONBOARDING_STAGES: Stage[] = [
  { key: 'assessment', label: 'ASSESS', taskTypes: ['data_snapshot'] },
  { key: 'caqh', label: 'CAQH', taskTypes: ['correction_caqh'] },
  { key: 'nppes', label: 'NPPES', taskTypes: ['correction_nppes'] },
  { key: 'payers', label: 'PAYERS', taskTypes: ['submit_payer_enrollment'] },
  { key: 'pecos', label: 'PECOS', taskTypes: ['submit_pecos'] },
  {
    key: 'monitoring',
    label: 'MONITOR',
    taskTypes: [
      'monitor_nppes',
      'monitor_payer_directory',
      'monitor_pecos',
      'monitor_auto_confirm',
    ],
  },
  { key: 'complete', label: 'DONE', taskTypes: [] },
];

const DEPARTURE_STAGES: Stage[] = [
  { key: 'started', label: 'STARTED', taskTypes: [] },
  { key: 'website', label: 'WEBSITE', taskTypes: ['remove_website', 'update_website'] },
  { key: 'caqh', label: 'CAQH', taskTypes: ['correction_caqh'] },
  { key: 'nppes', label: 'NPPES', taskTypes: ['correction_nppes'] },
  { key: 'payers', label: 'PAYERS', taskTypes: ['submit_payer_removal'] },
  { key: 'pecos', label: 'PECOS', taskTypes: ['submit_pecos_termination'] },
  { key: 'phantom', label: 'PHANTOM', taskTypes: ['monitor_phantom'] },
];

// ─── Stage status computation ────────────────────────────────────────────────

type StageStatus = 'completed' | 'active' | 'pending' | 'skipped';

function computeStageStatus(
  stage: Stage,
  tasks: Task[],
  stageIndex: number,
  totalStages: number,
): StageStatus {
  // Special cases for virtual stages
  if (stage.key === 'complete') {
    const nonMonitorTasks = tasks.filter((t) => !t.task_type.startsWith('monitor_'));
    const allDone =
      nonMonitorTasks.length > 0 &&
      nonMonitorTasks.every((t) => t.status === 'completed' || t.status === 'skipped');
    return allDone ? 'completed' : 'pending';
  }
  if (stage.key === 'started') {
    return 'completed'; // Always complete once departure begins
  }

  // Find tasks matching this stage
  const matched = tasks.filter((t) => stage.taskTypes.includes(t.task_type));
  if (matched.length === 0) return 'skipped';

  const allCompleted = matched.every((t) => t.status === 'completed');
  const allSkipped = matched.every((t) => t.status === 'skipped');
  const anyActive = matched.some((t) => t.status === 'active');

  if (allCompleted) return 'completed';
  if (allSkipped) return 'skipped';
  if (anyActive) return 'active';
  return 'pending';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CredentialingTimeline({
  workflowType,
  tasks,
  estimatedWeeks,
  createdAt,
}: CredentialingTimelineProps) {
  const stages = workflowType === 'credentialing_onboarding' ? ONBOARDING_STAGES : DEPARTURE_STAGES;

  const stageStatuses: StageStatus[] = stages.map((s, i) =>
    computeStageStatus(s, tasks, i, stages.length),
  );

  // Estimated completion date
  let estDate: string | null = null;
  if (estimatedWeeks && createdAt) {
    const created = new Date(createdAt);
    created.setDate(created.getDate() + estimatedWeeks * 7);
    estDate = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Timeline bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          padding: '0 4px',
        }}
      >
        {stages.map((stage, i) => {
          const status = stageStatuses[i];
          const isLast = i === stages.length - 1;

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: isLast ? '0 0 auto' : 1,
              }}
            >
              {/* Circle */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: 1,
                    ...circleStyle(status),
                    ...(status === 'active'
                      ? { animation: 'credPulse 2s ease-in-out infinite' }
                      : {}),
                  }}
                >
                  {status === 'completed' ? '✓' : status === 'skipped' ? '—' : ''}
                </div>
                {/* Label */}
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    marginTop: 3,
                    whiteSpace: 'nowrap',
                    color:
                      status === 'completed'
                        ? colors.green
                        : status === 'active'
                          ? colors.blue
                          : status === 'skipped'
                            ? colors.gray200
                            : colors.gray400,
                  }}
                >
                  {stage.label}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    minWidth: 12,
                    marginBottom: 14,
                    background:
                      stageStatuses[i + 1] === 'completed' || status === 'completed'
                        ? colors.green
                        : colors.gray200,
                    ...(stageStatuses[i + 1] === 'pending' || stageStatuses[i + 1] === 'skipped'
                      ? {
                          backgroundImage: `repeating-linear-gradient(90deg, ${colors.gray200} 0, ${colors.gray200} 4px, transparent 4px, transparent 8px)`,
                          background: 'none',
                          backgroundSize: '8px 2px',
                          backgroundRepeat: 'repeat-x',
                        }
                      : {}),
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Estimated completion */}
      {estDate && (
        <div
          style={{
            fontSize: 9,
            color: colors.gray400,
            textAlign: 'right',
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          Est. completion: {estDate}
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes credPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  );
}

// ─── Style helpers ───────────────────────────────────────────────────────────

function circleStyle(status: StageStatus): React.CSSProperties {
  switch (status) {
    case 'completed':
      return { background: colors.green, color: '#fff', border: `2px solid ${colors.green}` };
    case 'active':
      return { background: '#fff', color: colors.blue, border: `2px solid ${colors.blue}` };
    case 'skipped':
      return {
        background: colors.gray100,
        color: colors.gray200,
        border: `2px solid ${colors.gray200}`,
      };
    case 'pending':
    default:
      return { background: '#fff', color: colors.gray400, border: `2px solid ${colors.gray200}` };
  }
}
