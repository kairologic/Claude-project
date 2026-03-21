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
import GlobalSearch from './GlobalSearch';

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

export default function HeaderBar({ title, practiceName, providerCount, lastSync, practiceId, onSelectWorkflow }: HeaderBarProps) {
  const router = useRouter();
  const [dateStr, setDateStr] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [npiInput, setNpiInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<NPPESResult | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }));
  }, []);

  function resetModal() {
    setNpiInput('');
    setResult(null);
    setError('');
    setAdding(false);
    setAddSuccess(false);
    setSearching(false);
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

      // Check if already on this practice roster
      const { data: existing } = await supabase
        .from('practice_providers')
        .select('npi')
        .eq('practice_website_id', practiceId)
        .eq('npi', npiInput)
        .maybeSingle();

      if (existing) {
        setError('This provider is already on your roster.');
        setSearching(false);
        return;
      }

      // Look up provider in our NPPES table
      const { data: provider } = await supabase
        .from('providers')
        .select('npi, first_name, last_name, credential, taxonomy_desc, address_line_1, city, state, zip_code, phone')
        .eq('npi', npiInput)
        .maybeSingle();

      if (!provider) {
        setError('NPI not found in NPPES records. Check the number and try again.');
        setSearching(false);
        return;
      }

      setResult(provider as NPPESResult);
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

      // 1. Add to practice_providers
      await supabase.from('practice_providers').insert({
        practice_website_id: practiceId,
        npi: result.npi,
        provider_name: `${result.first_name} ${result.last_name}`.trim(),
        roster_status: 'onboarding',
      });

      // 2. Create onboarding workflow
      const { data: wf } = await supabase.from('workflow_instances').insert({
        practice_id: practiceId,
        workflow_type: 'onboarding',
        status: 'action_needed',
        provider_npi: result.npi,
        provider_name: `${result.first_name} ${result.last_name}`.trim(),
        finding_summary: 'New provider onboarding',
        finding_details: {
          field: 'onboarding',
          taxonomy: result.taxonomy_desc,
          address: result.address_line_1,
          city: result.city,
          state: result.state,
        },
        priority: 3,
      }).select('id').single();

      // 3. Create onboarding tasks
      if (wf) {
        const tasks = [
          { task_order: 1, task_type: 'data_snapshot', title: 'Day-one data snapshot', description: 'Review NPPES, PECOS, and license data for this provider.', status: 'active' },
          { task_order: 2, task_type: 'credentialing_checklist', title: 'Credentialing checklist', description: 'CAQH ProView, payer enrollment, NPPES update, website addition.', status: 'pending' },
          { task_order: 3, task_type: 'verify_payer', title: 'Verify payer directory listings', description: 'Check that provider appears in payer directories with correct data.', status: 'pending' },
          { task_order: 4, task_type: 'monitor_sync', title: 'Monitor & auto-confirm', description: 'Weekly check of external sources for onboarding completion.', status: 'pending' },
        ];
        await supabase.from('workflow_tasks').insert(
          tasks.map(t => ({ ...t, workflow_id: wf.id }))
        );

        // 4. Create alert
        await supabase.from('alerts').insert({
          practice_id: practiceId,
          severity: 'info',
          title: `New provider onboarding: ${result.first_name} ${result.last_name}`,
          description: `${result.taxonomy_desc || 'Provider'} added to your roster. Onboarding workflow created.`,
          workflow_id: wf.id,
          provider_npi: result.npi,
          provider_name: `${result.first_name} ${result.last_name}`.trim(),
          source: 'manual_add',
          is_active: true,
        });

        // 5. Log event
        await supabase.from('workflow_events').insert({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'user',
          title: `Onboarding started for ${result.first_name} ${result.last_name}`,
          details: { npi: result.npi, taxonomy: result.taxonomy_desc },
        });
      }

      setAddSuccess(true);
    } catch (err) {
      setError('Failed to add provider. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [result, practiceId]);

  return (
    <>
      <div style={styles.bar}>
        <div>
          <div style={styles.title}>{title}</div>
          <div style={styles.meta}>
            {practiceName} · {providerCount} providers{lastSync ? ` · Last sync: ${lastSync}` : ''}
          </div>
        </div>
        <div style={styles.right}>
          {practiceId && (
            <GlobalSearch
              practiceId={practiceId}
              onSelectWorkflow={onSelectWorkflow || (() => {})}
            />
          )}
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
          <div onClick={closeModal} style={{
            position: 'fixed', inset: 0, background: 'rgba(15,30,46,.5)', zIndex: 300,
            backdropFilter: 'blur(2px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 460, background: '#fff', borderRadius: 14, zIndex: 301,
            boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 20px', background: colors.navy, color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Add a provider</div>
                <div style={{ fontSize: 11, color: colors.navyLight, marginTop: 2 }}>
                  Enter the provider's NPI to pull their data from NPPES
                </div>
              </div>
              <button onClick={closeModal} style={{
                background: 'none', border: 'none', color: colors.navyLight, fontSize: 20,
                cursor: 'pointer', padding: '4px 8px',
              }}>×</button>
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
                      onChange={e => { setNpiInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleNPISearch()}
                      placeholder="Enter 10-digit NPI..."
                      autoFocus
                      style={{
                        flex: 1, padding: '10px 14px', border: `1.5px solid ${error ? colors.red : colors.gray200}`,
                        borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: colors.navy,
                        outline: 'none', letterSpacing: '0.5px',
                      }}
                    />
                    <button
                      onClick={handleNPISearch}
                      disabled={searching || npiInput.length !== 10}
                      style={{
                        padding: '10px 18px', background: colors.navy, color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: searching || npiInput.length !== 10 ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: searching || npiInput.length !== 10 ? 0.5 : 1,
                      }}
                    >
                      {searching ? 'Looking up...' : 'Look up'}
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ fontSize: 12, color: colors.red, marginBottom: 12, padding: '8px 12px', background: colors.redPale, borderRadius: 6 }}>
                      {error}
                    </div>
                  )}

                  {/* Result card */}
                  {result && (
                    <div style={{
                      border: `1.5px solid ${colors.green}`, borderRadius: 10, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '12px 16px', background: colors.greenPale,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: colors.navy,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800,
                        }}>
                          {result.first_name?.[0]}{result.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>
                            {result.first_name} {result.last_name}{result.credential ? `, ${result.credential}` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: colors.gray600 }}>
                            NPI: {result.npi} · {result.taxonomy_desc || 'Healthcare provider'}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, color: colors.gray400, marginBottom: 6 }}>NPPES record</div>
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
                      <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.gray200}` }}>
                        <button
                          onClick={handleAddProvider}
                          disabled={adding}
                          style={{
                            width: '100%', padding: '10px', background: colors.navy, color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: adding ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: adding ? 0.6 : 1,
                          }}
                        >
                          {adding ? 'Adding to roster...' : 'Add to roster & start onboarding'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {!result && !error && (
                    <div style={{ fontSize: 11, color: colors.gray400, textAlign: 'center', padding: '8px 0' }}>
                      We'll pull their data from NPPES, check license status, and create an onboarding workflow.
                    </div>
                  )}
                </>
              ) : (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: colors.greenPale,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', fontSize: 22, color: colors.green,
                  }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.navy, marginBottom: 4 }}>
                    {result?.first_name} {result?.last_name} added
                  </div>
                  <div style={{ fontSize: 12, color: colors.gray400, marginBottom: 16 }}>
                    Onboarding workflow created. You can track progress in Workflows.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => { closeModal(); router.push(`/practice/${practiceId}/workflows?type=onboarding`); }}
                      style={{
                        padding: '8px 16px', background: colors.navy, color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      View workflow
                    </button>
                    <button
                      onClick={() => resetModal()}
                      style={{
                        padding: '8px 16px', background: '#fff', color: colors.navy,
                        border: `1.5px solid ${colors.gray200}`, borderRadius: 8,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Add another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    padding: '14px 20px', borderBottom: `1px solid ${colors.gray200}`, background: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 800, color: colors.navy },
  meta: { fontSize: 11, color: colors.gray400 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  date: {
    fontSize: 12, fontWeight: 500, color: colors.gray600,
    paddingRight: 4, borderRight: `1px solid ${colors.gray200}`,
  },
  addBtn: {
    background: colors.navy, color: '#fff', border: 'none', borderRadius: 8,
    padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
  },
  status: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.green },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: colors.green },
  statusText: { fontWeight: 600 },
};
