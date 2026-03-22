/**
 * components/dashboard/ProviderDetailPanel.tsx
 *
 * Provider-centric detail slide-over panel.
 * Shows everything about one provider: data accuracy across sources,
 * license/credentialing, action items, and timeline.
 *
 * This is the v2 centerpiece — "What's wrong with Dr. Connaughton?"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, statusColors, statusBgColors, rosterStatusMap } from '@/lib/design-tokens';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import WorkflowDetailPanel from './WorkflowDetailPanel';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderHealth {
  npi: string;
  practice_website_id: string;
  provider_name: string;
  specialty: string | null;
  credential: string | null;
  open_issues: number;
  monitoring: number;
  resolved: number;
  total_workflows: number;
  health_score: number;
  roster_status: string;
}

interface WorkflowInstance {
  id: string;
  workflow_type: string;
  status: string;
  priority: number;
  finding_summary: string;
  finding_details: any;
  created_at: string;
  overdue_at: string | null;
  approved_value: string | null;
}

interface WorkflowEvent {
  id: string;
  workflow_id: string;
  event_type: string;
  actor_type: string;
  actor_email: string | null;
  title: string;
  details: any;
  created_at: string;
}

interface ProviderRecord {
  npi: string;
  first_name: string;
  last_name: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  taxonomy_desc: string;
  credential: string;
}

interface PracticeProvider {
  web_address: string | null;
  web_phone: string | null;
  web_specialty: string | null;
  has_license_issue: boolean;
  license_issue_type: string | null;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(Pa|Tx|Ca|Ny|Fl|Il|Oh|Nj|Nc|Va|Md|Mn|Wi|Co|Az|Or|Wa|Tn|In|Mo|Sc|Al|La|Ky|Ok|Ct|Ia|Ms|Ar|Ks|Ut|Nv|Ne|Nm|Nd|Sd|Mt|Wy|Vt|Nh|Me|Ri|De|Hi|Id|Wv|Dc)\b/g, m => m.toUpperCase())
    .replace(/\bN\b/g, 'N').replace(/\bS\b/g, 'S').replace(/\bE\b/g, 'E').replace(/\bW\b/g, 'W')
    .replace(/\bSte\b/g, 'Ste').replace(/\bExpy\b/g, 'Expy').replace(/\bSt\b/g, 'St')
    .replace(/\bDr\b/g, 'Dr').replace(/\bAve\b/g, 'Ave').replace(/\bBlvd\b/g, 'Blvd')
    .replace(/\bLn\b/g, 'Ln').replace(/\bRd\b/g, 'Rd').replace(/\bCt\b/g, 'Ct')
    .replace(/\bPl\b/g, 'Pl').replace(/\bPkwy\b/g, 'Pkwy').replace(/\bHwy\b/g, 'Hwy');
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone; // return as-is if unexpected format
}

// ─── Field label map ────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  address_line_1: 'Address', phone: 'Phone', taxonomy_desc: 'Specialty',
  primary_taxonomy_code: 'Taxonomy code', first_name: 'First name',
  last_name: 'Last name', name: 'Name', license_status: 'License status',
  credential: 'Credential', gender: 'Gender',
};

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  nppes_update: 'NPPES update',
  payer_directory: 'Payer directory update',
  onboarding: 'Provider onboarding',
  release: 'Provider departure',
  license_renewal: 'License renewal',
  compliance: 'Compliance check',
  credentialing_onboarding: 'Credentialing',
  credentialing_departure: 'Departure checklist',
};

const WORKFLOW_TYPE_ICONS: Record<string, string> = {
  nppes_update: '🔄',
  payer_directory: '🏥',
  onboarding: '🚀',
  release: '🚪',
  license_renewal: '📜',
  compliance: '◈',
  credentialing_onboarding: '📋',
  credentialing_departure: '📤',
};

const CREDENTIALING_GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  immediate: { label: 'Immediate', icon: '⚡' },
  submit_wait: { label: 'Submit & Wait', icon: '📤' },
  monitoring: { label: 'Automated Monitoring', icon: '📡' },
  complete: { label: 'Already Complete', icon: '✅' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProviderDetailPanel({
  npi,
  practiceId,
  onClose,
}: {
  npi: string | null;
  practiceId: string;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<ProviderHealth | null>(null);
  const [nppes, setNppes] = useState<ProviderRecord | null>(null);
  const [practiceProvider, setPracticeProvider] = useState<PracticeProvider | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  const fetchData = useCallback(async () => {
    if (!npi) return;
    setLoading(true);

    // Fetch provider health view
    const { data: ph } = await supabase
      .from('v_provider_health')
      .select('*')
      .eq('npi', npi)
      .eq('practice_website_id', practiceId)
      .maybeSingle();
    if (ph) setProvider(ph);

    // Fetch NPPES record
    const { data: np } = await supabase
      .from('providers')
      .select('npi, first_name, last_name, address_line_1, city, state, zip_code, phone, taxonomy_desc, credential')
      .eq('npi', npi)
      .maybeSingle();
    if (np) setNppes(np);

    // Fetch practice_providers record for website data
    const { data: pp } = await supabase
      .from('practice_providers')
      .select('web_address, web_phone, web_specialty, has_license_issue, license_issue_type')
      .eq('npi', npi)
      .eq('practice_website_id', practiceId)
      .maybeSingle();
    if (pp) setPracticeProvider(pp);

    // Fetch workflows for this provider
    const { data: wf } = await supabase
      .from('workflow_instances')
      .select('id, workflow_type, status, priority, finding_summary, finding_details, created_at, overdue_at, approved_value')
      .eq('provider_npi', npi)
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });
    if (wf) setWorkflows(wf);

    // Fetch events across all workflows for this provider
    if (wf && wf.length > 0) {
      const workflowIds = wf.map(w => w.id);
      const { data: ev } = await supabase
        .from('workflow_events')
        .select('id, workflow_id, event_type, actor_type, actor_email, title, details, created_at')
        .in('workflow_id', workflowIds)
        .order('created_at', { ascending: false })
        .limit(30);
      if (ev) setEvents(ev);
    } else {
      setEvents([]);
    }

    setLoading(false);
  }, [npi, practiceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isOpen = npi !== null;
  const displayName = titleCase(provider?.provider_name);
  const initials = displayName
    ? displayName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2)
    : '??';

  const healthColor = (provider?.health_score ?? 100) >= 80 ? colors.green
    : (provider?.health_score ?? 100) >= 50 ? colors.gold
    : colors.red;

  const rosterInfo = rosterStatusMap[provider?.roster_status || 'active'] || rosterStatusMap.active;

  const activeWorkflows = workflows.filter(w => ['action_needed', 'in_progress'].includes(w.status));
  const monitoringWorkflows = workflows.filter(w => w.status === 'awaiting');
  const resolvedWorkflows = workflows.filter(w => ['resolved', 'cancelled'].includes(w.status));

  // Credentialing workflows get special treatment
  const credentialingWorkflows = workflows.filter(w =>
    ['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type)
    && !['resolved', 'cancelled'].includes(w.status)
  );
  const nonCredentialingActive = activeWorkflows.filter(w =>
    !['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type)
  );
  const nonCredentialingMonitoring = monitoringWorkflows.filter(w =>
    !['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type)
  );

  // ── Build comparison data ─────────────────────────────────────────────────

  const nppesAddress = nppes ? titleCase(`${nppes.address_line_1}, ${nppes.city}, ${nppes.state} ${nppes.zip_code}`) : null;
  const websiteAddress = practiceProvider?.web_address ? titleCase(practiceProvider.web_address) : null;

  const comparisonFields = [
    {
      field: 'Address',
      nppes: nppesAddress,
      website: websiteAddress,
      match: nppesAddress && websiteAddress ? nppesAddress.toLowerCase().includes(websiteAddress.toLowerCase().slice(0, 10)) : null,
    },
    {
      field: 'Phone',
      nppes: formatPhone(nppes?.phone),
      website: formatPhone(practiceProvider?.web_phone),
      match: nppes?.phone && practiceProvider?.web_phone
        ? nppes.phone.replace(/\D/g, '') === practiceProvider.web_phone.replace(/\D/g, '') : null,
    },
    {
      field: 'Specialty',
      nppes: titleCase(nppes?.taxonomy_desc),
      website: titleCase(practiceProvider?.web_specialty),
      match: nppes?.taxonomy_desc && practiceProvider?.web_specialty
        ? nppes.taxonomy_desc.toLowerCase() === practiceProvider.web_specialty.toLowerCase() : null,
    },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  const sectionTitle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: colors.gray400,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,30,46,0.4)',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 560,
        background: '#fff', zIndex: 201,
        boxShadow: isOpen ? '-8px 0 32px rgba(0,0,0,0.15)' : 'none',
        overflowY: 'auto',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
      }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          padding: 20, borderBottom: `1px solid ${colors.gray200}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, background: 'none',
            border: 'none', fontSize: 20, cursor: 'pointer', color: colors.gray400,
            padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit',
          }}>×</button>

          {loading ? (
            <div style={{ fontSize: 13, color: colors.gray400, padding: '20px 0' }}>Loading...</div>
          ) : provider && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: provider.open_issues > 0 ? colors.redPale
                    : provider.monitoring > 0 ? colors.bluePale : colors.greenPale,
                  color: provider.open_issues > 0 ? colors.red
                    : provider.monitoring > 0 ? colors.blue : colors.green,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>{initials}</div>

                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>
                    {displayName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: colors.gray400 }}>
                      NPI {provider.npi}
                    </span>
                    {provider.open_issues > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: colors.redPale, color: colors.red,
                      }}>{provider.open_issues} issue{provider.open_issues !== 1 ? 's' : ''}</span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: rosterInfo.bg, color: rosterInfo.color,
                    }}>{rosterInfo.badge}</span>
                  </div>
                </div>
              </div>

              {/* Health bar */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: colors.gray200, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${provider.health_score}%`,
                    background: healthColor, borderRadius: 3, transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: colors.gray400, fontWeight: 600 }}>
                  {provider.health_score}% health
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        {!loading && provider && (
          <div style={{ padding: 20 }}>

            {/* ── Section 1: Data Accuracy Across Sources ──── */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Data accuracy across sources</div>
              <table style={{
                width: '100%', borderCollapse: 'collapse', fontSize: 11,
                border: `1px solid ${colors.gray200}`, borderRadius: 8, overflow: 'hidden',
              }}>
                <thead>
                  <tr>
                    {['Field', 'NPPES', 'Website'].map(h => (
                      <th key={h} style={{
                        padding: '6px 8px', background: colors.gray100,
                        fontWeight: 700, color: colors.gray400, textTransform: 'uppercase',
                        fontSize: 10, letterSpacing: '0.03em', textAlign: 'left',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', borderTop: `1px solid ${colors.gray100}`, fontWeight: 600 }}>
                        {row.field}
                      </td>
                      <td style={{
                        padding: '6px 8px', borderTop: `1px solid ${colors.gray100}`,
                        color: row.match === false ? colors.red : row.match === true ? colors.green : colors.gray400,
                        fontWeight: row.match === false ? 600 : 400,
                        fontStyle: !row.nppes ? 'italic' : 'normal',
                      }}>
                        {row.nppes || 'Not available'}
                      </td>
                      <td style={{
                        padding: '6px 8px', borderTop: `1px solid ${colors.gray100}`,
                        color: row.match === false ? colors.red : row.match === true ? colors.green : colors.gray400,
                        fontWeight: row.match === false ? 600 : 400,
                        fontStyle: !row.website ? 'italic' : 'normal',
                      }}>
                        {row.website || 'Not available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nppes?.credential && (
                <div style={{ fontSize: 11, color: colors.gray400, marginTop: 6 }}>
                  Credential: {nppes.credential} · Specialty: {titleCase(nppes.taxonomy_desc) || 'N/A'}
                </div>
              )}
            </div>

            {/* ── Section 2: License & Credentialing ───────── */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>License & credentialing</div>
              <div style={{
                background: colors.gray50, border: `1px solid ${colors.gray200}`,
                borderRadius: 8, padding: '12px 14px',
              }}>
                {[
                  {
                    label: `${nppes?.state || 'State'} medical license`,
                    value: practiceProvider?.has_license_issue
                      ? (practiceProvider.license_issue_type || 'Issue detected')
                      : 'Active',
                    color: practiceProvider?.has_license_issue ? colors.red : colors.green,
                    bg: practiceProvider?.has_license_issue ? colors.redPale : colors.greenPale,
                  },
                  {
                    label: 'Disciplinary',
                    value: practiceProvider?.has_license_issue && practiceProvider?.license_issue_type?.includes('disciplin')
                      ? 'Active' : 'None',
                    color: colors.green,
                    bg: colors.greenPale,
                  },
                  {
                    label: 'PECOS enrollment',
                    value: 'Enrolled',
                    color: colors.green,
                    bg: colors.greenPale,
                  },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', fontSize: 12,
                  }}>
                    <span style={{ color: colors.gray400, fontWeight: 600 }}>{row.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: row.bg, color: row.color,
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 2b: Credentialing Progress ────── */}
            {credentialingWorkflows.length > 0 && credentialingWorkflows.map(cw => {
              const assessment = cw.finding_details?.assessment || {};
              const estWeeks = cw.finding_details?.estimated_completion_weeks || 12;
              const bottleneck = cw.finding_details?.bottleneck;
              const isOnboarding = cw.workflow_type === 'credentialing_onboarding';
              const totalTasks = Object.keys(assessment).length || 9;
              const completedSources = Object.values(assessment).filter(
                (v: any) => v === 'listed_correct' || v === 'active' || v === 'enrolled'
              ).length;
              // Use open_issues count as proxy for incomplete tasks
              const tasksLabel = isOnboarding ? 'onboarding' : 'departure';

              return (
                <div key={cw.id} style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>
                    {isOnboarding ? '📋 Credentialing progress' : '📤 Departure progress'}
                  </div>
                  <div style={{
                    background: '#fff', border: `1px solid ${colors.blue}30`,
                    borderRadius: 10, padding: 16, borderLeft: `3px solid ${colors.blue}`,
                  }}>
                    {/* Progress header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy }}>
                        {cw.finding_summary}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: colors.bluePale, color: colors.blue,
                      }}>
                        {cw.status === 'in_progress' ? 'In progress' : cw.status === 'action_needed' ? 'Needs attention' : 'Monitoring'}
                      </span>
                    </div>

                    {/* Estimated timeline */}
                    <div style={{ fontSize: 11, color: colors.gray600, marginBottom: 10 }}>
                      Est. {estWeeks} weeks to full credentialing
                      {bottleneck && (
                        <span style={{ color: colors.gold, fontWeight: 600 }}>
                          {' · '}{bottleneck.charAt(0).toUpperCase() + bottleneck.slice(1)} is the bottleneck
                        </span>
                      )}
                    </div>

                    {/* Assessment snapshot */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {Object.entries(assessment).map(([source, status]: [string, any]) => {
                        const isGood = status === 'listed_correct' || status === 'active' || status === 'enrolled';
                        const needsWork = status === 'needs_update' || status === 'wrong_address' || status === 'not_listed' || status === 'needs_reassignment' || status === 'possibly_stale';
                        return (
                          <span key={source} style={{
                            fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                            background: isGood ? colors.greenPale : needsWork ? colors.redPale : colors.gray100,
                            color: isGood ? colors.green : needsWork ? colors.red : colors.gray400,
                          }}>
                            {source.toUpperCase().replace('_', ' ')}: {isGood ? '✓' : needsWork ? '✗' : '—'}
                          </span>
                        );
                      })}
                    </div>

                    {/* Open workflow button */}
                    <button
                      onClick={() => setActiveWorkflowId(cw.id)}
                      style={{
                        width: '100%', padding: '9px 14px', background: colors.navy, color: '#fff',
                        border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      View {tasksLabel} checklist →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ── Section 3: Action Items ─────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>
                Action items
                {activeWorkflows.length > 0 && (
                  <span style={{
                    marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 100, background: colors.redPale, color: colors.red,
                  }}>{activeWorkflows.length}</span>
                )}
              </div>

              {activeWorkflows.length === 0 && monitoringWorkflows.length === 0 && (
                <div style={{
                  padding: '24px 16px', textAlign: 'center', color: colors.gray400,
                  fontSize: 12, background: colors.gray50, borderRadius: 8,
                  border: `1px solid ${colors.gray200}`,
                }}>
                  No open action items — all clear!
                </div>
              )}

              {activeWorkflows.map(w => {
                const dotColor = w.status === 'action_needed' ? colors.red : colors.gold;
                const details = w.finding_details || {};
                const fieldLabel = FIELD_LABELS[details.field] || details.field || '';
                const isExpanded = expandedAction === w.id;
                const isPhone = details.field === 'phone';
                const isAddr = details.field === 'address_line_1';
                const fmtVal = (v: string) => isPhone ? formatPhone(v) : isAddr ? titleCase(v) : titleCase(v);
                const isMismatch = w.workflow_type === 'nppes_update' && details.field;
                const typeLabel = WORKFLOW_TYPE_LABELS[w.workflow_type] || w.workflow_type;
                const typeIcon = WORKFLOW_TYPE_ICONS[w.workflow_type] || '📋';

                return (
                  <div key={w.id} style={{ marginBottom: 6 }}>
                    <div
                      onClick={() => isMismatch ? setExpandedAction(isExpanded ? null : w.id) : setActiveWorkflowId(w.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', background: '#fff',
                        border: `1px solid ${isExpanded ? colors.navy : colors.gray200}`,
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dotColor, marginTop: 5, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                          {isMismatch
                            ? `${fieldLabel} mismatch`
                            : `${typeIcon} ${w.finding_summary || typeLabel}`}
                        </div>
                        <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                          {isMismatch ? (
                            <>
                              {details.website_value && details.nppes_value
                                ? `${fmtVal(details.website_value)} (website) vs ${fmtVal(details.nppes_value)} (NPPES)`
                                : w.finding_summary}
                              {w.approved_value ? ` · Approved: ${fmtVal(w.approved_value)}` : ' · Approve correction'}
                            </>
                          ) : (
                            <>
                              {typeLabel}
                              {' · '}
                              {w.status === 'action_needed' ? 'Needs attention' : 'In progress'}
                            </>
                          )}
                        </div>
                      </div>
                      {isMismatch ? (
                        <span style={{ fontSize: 10, color: colors.gray400, flexShrink: 0, marginTop: 4 }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: colors.blue, flexShrink: 0, marginTop: 2 }}>
                          Open →
                        </span>
                      )}
                    </div>

                    {/* Expanded: show correction details (only for mismatch workflows) */}
                    {isMismatch && isExpanded && (
                      <div style={{
                        marginTop: -1, padding: 14, background: colors.gray50,
                        border: `1px solid ${colors.navy}`, borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                      }}>
                        {details.nppes_value && details.website_value && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: colors.gray400, marginBottom: 4 }}>COMPARISON</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{
                                flex: 1, padding: '8px 10px', background: '#fff',
                                border: `1px solid ${colors.gray200}`, borderRadius: 6,
                              }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: colors.gray400, textTransform: 'uppercase' }}>Website</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy, marginTop: 2 }}>{fmtVal(details.website_value)}</div>
                              </div>
                              <div style={{
                                flex: 1, padding: '8px 10px', background: '#fff',
                                border: `1px solid ${colors.gray200}`, borderRadius: 6,
                              }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: colors.gray400, textTransform: 'uppercase' }}>NPPES</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy, marginTop: 2 }}>{fmtVal(details.nppes_value)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                            background: statusBgColors[w.status as keyof typeof statusBgColors] || colors.gray100,
                            color: statusColors[w.status as keyof typeof statusColors] || colors.gray600,
                            textTransform: 'uppercase',
                          }}>
                            {w.status === 'action_needed' ? 'Needs action' : w.status === 'in_progress' ? 'In progress' : w.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveWorkflowId(w.id);
                            }}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              fontSize: 11, fontWeight: 600, color: colors.blue,
                              textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Open workflow →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Monitoring items */}
              {monitoringWorkflows.map(w => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px', background: '#fff',
                  border: `1px solid ${colors.gray200}`, borderRadius: 8,
                  marginBottom: 6, cursor: 'pointer',
                }}
                  onClick={() => setActiveWorkflowId(w.id)}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: colors.blue, marginTop: 5, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                      {w.finding_summary || 'Monitoring correction'}
                    </div>
                    <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                      Awaiting confirmation · Approved: {w.approved_value || 'N/A'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.blue, flexShrink: 0, marginTop: 2 }}>
                    Open →
                  </span>
                </div>
              ))}
            </div>

            {/* ── Section 4: Timeline ─────────────────────── */}
            {events.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Timeline</div>
                <div style={{ paddingTop: 4 }}>
                  {events.slice(0, 15).map((ev, i) => {
                    const dotColor = ev.event_type === 'created' ? colors.blue
                      : ev.event_type === 'approved' ? colors.green
                      : ev.event_type === 'form_downloaded' ? colors.navy
                      : ev.event_type === 'submitted' ? colors.gold
                      : ev.event_type === 'overdue' ? colors.red
                      : ev.event_type === 'auto_confirmed' || ev.event_type === 'completed' ? colors.green
                      : ev.event_type === 'cancelled' || ev.event_type === 'workflow_cancelled' ? colors.gray400
                      : colors.gold;

                    return (
                      <div key={ev.id} style={{
                        display: 'flex', gap: 12, paddingBottom: 12, position: 'relative',
                      }}>
                        {i < Math.min(events.length, 15) - 1 && (
                          <div style={{
                            position: 'absolute', left: 4, top: 14, bottom: 0,
                            width: 1, background: colors.gray200,
                          }} />
                        )}
                        <div style={{
                          width: 9, height: 9, borderRadius: '50%', background: dotColor,
                          flexShrink: 0, marginTop: 3, zIndex: 1,
                        }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: colors.navy }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: 11, color: colors.gray400 }}>
                            {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}
                            {ev.actor_email || ev.actor_type || 'System'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Resolved / Past Items ───────────────────── */}
            {resolvedWorkflows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={sectionTitle}>Resolved ({resolvedWorkflows.length})</div>
                {resolvedWorkflows.slice(0, 5).map(w => (
                  <div key={w.id} onClick={() => setActiveWorkflowId(w.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px', background: colors.gray50,
                    border: `1px solid ${colors.gray200}`, borderRadius: 8,
                    marginBottom: 4, fontSize: 12, color: colors.gray400,
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = colors.navy)}
                    onMouseOut={e => (e.currentTarget.style.borderColor = colors.gray200)}
                  >
                    <span style={{ color: w.status === 'resolved' ? colors.green : colors.gray400 }}>
                      {w.status === 'resolved' ? '✓' : '✕'}
                    </span>
                    <span style={{ flex: 1 }}>{w.finding_summary || WORKFLOW_TYPE_LABELS[w.workflow_type] || w.workflow_type}</span>
                    <span style={{ fontSize: 10 }}>
                      {new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Provider Reference ─────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionTitle}>Provider reference</div>
              <div style={{
                padding: '10px 14px', background: colors.gray50, borderRadius: 8,
                border: `1px solid ${colors.gray200}`, fontSize: 12,
              }}>
                {[
                  { label: 'NPI', value: provider.npi, mono: true },
                  { label: 'Specialty', value: titleCase(provider.specialty) || 'N/A' },
                  { label: 'Credential', value: provider.credential || 'N/A' },
                  { label: 'Status', value: rosterInfo.badge },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: i < 3 ? 4 : 0,
                  }}>
                    <span style={{ color: colors.gray400, fontWeight: 600 }}>{row.label}</span>
                    <span style={{
                      color: colors.navy, fontWeight: 600,
                      fontFamily: row.mono ? 'monospace' : 'inherit',
                      fontSize: row.mono ? 11 : 12,
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WorkflowDetailPanel — opens on top of provider panel */}
      {activeWorkflowId && (
        <WorkflowDetailPanel
          workflowId={activeWorkflowId}
          practiceId={practiceId}
          onClose={() => {
            setActiveWorkflowId(null);
            // Refresh data when closing workflow detail in case status changed
            fetchData();
          }}
        />
      )}
    </>
  );
}
