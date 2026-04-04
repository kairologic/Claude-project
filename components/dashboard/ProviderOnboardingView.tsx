'use client';

import React, { useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { colors, statusColors, statusLabels, workflowTypeLabels } from '@/lib/design-tokens';
import { Badge } from './ui';

interface Workflow {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  provider_npi: string | null;
  finding_summary: string | null;
  priority: number;
  created_at: string;
  overdue_at: string | null;
}

interface RosterProvider {
  npi: string;
  provider_name: string;
  roster_status: string;
}

interface Props {
  practiceId: string;
  workflows: Workflow[];
  roster: RosterProvider[];
}

interface NPPESProvider {
  first_name: string;
  last_name: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  primary_taxonomy_code: string;
  taxonomy_desc: string;
}

interface OnboardingTask {
  title: string;
  description: string;
  order: number;
  action_label: string;
  estimated_days: number;
  link?: string;
}

const onboardingTaskTemplate: OnboardingTask[] = [
  {
    title: 'NPI Lookup & Data Snapshot',
    description: 'Retrieve provider information from NPPES database',
    order: 1,
    action_label: 'Completed',
    estimated_days: 0,
  },
  {
    title: 'CAQH ProView Application',
    description: 'Complete CAQH ProView credentialing application',
    order: 2,
    action_label: 'Apply Now',
    estimated_days: 7,
    link: 'https://www.caqh.org/proview',
  },
  {
    title: 'Payer Enrollment Applications',
    description: 'Complete enrollment with contracted payers',
    order: 3,
    action_label: 'Begin Enrollment',
    estimated_days: 14,
  },
  {
    title: 'NPPES Update',
    description: 'Add practice location to provider profile',
    order: 4,
    action_label: 'Update Profile',
    estimated_days: 7,
  },
  {
    title: 'Website Addition',
    description: 'Add provider information to practice website',
    order: 5,
    action_label: 'Add to Site',
    estimated_days: 3,
  },
];

export default function ProviderOnboardingView({
  practiceId,
  workflows: initialWorkflows,
  roster,
}: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [showModal, setShowModal] = useState(false);
  const [npiInput, setNpiInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [providerData, setProviderData] = useState<NPPESProvider | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const handleLookup = useCallback(async () => {
    setLookupError(null);
    setProviderData(null);
    setIsDuplicate(false);

    if (!npiInput || npiInput.length !== 10) {
      setLookupError('NPI must be 10 digits');
      return;
    }

    setLookupLoading(true);

    try {
      const { data, error } = await supabase
        .from('providers')
        .select(
          'first_name, last_name, address_line_1, city, state, zip_code, phone, primary_taxonomy_code, taxonomy_desc',
        )
        .eq('npi', npiInput)
        .single();

      if (error || !data) {
        setLookupError('Provider not found in NPPES database');
        return;
      }

      const duplicateCheck = roster.find((r) => r.npi === npiInput);
      if (duplicateCheck) {
        setIsDuplicate(true);
      }

      setProviderData(data as NPPESProvider);
    } catch (err) {
      setLookupError('Error looking up provider');
    } finally {
      setLookupLoading(false);
    }
  }, [npiInput, roster, supabase]);

  const handleStartOnboarding = useCallback(async () => {
    if (!providerData) return;

    setCreatingWorkflow(true);

    try {
      const providerFullName = `${providerData.first_name} ${providerData.last_name}`;

      // 1. Create workflow instance
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_type: 'onboarding',
          status: 'action_needed',
          provider_npi: npiInput,
          provider_name: providerFullName,
          practice_id: practiceId,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      const workflowId = workflowData.id;

      // 2. Insert workflow tasks
      const tasksToInsert = onboardingTaskTemplate.map((task) => ({
        workflow_instance_id: workflowId,
        title: task.title,
        description: task.description,
        task_order: task.order,
        status: task.order === 1 ? 'completed' : 'pending',
        action_label: task.action_label,
        estimated_days: task.estimated_days,
        link: task.link || null,
      }));

      const { error: tasksError } = await supabase.from('workflow_tasks').insert(tasksToInsert);

      if (tasksError) throw tasksError;

      // 3. Insert into practice_providers
      const { error: practiceProvidersError } = await supabase.from('practice_providers').insert({
        npi: npiInput,
        provider_name: providerFullName,
        roster_status: 'onboarding',
        practice_id: practiceId,
      });

      if (practiceProvidersError) throw practiceProvidersError;

      // 4. Insert alert
      await supabase.from('alerts').insert({
        practice_id: practiceId,
        alert_type: 'onboarding_started',
        title: `New Provider Onboarding: ${providerFullName}`,
        description: `Provider onboarding workflow initiated for ${providerFullName} (NPI: ${npiInput})`,
        severity: 'info',
      });

      // 5. Refresh workflows
      const { data: updatedWorkflows } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('workflow_type', 'onboarding');

      setWorkflows((updatedWorkflows as Workflow[]) || []);

      setSuccessMessage(`Provider onboarding started for ${providerFullName}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      setShowModal(false);
      setNpiInput('');
      setProviderData(null);
    } catch (err) {
      setLookupError('Error creating onboarding workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  }, [providerData, npiInput, practiceId, supabase]);

  const activeOnboardings = workflows.filter(
    (w) => w.status !== 'completed' && w.status !== 'cancelled',
  );

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    backgroundColor: colors.gray50,
    minHeight: '100vh',
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

  const addButtonStyle: React.CSSProperties = {
    backgroundColor: colors.gold,
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '16px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const cardContentStyle: React.CSSProperties = {
    flex: 1,
  };

  const providerNameStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '4px',
  };

  const providerDetailsStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.gray600,
    marginBottom: '8px',
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  };

  const inputContainerStyle: React.CSSProperties = {
    flex: 1,
  };

  const lookupButtonStyle: React.CSSProperties = {
    backgroundColor: colors.navy,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const errorStyle: React.CSSProperties = {
    color: colors.red,
    fontSize: '12px',
    marginTop: '4px',
  };

  const warningStyle: React.CSSProperties = {
    backgroundColor: '#fff3cd',
    border: `1px solid #ffc107`,
    borderRadius: '6px',
    padding: '12px',
    fontSize: '12px',
    color: '#856404',
    marginBottom: '16px',
  };

  const resultsPanelStyle: React.CSSProperties = {
    backgroundColor: colors.gray50,
    border: `1px solid ${colors.gray200}`,
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '16px',
  };

  const resultTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '8px',
  };

  const resultDetailStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.gray600,
    marginBottom: '4px',
  };

  const startButtonStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: colors.gold,
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: colors.navy,
    cursor: 'pointer',
  };

  const modalRelativeStyle: React.CSSProperties = {
    position: 'relative',
  };

  const successBannerStyle: React.CSSProperties = {
    backgroundColor: '#d4edda',
    border: `1px solid #c3e6cb`,
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#155724',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px 24px',
    color: colors.gray600,
  };

  return (
    <div style={containerStyle}>
      {successMessage && <div style={successBannerStyle}>{successMessage}</div>}

      <div style={headerStyle}>
        <h1 style={titleStyle}>Provider Onboarding</h1>
        <button style={addButtonStyle} onClick={() => setShowModal(true)}>
          Add Provider
        </button>
      </div>

      <h2 style={sectionTitleStyle}>Active Onboardings</h2>

      {activeOnboardings.length === 0 ? (
        <div style={emptyStateStyle}>
          <p>No active provider onboardings. Click "Add Provider" to get started.</p>
        </div>
      ) : (
        activeOnboardings.map((workflow) => (
          <div key={workflow.id} style={cardStyle}>
            <div style={cardContentStyle}>
              <div style={providerNameStyle}>{workflow.provider_name || 'Unknown Provider'}</div>
              <div style={providerDetailsStyle}>
                NPI: {workflow.provider_npi} | Created:{' '}
                {new Date(workflow.created_at).toLocaleDateString()}
              </div>
              {workflow.finding_summary && (
                <div style={providerDetailsStyle}>{workflow.finding_summary}</div>
              )}
            </div>
            <Badge status={workflow.status} />
          </div>
        ))
      )}

      {showModal && (
        <div style={modalOverlayStyle} onClick={() => !creatingWorkflow && setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button
              style={closeButtonStyle}
              onClick={() => {
                if (!creatingWorkflow) {
                  setShowModal(false);
                  setNpiInput('');
                  setProviderData(null);
                  setLookupError(null);
                }
              }}
            >
              ×
            </button>

            <h2 style={modalTitleStyle}>Add New Provider</h2>

            {!providerData ? (
              <>
                <div style={formGroupStyle}>
                  <div style={inputWrapperStyle}>
                    <div style={inputContainerStyle}>
                      <label style={labelStyle}>Provider NPI (10 digits)</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={npiInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setNpiInput(val);
                        }}
                        placeholder="1234567890"
                        disabled={lookupLoading || creatingWorkflow}
                      />
                      {lookupError && <div style={errorStyle}>{lookupError}</div>}
                    </div>
                    <button
                      style={lookupButtonStyle}
                      onClick={handleLookup}
                      disabled={lookupLoading || npiInput.length !== 10 || creatingWorkflow}
                    >
                      {lookupLoading ? 'Searching...' : 'Look Up'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {isDuplicate && (
                  <div style={warningStyle}>
                    ⚠️ This provider is already on your roster. You may want to update their
                    existing record instead.
                  </div>
                )}

                <div style={resultsPanelStyle}>
                  <div style={resultTitleStyle}>
                    {providerData.first_name} {providerData.last_name}
                  </div>
                  <div style={resultDetailStyle}>
                    <strong>Specialty:</strong> {providerData.taxonomy_desc}
                  </div>
                  <div style={resultDetailStyle}>
                    <strong>Address:</strong> {providerData.address_line_1}, {providerData.city},{' '}
                    {providerData.state} {providerData.zip_code}
                  </div>
                  <div style={resultDetailStyle}>
                    <strong>Phone:</strong> {providerData.phone}
                  </div>
                </div>

                <button
                  style={startButtonStyle}
                  onClick={handleStartOnboarding}
                  disabled={creatingWorkflow}
                >
                  {creatingWorkflow ? 'Creating Workflow...' : 'Start Onboarding'}
                </button>

                <button
                  style={{
                    ...startButtonStyle,
                    backgroundColor: colors.gray200,
                    color: colors.navy,
                    marginTop: '8px',
                  }}
                  onClick={() => {
                    setProviderData(null);
                    setNpiInput('');
                    setIsDuplicate(false);
                  }}
                  disabled={creatingWorkflow}
                >
                  Search Another Provider
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
