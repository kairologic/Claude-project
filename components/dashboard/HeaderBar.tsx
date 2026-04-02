/**
 * components/dashboard/HeaderBar.tsx
 *
 * Sticky header bar at top of main content area.
 * Shows: page title, practice context, date, add provider button (opens modal), system status.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/design-tokens';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import NLSearchModal from './NLSearchModal';
import {
  runCredentialingAssessment,
  type AssessmentOutput,
  type AssessmentResult,
  type SourceStatus,
} from '@/lib/credentialing/assessment-engine';

interface HeaderBarProps {
  title: string;
  practiceName: string;
  providerCount: number;
  lastSync?: string;
  practiceId?: string;
  onSelectWorkflow?: (id: string) => void;
}

interface NPPESResult {
  npi: string;
  first_name: string;
  last_name: string;
  credential: string;
  taxonomy_desc: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
}

export default function HeaderBar({
  title,
  practiceName,
  providerCount,
  lastSync,
  practiceId,
  onSelectWorkflow,
}: HeaderBarProps) {
  const router = useRouter();
  const [dateStr, setDateStr] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [npiInput, setNpiInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<NPPESResult | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | null>(null);
  const [assessmentOutput, setAssessmentOutput] = useState<AssessmentOutput | null>(null);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    );
  }, []);

  function resetModal() {
    setNpiInput('');
    setResult(null);
    setError('');
    setAdding(false);
    setAddSuccess(false);
    setSearching(false);
    setCreatedWorkflowId(null);
    setAssessmentOutput(null);
    setAssessing(false);
  }

  function closeModal() {
    setShowAddModal(false);
    resetModal();
  }

  // Look up NPI from our providers table
  const handleNPISearch = useCallback(async () => {
    if (!npiInput || npiInput.length !== 10) {
      setError('Enter a valid 10-digit NPI');
      return;
    }
    setSearching(true);
    setError('');
    setResult(null);

    try {
      const supabase = createBrowserSupabaseClient();

      // Check if already on roster as active/departing provider
      const { data: existingRoster } = await supabase
        .from('practice_providers')
        .select('npi, roster_status')
        .eq('practice_website_id', practiceId)
        .eq('npi', npiInput)
        .in('roster_status', ['active', 'departing'])
        .maybeSingle();

      if (existingRoster) {
        setError('This provider is already on your roster.');
        setSearching(false);
        return;
      }

      // Check if there's already an active onboarding/credentialing workflow for this NPI
      const { data: existingOnboarding } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('practice_id', practiceId)
        .eq('provider_npi', npiInput)
        .in('workflow_type', ['onboarding', 'credentialing_onboarding'])
        .in('status', ['action_needed', 'in_progress', 'awaiting'])
        .maybeSingle();

      if (existingOnboarding) {
        setError('This provider already has an active onboarding workflow.');
        setSearching(false);
        return;
      }

      // Look up provider in our NPPES table
      const { data: provider } = await supabase
        .from('providers')
        .select(
          'npi, first_name, last_name, credential, taxonomy_desc, address_line_1, city, state, zip_code, phone',
        )
        .eq('npi', npiInput)
        .maybeSingle();

      if (!provider) {
        setError('NPI not found in NPPES records. Check the number and try again.');
        setSearching(false);
        return;
      }

      setResult(provider as NPPESResult);

      // Run credentialing assessment using existing DB data
      setAssessing(true);
      try {
        const assessment = await runCredentialingAssessment(supabase, npiInput, practiceId!);
        setAssessmentOutput(assessment);
      } catch {
        // Assessment is non-blocking — provider can still be added
        setAssessmentOutput(null);
      } finally {
        setAssessing(false);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [npiInput, practiceId]);

  const handleAddProvider = useCallback(async () => {
    if (!result || !practiceId) return;
    setAdding(true);

    try {
      const supabase = createBrowserSupabaseClient();

      // Use assessment-generated tasks, or fallback to minimal tasks if assessment failed
      const assessmentTasks = assessmentOutput?.tasks || [];
      const taskCount = assessmentTasks.length || 1;

      // 1. Create credentialing_onboarding workflow with assessment metadata
      const { data: wf } = await supabase
        .from('workflow_instances')
        .insert({
          practice_id: practiceId,
          workflow_type: 'credentialing_onboarding',
          status: 'action_needed',
          provider_npi: result.npi,
          provider_name: `${result.first_name} ${result.last_name}`.trim(),
          finding_summary:
            assessmentOutput?.summary || `New provider onboarding — ${taskCount} tasks generated`,
          finding_details: {
            field: 'credentialing',
            taxonomy: result.taxonomy_desc,
            address: result.address_line_1,
            city: result.city,
            state: result.state,
            assessment: assessmentOutput?.assessment || null,
            estimated_completion_weeks: assessmentOutput?.estimated_completion_weeks || null,
            bottleneck: assessmentOutput?.bottleneck || null,
          },
          priority: 3,
        })
        .select('id')
        .single();

      if (wf) {
        // 2. Insert assessment-generated tasks (or fallback)
        if (assessmentTasks.length > 0) {
          await supabase.from('workflow_tasks').insert(
            assessmentTasks.map((t) => ({
              workflow_id: wf.id,
              task_order: t.task_order,
              task_type: t.task_type,
              title: t.title,
              description: t.description,
              status: t.status,
              metadata: t.metadata,
            })),
          );
        } else {
          // Fallback: minimal tasks if assessment didn't run
          await supabase.from('workflow_tasks').insert([
            {
              workflow_id: wf.id,
              task_order: 1,
              task_type: 'data_snapshot',
              title: 'Day-one data snapshot',
              description: 'Review NPPES, PECOS, and license data for this provider.',
              status: 'active',
            },
            {
              workflow_id: wf.id,
              task_order: 2,
              task_type: 'correction_caqh',
              title: 'Update CAQH ProView',
              description: 'Add/update provider profile in CAQH with new practice info.',
              status: 'pending',
              metadata: { group: 'immediate', portal_url: 'https://proview.caqh.org/' },
            },
            {
              workflow_id: wf.id,
              task_order: 3,
              task_type: 'update_website',
              title: 'Add provider to practice website',
              description: 'List provider with bio, photo, and specialty info.',
              status: 'pending',
              metadata: { group: 'immediate' },
            },
          ]);
        }

        // 3. Create/update practice_providers entry with onboarding status
        const { data: existingPP } = await supabase
          .from('practice_providers')
          .select('id')
          .eq('practice_website_id', practiceId)
          .eq('npi', result.npi)
          .maybeSingle();

        if (existingPP) {
          await supabase
            .from('practice_providers')
            .update({ roster_status: 'onboarding' })
            .eq('id', existingPP.id);
        } else {
          await supabase.from('practice_providers').insert({
            practice_website_id: practiceId,
            npi: result.npi,
            provider_name: `${result.first_name} ${result.last_name}`.trim(),
            web_specialty: result.taxonomy_desc || null,
            roster_status: 'onboarding',
            added_date: new Date().toISOString().split('T')[0],
          });
        }

        // 4. Create alert
        await supabase.from('alerts').insert({
          practice_id: practiceId,
          severity: 'info',
          title: `Credentialing started: ${result.first_name} ${result.last_name}`,
          description: `${result.taxonomy_desc || 'Provider'} credentialing started — ${assessmentTasks.length} tasks auto-generated.${assessmentOutput?.bottleneck ? ` Bottleneck: ${assessmentOutput.bottleneck}.` : ''}`,
          workflow_id: wf.id,
          provider_npi: result.npi,
          provider_name: `${result.first_name} ${result.last_name}`.trim(),
          source: 'assessment_engine',
          is_active: true,
        });

        // 5. Log event
        await supabase.from('workflow_events').insert({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'user',
          title: `Credentialing started for ${result.first_name} ${result.last_name}`,
          details: {
            npi: result.npi,
            taxonomy: result.taxonomy_desc,
            tasks_generated: assessmentTasks.length,
            estimated_weeks: assessmentOutput?.estimated_completion_weeks,
            bottleneck: assessmentOutput?.bottleneck,
          },
        });

        // 6. Send onboarding notification email (non-blocking)
        fetch('/api/email/credentialing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'onboarding_started',
            provider_name: `${result.first_name} ${result.last_name}`.trim(),
            provider_npi: result.npi,
            practice_name: '',
            practice_id: practiceId,
            recipient_email: 'compliance@kairologic.net',
            details: {
              task_count: assessmentTasks.length,
              estimated_weeks: assessmentOutput?.estimated_completion_weeks,
              bottleneck: assessmentOutput?.bottleneck,
            },
          }),
        }).catch(() => {});
      }

      setCreatedWorkflowId(wf?.id || null);
      setAddSuccess(true);

      // Auto-navigate to dashboard after a brief success flash (server re-fetches data)
      setTimeout(() => {
        setShowAddModal(false);
        window.location.href = `/practice/${practiceId}`;
      }, 1200);
    } catch (err) {
      setError('Failed to add provider. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [result, practiceId, router, assessmentOutput]);

  return (
    <>
      <div style={styles.bar}>
        <div>
          <div style={styles.title}>{practiceName}</div>
          <div style={styles.meta}>
            {providerCount} provider{providerCount !== 1 ? 's' : ''}
            {lastSync ? ` · Last sync: ${lastSync}` : ''}
          </div>
        </div>
        <div style={styles.right}>
          {practiceId && <NLSearchModal practiceId={practiceId} />}
          <span style={styles.date}>{dateStr}</span>
          <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
            <span style={{ fontSize: 14 }}>+</span> Add provider
          </button>
          <div style={styles.status}>
            <div style={styles.statusDot} />
            <span style={styles.statusText}>Operational</span>
          </div>
        </div>
      </div>

      {/* ── Add Provider Modal ──────────────────────────────── */}
      {showAddModal && (
        <>
          <div
            onClick={closeModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,30,46,.5)',
              zIndex: 300,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 460,
              background: '#fff',
              borderRadius: 14,
              zIndex: 301,
              boxShadow: '0 20px 60px rgba(0,0,0,.2)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '18px 20px',
                background: colors.navy,
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Add a provider</div>
                <div style={{ fontSize: 11, color: colors.navyLight, marginTop: 2 }}>
                  Enter the provider's NPI to pull their data from NPPES
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.navyLight,
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 20 }}>
              {!addSuccess ? (
                <>
                  {/* NPI input */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={npiInput}
                      onChange={(e) => {
                        setNpiInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleNPISearch()}
                      placeholder="Enter 10-digit NPI..."
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: `1.5px solid ${error ? colors.red : colors.gray200}`,
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        color: colors.navy,
                        outline: 'none',
                        letterSpacing: '0.5px',
                      }}
                    />
                    <button
                      onClick={handleNPISearch}
                      disabled={searching || npiInput.length !== 10}
                      style={{
                        padding: '10px 18px',
                        background: colors.navy,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: searching || npiInput.length !== 10 ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: searching || npiInput.length !== 10 ? 0.5 : 1,
                      }}
                    >
                      {searching ? 'Looking up...' : 'Look up'}
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.red,
                        marginBottom: 12,
                        padding: '8px 12px',
                        background: colors.redPale,
                        borderRadius: 6,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Result card with assessment snapshot */}
                  {result && (
                    <div
                      style={{
                        border: `1.5px solid ${colors.green}`,
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Provider info */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: colors.greenPale,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: colors.navy,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {result.first_name?.[0]}
                          {result.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>
                            {result.first_name} {result.last_name}
                            {result.credential ? `, ${result.credential}` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: colors.gray600 }}>
                            NPI: {result.npi} · {result.taxonomy_desc || 'Healthcare provider'}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, color: colors.gray400, marginBottom: 6 }}>
                          NPPES record
                        </div>
                        {result.address_line_1 && (
                          <div style={{ fontSize: 12, color: colors.navy, marginBottom: 3 }}>
                            {result.address_line_1}, {result.city}, {result.state} {result.zip_code}
                          </div>
                        )}
                        {result.phone && (
                          <div style={{ fontSize: 12, color: colors.navy }}>
                            {result.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                          </div>
                        )}
                      </div>

                      {/* Assessment snapshot */}
                      {assessing && (
                        <div
                          style={{
                            padding: '12px 16px',
                            borderTop: `1px solid ${colors.gray200}`,
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: colors.gray400,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                border: `2px solid ${colors.blue}`,
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                              }}
                            />
                            Running credentialing assessment...
                          </div>
                        </div>
                      )}

                      {assessmentOutput && !assessing && (
                        <div
                          style={{ padding: '12px 16px', borderTop: `1px solid ${colors.gray200}` }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: colors.gray400,
                              marginBottom: 8,
                            }}
                          >
                            Readiness assessment
                          </div>
                          {/* Source status badges */}
                          <div
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}
                          >
                            {assessmentOutput.assessment &&
                              Object.entries(assessmentOutput.assessment).map(([key, status]) => {
                                const label = key === 'caqh_inferred' ? 'CAQH' : key.toUpperCase();
                                const { bg, fg } = getStatusBadgeColors(status as SourceStatus);
                                return (
                                  <span
                                    key={key}
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: bg,
                                      color: fg,
                                    }}
                                  >
                                    {label}: {formatSourceStatus(status as SourceStatus)}
                                  </span>
                                );
                              })}
                          </div>
                          {/* Summary line */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: 11, color: colors.gray600 }}>
                              {assessmentOutput.tasks.length} tasks · ~
                              {assessmentOutput.estimated_completion_weeks} weeks
                            </span>
                            {assessmentOutput.bottleneck && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: colors.gold }}>
                                Bottleneck: {assessmentOutput.bottleneck}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action button */}
                      <div
                        style={{ padding: '12px 16px', borderTop: `1px solid ${colors.gray200}` }}
                      >
                        <button
                          onClick={handleAddProvider}
                          disabled={adding || assessing}
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: colors.navy,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: adding || assessing ? 'wait' : 'pointer',
                            fontFamily: 'inherit',
                            opacity: adding || assessing ? 0.6 : 1,
                          }}
                        >
                          {adding
                            ? 'Starting credentialing...'
                            : assessing
                              ? 'Running assessment...'
                              : `Start credentialing (${assessmentOutput?.tasks.length || 0} tasks)`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {!result && !error && (
                    <div
                      style={{
                        fontSize: 11,
                        color: colors.gray400,
                        textAlign: 'center',
                        padding: '8px 0',
                      }}
                    >
                      We'll pull their NPPES data, run a multi-source assessment, and auto-generate
                      a credentialing checklist.
                    </div>
                  )}
                </>
              ) : (
                /* Success state — auto-redirects to workflow detail */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: colors.greenPale,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: 22,
                      color: colors.green,
                    }}
                  >
                    ✓
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: colors.navy, marginBottom: 4 }}
                  >
                    {result?.first_name} {result?.last_name} — credentialing started
                  </div>
                  <div style={{ fontSize: 12, color: colors.gray400, marginBottom: 16 }}>
                    {assessmentOutput?.tasks.length || 0} tasks generated. Taking you to the
                    dashboard...
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: `2px solid ${colors.navy}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: 12, color: colors.gray400 }}>Redirecting...</span>
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Assessment badge helpers ─────────────────────────────────────────────────

function getStatusBadgeColors(status: SourceStatus): { bg: string; fg: string } {
  switch (status) {
    case 'listed_correct':
    case 'active':
    case 'enrolled':
      return { bg: colors.greenPale, fg: colors.green };
    case 'wrong_address':
    case 'wrong_phone':
    case 'needs_update':
    case 'needs_reassignment':
    case 'possibly_stale':
      return { bg: colors.redPale, fg: colors.red };
    case 'not_listed':
    case 'expired':
      return { bg: '#FFF3E0', fg: '#E65100' };
    case 'not_checked':
    default:
      return { bg: colors.gray100, fg: colors.gray400 };
  }
}

function formatSourceStatus(status: SourceStatus): string {
  switch (status) {
    case 'listed_correct':
      return 'OK';
    case 'wrong_address':
      return 'Wrong addr';
    case 'wrong_phone':
      return 'Wrong phone';
    case 'needs_update':
      return 'Needs update';
    case 'not_listed':
      return 'Not listed';
    case 'not_checked':
      return 'N/A';
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'needs_reassignment':
      return 'Needs reassign';
    case 'enrolled':
      return 'Enrolled';
    case 'possibly_stale':
      return 'May be stale';
    default:
      return status;
  }
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.gray200}`,
    background: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 800, color: colors.navy },
  meta: { fontSize: 11, color: colors.gray400 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  date: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.gray600,
    paddingRight: 4,
    borderRight: `1px solid ${colors.gray200}`,
  },
  addBtn: {
    background: colors.navy,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  status: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.green },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: colors.green },
  statusText: { fontWeight: 600 },
};
