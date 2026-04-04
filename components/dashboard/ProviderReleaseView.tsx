/**
 * components/dashboard/ProviderReleaseView.tsx
 *
 * Provider Release workflow management.
 * Handles marking providers as departing and tracking the departure process.
 *
 * FEATURES:
 * - Display active release workflows
 * - Modal to select departing provider, date, and reason
 * - Generate 4-task departure checklist
 * - 90-day monitoring indicator
 * - Navy/gold design with inline styles
 */

'use client';

import React, { useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { colors, statusLabels, rosterStatusMap } from '@/lib/design-tokens';
import { Badge, WorkflowCard, Tooltip } from './ui';

interface Workflow {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  provider_npi: string | null;
  finding_summary: string | null;
  finding_details: any;
  priority: number;
  created_at: string;
  overdue_at: string | null;
}

interface ActiveProvider {
  npi: string;
  provider_name: string;
  roster_status: string;
}

interface Props {
  practiceId: string;
  workflows: Workflow[];
  activeProviders: ActiveProvider[];
}

interface DepartureReason {
  value: string;
  label: string;
}

const departureReasons: DepartureReason[] = [
  { value: 'relocated', label: 'Relocated' },
  { value: 'retired', label: 'Retired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'leave_of_absence', label: 'Leave of Absence' },
  { value: 'other', label: 'Other' },
];

const releaseTaskTemplate = [
  {
    title: 'Complete departure checklist',
    description: 'Remove from website, reassign patients, update contact info',
    order: 1,
    estimated_days: 7,
  },
  {
    title: 'Notify systems',
    description: 'Update NPPES, notify payers, submit CAQH deactivation',
    order: 2,
    estimated_days: 14,
  },
  {
    title: 'Monitor removal from directories',
    description: 'Verify removal from payer directories and NPPES',
    order: 3,
    estimated_days: 30,
  },
  {
    title: 'Archive provider record',
    description: 'Archive all provider documentation and audit trail',
    order: 4,
    estimated_days: 90,
  },
];

export default function ProviderReleaseView({
  practiceId,
  workflows: initialWorkflows,
  activeProviders,
}: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [departureDate, setDepartureDate] = useState<string>('');
  const [departureReason, setDepartureReason] = useState<string>('relocated');
  const [departureNotes, setDepartureNotes] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const handleStartReleaseWorkflow = useCallback(async () => {
    setError(null);

    if (!selectedProvider || !departureDate || !departureReason) {
      setError('Please select a provider, departure date, and reason');
      return;
    }

    setIsCreating(true);

    try {
      const provider = activeProviders.find((p) => p.npi === selectedProvider);
      if (!provider) {
        setError('Selected provider not found');
        return;
      }

      // 1. Create workflow instance
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_type: 'release',
          status: 'action_needed',
          provider_npi: selectedProvider,
          provider_name: provider.provider_name,
          practice_id: practiceId,
          finding_summary: `Provider departure: ${departureReason}`,
          finding_details: {
            departure_date: departureDate,
            departure_reason: departureReason,
            notes: departureNotes,
          },
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      const workflowId = workflowData.id;

      // 2. Insert workflow tasks (4 tasks for release)
      const tasksToInsert = releaseTaskTemplate.map((task) => ({
        workflow_instance_id: workflowId,
        title: task.title,
        description: task.description,
        task_order: task.order,
        status: 'pending',
        estimated_days: task.estimated_days,
      }));

      const { error: tasksError } = await supabase.from('workflow_tasks').insert(tasksToInsert);

      if (tasksError) throw tasksError;

      // 3. Update practice_providers roster_status to 'departing'
      const { error: updateError } = await supabase
        .from('practice_providers')
        .update({ roster_status: 'departing' })
        .eq('npi', selectedProvider)
        .eq('practice_id', practiceId);

      if (updateError) throw updateError;

      // 4. Insert alert
      await supabase.from('alerts').insert({
        practice_id: practiceId,
        alert_type: 'provider_departure',
        title: `Provider Departure: ${provider.provider_name}`,
        description: `${provider.provider_name} (NPI: ${selectedProvider}) marked as departing on ${departureDate}. Reason: ${departureReason}`,
        severity: 'action',
      });

      // 5. Refresh workflows
      const { data: updatedWorkflows } = await supabase
        .from('workflow_instances')
        .select(
          'id, workflow_type, status, provider_name, provider_npi, finding_summary, finding_details, priority, created_at, overdue_at',
        )
        .eq('practice_id', practiceId)
        .eq('workflow_type', 'release')
        .order('created_at', { ascending: false });

      setWorkflows((updatedWorkflows as Workflow[]) || []);

      setSuccessMessage(`Provider departure workflow started for ${provider.provider_name}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      setShowModal(false);
      setSelectedProvider('');
      setDepartureDate('');
      setDepartureReason('relocated');
      setDepartureNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating release workflow');
    } finally {
      setIsCreating(false);
    }
  }, [
    selectedProvider,
    departureDate,
    departureReason,
    departureNotes,
    activeProviders,
    practiceId,
    supabase,
  ]);

  const activeReleases = workflows.filter((w) => w.status !== 'resolved');

  // Calculate 90-day monitoring indicators
  const getDaysFromDeparture = (workflow: Workflow): number | null => {
    const details = workflow.finding_details || {};
    const departureDate = details.departure_date;
    if (!departureDate) return null;
    const days = Math.floor((Date.now() - new Date(departureDate).getTime()) / 86400000);
    return days;
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '24px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: colors.navy,
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: colors.gold,
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '16px',
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '40px',
    textAlign: 'center',
    color: colors.gray400,
    fontSize: '13px',
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.gray50,
  };

  const workflowsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  };

  const monitoringIndicatorStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: 100,
    backgroundColor: colors.goldPale,
    color: colors.gold,
    marginTop: '8px',
    display: 'inline-block',
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '32px',
    width: '480px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  };

  const modalTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '24px',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '6px',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    minHeight: '80px',
    resize: 'vertical',
  };

  const errorStyle: React.CSSProperties = {
    color: colors.red,
    fontSize: '12px',
    marginTop: '4px',
  };

  const successStyle: React.CSSProperties = {
    backgroundColor: colors.greenPale,
    border: `1px solid ${colors.green}`,
    borderRadius: '6px',
    padding: '12px',
    fontSize: '12px',
    color: colors.green,
    marginBottom: '16px',
  };

  const modalButtonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: colors.gold,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: colors.gray100,
    color: colors.navy,
    border: `1px solid ${colors.gray200}`,
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const checklistContainerStyle: React.CSSProperties = {
    backgroundColor: colors.gray50,
    borderRadius: 10,
    border: `1px solid ${colors.gray200}`,
    padding: '16px',
    marginBottom: '16px',
  };

  const checklistItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: `1px solid ${colors.gray200}`,
  };

  const checklistItemLastStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: 'none',
  };

  const checklistNumberStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: colors.gold,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    flexShrink: 0,
  };

  const checklistTextStyle: React.CSSProperties = {
    flex: 1,
  };

  const checklistTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '2px',
  };

  const checklistDescStyle: React.CSSProperties = {
    fontSize: '11px',
    color: colors.gray600,
  };

  return (
    <div style={containerStyle}>
      {/* Success message */}
      {successMessage && <div style={successStyle}>✓ {successMessage}</div>}

      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Provider Release</h1>
        <button
          onClick={() => setShowModal(true)}
          style={buttonStyle}
          onMouseOver={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = colors.goldLight)
          }
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = colors.gold)}
        >
          Mark Departing
        </button>
      </div>

      {/* Active Release Workflows Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitleStyle}>Active Release Workflows ({activeReleases.length})</h2>

        {activeReleases.length === 0 ? (
          <div style={emptyStateStyle}>
            No active provider departures. All providers are accounted for.
          </div>
        ) : (
          <div style={workflowsGridStyle}>
            {activeReleases.map((workflow) => {
              const daysFromDeparture = getDaysFromDeparture(workflow);
              const isMonitoring = daysFromDeparture !== null && daysFromDeparture <= 90;

              return (
                <div key={workflow.id} style={{ position: 'relative' }}>
                  <WorkflowCard
                    workflow={workflow}
                    onClick={() => {
                      /* Could navigate to workflow detail */
                    }}
                  />
                  {isMonitoring && daysFromDeparture !== null && (
                    <Tooltip
                      text={`${daysFromDeparture} days since departure. Monitoring for removal from directories.`}
                    >
                      <div style={monitoringIndicatorStyle}>⏱ {daysFromDeparture} days</div>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Departure Checklist Reference */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitleStyle}>Departure Workflow Tasks</h2>
        <div style={checklistContainerStyle}>
          {releaseTaskTemplate.map((task, idx) => (
            <div
              key={task.order}
              style={
                idx === releaseTaskTemplate.length - 1 ? checklistItemLastStyle : checklistItemStyle
              }
            >
              <div style={checklistNumberStyle}>{task.order}</div>
              <div style={checklistTextStyle}>
                <div style={checklistTitleStyle}>{task.title}</div>
                <div style={checklistDescStyle}>{task.description}</div>
                <div style={{ fontSize: '10px', color: colors.gray400, marginTop: '4px' }}>
                  Estimated: {task.estimated_days} days
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mark Departing Modal */}
      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitleStyle}>Mark Provider as Departing</h2>

            {error && <div style={errorStyle}>{error}</div>}

            {/* Provider Selection */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Select Provider *</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={selectStyle}
              >
                <option value="">Choose a provider...</option>
                {activeProviders.map((p) => (
                  <option key={p.npi} value={p.npi}>
                    {p.provider_name} — {p.npi}
                  </option>
                ))}
              </select>
            </div>

            {/* Departure Date */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Departure Date *</label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Departure Reason */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Reason for Departure *</label>
              <select
                value={departureReason}
                onChange={(e) => setDepartureReason(e.target.value)}
                style={selectStyle}
              >
                {departureReasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Notes (Optional)</label>
              <textarea
                value={departureNotes}
                onChange={(e) => setDepartureNotes(e.target.value)}
                placeholder="Add any additional information about the departure..."
                style={textareaStyle}
              />
            </div>

            {/* Buttons */}
            <div style={modalButtonGroupStyle}>
              <button
                onClick={() => setShowModal(false)}
                disabled={isCreating}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleStartReleaseWorkflow}
                disabled={isCreating}
                style={{
                  ...primaryButtonStyle,
                  opacity: isCreating ? 0.6 : 1,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                }}
              >
                {isCreating ? 'Creating...' : 'Start Release Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
