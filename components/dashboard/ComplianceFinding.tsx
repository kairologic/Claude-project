'use client';

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';
import type { FindingDetails, WorkflowTask } from '@/lib/types/dashboard-schema';

interface ComplianceFindingProps {
  workflowId: string;
  finding: FindingDetails;
  providerName: string | null;
  tasks: WorkflowTask[];
  onTaskAction: (taskId: string, action: string) => Promise<void>;
  onBack: () => void;
}

/** Statute metadata for display */
const STATUTE_INFO: Record<
  string,
  {
    name: string;
    state: string;
    summary: string;
    requirement: string;
    penalty: string;
  }
> = {
  'SB 1188': {
    name: 'Senate Bill 1188',
    state: 'Texas',
    summary:
      'Requires accurate provider directory information for health plans operating in Texas.',
    requirement:
      'Provider directories must be updated within 5 business days of receiving notice of a change.',
    penalty: 'Administrative penalties up to $1,000 per violation per day.',
  },
  'HB 149': {
    name: 'House Bill 149',
    state: 'Texas',
    summary: 'Strengthens provider directory accuracy requirements and consumer protections.',
    requirement: 'Insurers must verify provider directory data at least every 90 days.',
    penalty: 'Fines and potential license sanctions for non-compliance.',
  },
  'AB 3030': {
    name: 'Assembly Bill 3030',
    state: 'California',
    summary:
      'California provider directory accuracy law requiring health plans to maintain accurate online directories.',
    requirement: 'Provider directories must be updated weekly with validated provider data.',
    penalty: 'Up to $2,500 per violation per day, plus consumer restitution.',
  },
};

/**
 * ComplianceFinding — shows the statute violation, explains the requirement,
 * and provides a remediation template/guide.
 */
export default function ComplianceFinding({
  workflowId,
  finding,
  providerName,
  tasks,
  onTaskAction,
  onBack,
}: ComplianceFindingProps) {
  const [actioningTask, setActioningTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState(false);

  const statute = finding.statute || '';
  const statuteInfo = STATUTE_INFO[statute];
  const fieldName = finding.field || 'Unknown field';

  // Find current active task
  const activeTask = tasks.find((t) => t.status === 'active');
  const isShowFinding = activeTask?.task_type === 'show_finding';
  const isTemplate = activeTask?.task_type === 'provide_template';
  const isRescan = activeTask?.task_type === 'rescan_confirm';

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.red,
            marginBottom: 6,
          }}
        >
          Compliance finding
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.navy,
          }}
        >
          {statute || 'Regulatory Non-Compliance'}
        </div>
        {providerName && (
          <div
            style={{
              fontSize: 12,
              color: colors.gray600,
              marginTop: 4,
            }}
          >
            Provider: {providerName}
          </div>
        )}
      </div>

      {/* Statute details card */}
      {statuteInfo && (
        <div
          style={{
            background: colors.redPale,
            border: `1px solid ${colors.red}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.red,
              marginBottom: 6,
            }}
          >
            {statuteInfo.name} ({statuteInfo.state})
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.gray600,
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            {statuteInfo.summary}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div
              style={{
                background: colors.white,
                borderRadius: 6,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: colors.gray400,
                  marginBottom: 4,
                }}
              >
                Requirement
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.navy,
                  lineHeight: 1.4,
                }}
              >
                {statuteInfo.requirement}
              </div>
            </div>
            <div
              style={{
                background: colors.white,
                borderRadius: 6,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: colors.gray400,
                  marginBottom: 4,
                }}
              >
                Penalty
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.red,
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
                {statuteInfo.penalty}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finding details */}
      <div
        style={{
          background: colors.gray50,
          border: `1px solid ${colors.gray200}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.gray400,
            marginBottom: 8,
          }}
        >
          What was found
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <div
            style={{
              background: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.gray400, marginBottom: 4 }}>
              Field
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: colors.navy,
                textTransform: 'capitalize',
              }}
            >
              {fieldName}
            </div>
          </div>
          <div
            style={{
              background: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.gray400, marginBottom: 4 }}>
              Website value
            </div>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: colors.navy, wordBreak: 'break-word' }}
            >
              {finding.website_value || '(not found)'}
            </div>
          </div>
          <div
            style={{
              background: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.gray400, marginBottom: 4 }}>
              NPPES value
            </div>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: colors.navy, wordBreak: 'break-word' }}
            >
              {finding.nppes_value || '(not found)'}
            </div>
          </div>
          {finding.payer_name && (
            <div
              style={{
                background: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: 6,
                padding: 10,
              }}
            >
              <div
                style={{ fontSize: 10, fontWeight: 700, color: colors.gray400, marginBottom: 4 }}
              >
                {finding.payer_name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.navy,
                  wordBreak: 'break-word',
                }}
              >
                {finding.payer_value || '(not found)'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remediation template */}
      {(isTemplate || expandedTemplate) && (
        <div
          style={{
            background: colors.greenPale,
            border: `1px solid ${colors.green}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.green,
              marginBottom: 8,
            }}
          >
            Remediation steps
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.gray600,
              lineHeight: 1.8,
            }}
          >
            <strong>1.</strong> Verify the correct {fieldName} for this provider
            <br />
            <strong>2.</strong> Update the practice website to reflect the correct value
            <br />
            <strong>3.</strong> If NPPES is also incorrect, submit an NPPES correction (a linked
            workflow will be created)
            <br />
            <strong>4.</strong> Update CAQH ProView if the discrepancy affects payer directories
            <br />
            <strong>5.</strong> Document the correction date for compliance audit trail
            <br />
            <strong>6.</strong> KairoLogic will rescan your website to confirm the fix
          </div>
        </div>
      )}

      {/* Action buttons based on current task */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isShowFinding && activeTask && (
          <button
            onClick={() => {
              setExpandedTemplate(true);
              handleAction(activeTask.id, 'complete');
            }}
            disabled={actioningTask === activeTask.id}
            style={{
              background: colors.blue,
              color: colors.white,
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: actioningTask === activeTask.id ? 'not-allowed' : 'pointer',
              opacity: actioningTask === activeTask.id ? 0.6 : 1,
            }}
          >
            {actioningTask === activeTask.id
              ? 'Updating...'
              : 'Acknowledged — show remediation steps'}
          </button>
        )}

        {isTemplate && activeTask && (
          <button
            onClick={() => handleAction(activeTask.id, 'complete')}
            disabled={actioningTask === activeTask.id}
            style={{
              background: colors.green,
              color: colors.white,
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: actioningTask === activeTask.id ? 'not-allowed' : 'pointer',
              opacity: actioningTask === activeTask.id ? 0.6 : 1,
            }}
          >
            {actioningTask === activeTask.id
              ? 'Updating...'
              : 'Remediation applied — request rescan'}
          </button>
        )}

        {isRescan && (
          <div
            style={{
              background: colors.bluePale,
              border: `1px solid ${colors.blue}`,
              borderRadius: 8,
              padding: 14,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 20 }}>&#128269;</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.navy, marginBottom: 2 }}>
                Rescan in progress
              </div>
              <div style={{ fontSize: 11, color: colors.gray600 }}>
                KairoLogic is rescanning your practice website to confirm the compliance issue has
                been resolved. This will complete automatically.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: colors.redPale,
            border: `1px solid ${colors.red}`,
            borderRadius: 6,
            padding: 10,
            fontSize: 12,
            color: colors.red,
            fontWeight: 600,
          }}
        >
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
