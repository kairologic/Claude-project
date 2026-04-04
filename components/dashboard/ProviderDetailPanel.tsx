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
import CredentialingTimeline from './CredentialingTimeline';

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
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(
      /\b(Pa|Tx|Ca|Ny|Fl|Il|Oh|Nj|Nc|Va|Md|Mn|Wi|Co|Az|Or|Wa|Tn|In|Mo|Sc|Al|La|Ky|Ok|Ct|Ia|Ms|Ar|Ks|Ut|Nv|Ne|Nm|Nd|Sd|Mt|Wy|Vt|Nh|Me|Ri|De|Hi|Id|Wv|Dc)\b/g,
      (m) => m.toUpperCase(),
    )
    .replace(/\bN\b/g, 'N')
    .replace(/\bS\b/g, 'S')
    .replace(/\bE\b/g, 'E')
    .replace(/\bW\b/g, 'W')
    .replace(/\bSte\b/g, 'Ste')
    .replace(/\bExpy\b/g, 'Expy')
    .replace(/\bSt\b/g, 'St')
    .replace(/\bDr\b/g, 'Dr')
    .replace(/\bAve\b/g, 'Ave')
    .replace(/\bBlvd\b/g, 'Blvd')
    .replace(/\bLn\b/g, 'Ln')
    .replace(/\bRd\b/g, 'Rd')
    .replace(/\bCt\b/g, 'Ct')
    .replace(/\bPl\b/g, 'Pl')
    .replace(/\bPkwy\b/g, 'Pkwy')
    .replace(/\bHwy\b/g, 'Hwy');
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
  address_line_1: 'Address',
  phone: 'Phone',
  taxonomy_desc: 'Specialty',
  primary_taxonomy_code: 'Taxonomy code',
  first_name: 'First name',
  last_name: 'Last name',
  name: 'Name',
  license_status: 'License status',
  credential: 'Credential',
  gender: 'Gender',
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
  const [credentialingTasks, setCredentialingTasks] = useState<Record<string, any[]>>({});
  const [payerSnapshots, setPayerSnapshots] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentialing' | 'history'>('overview');

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

    // Fetch NPPES record
    const { data: np } = await supabase
      .from('providers')
      .select(
        'npi, first_name, last_name, address_line_1, city, state, zip_code, phone, taxonomy_desc, credential',
      )
      .eq('npi', npi)
      .maybeSingle();
    if (np) setNppes(np);

    // Fetch practice_providers record for website data
    const { data: pp } = await supabase
      .from('practice_providers')
      .select(
        'web_address, web_phone, web_specialty, has_license_issue, license_issue_type, provider_name, roster_status, active_mismatch_count',
      )
      .eq('npi', npi)
      .eq('practice_website_id', practiceId)
      .maybeSingle();
    if (pp) setPracticeProvider(pp);

    if (ph) {
      setProvider(ph);
    } else if (pp) {
      // Fallback for departed/filtered-out providers: build from practice_providers + NPPES
      const fallbackName =
        (pp as any).provider_name ||
        (np ? `${np.first_name || ''} ${np.last_name || ''}`.trim() : `NPI ${npi}`);
      setProvider({
        npi,
        practice_website_id: practiceId,
        provider_name: fallbackName,
        specialty: pp.web_specialty || np?.taxonomy_desc || null,
        credential: np?.credential || null,
        open_issues: 0,
        monitoring: 0,
        resolved: 0,
        total_workflows: 0,
        health_score: 100,
        roster_status: (pp as any).roster_status || 'departed',
      });
    }

    // Fetch latest payer directory snapshots for this NPI
    const { data: snaps } = await supabase
      .from('payer_directory_snapshots')
      .select(
        'payer_code, listed_address_line1, listed_city, listed_state, listed_phone, listed_specialty_display, listed_accepting_patients, snapshot_date',
      )
      .eq('npi', npi)
      .order('snapshot_date', { ascending: false });
    const latestByPayer: Record<string, any> = {};
    for (const s of snaps || []) {
      if (!latestByPayer[s.payer_code]) latestByPayer[s.payer_code] = s;
    }
    setPayerSnapshots(latestByPayer);

    // Fetch workflows for this provider
    const { data: wf } = await supabase
      .from('workflow_instances')
      .select(
        'id, workflow_type, status, priority, finding_summary, finding_details, created_at, overdue_at, approved_value',
      )
      .eq('provider_npi', npi)
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });
    if (wf) setWorkflows(wf);

    // Fetch events across all workflows for this provider
    if (wf && wf.length > 0) {
      const workflowIds = wf.map((w) => w.id);
      const { data: ev } = await supabase
        .from('workflow_events')
        .select('id, workflow_id, event_type, actor_type, actor_email, title, details, created_at')
        .in('workflow_id', workflowIds)
        .order('created_at', { ascending: false })
        .limit(30);
      if (ev) setEvents(ev);
      // Also fetch tasks for credentialing workflows (for timeline)
      const credWfs = wf.filter(
        (w) =>
          ['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type) &&
          !['resolved', 'cancelled'].includes(w.status),
      );
      if (credWfs.length > 0) {
        const { data: tasks } = await supabase
          .from('workflow_tasks')
          .select('workflow_id, task_type, status, metadata')
          .in(
            'workflow_id',
            credWfs.map((c) => c.id),
          );
        const grouped: Record<string, any[]> = {};
        for (const t of tasks || []) {
          if (!grouped[t.workflow_id]) grouped[t.workflow_id] = [];
          grouped[t.workflow_id].push(t);
        }
        setCredentialingTasks(grouped);
      } else {
        setCredentialingTasks({});
      }
    } else {
      setEvents([]);
      setCredentialingTasks({});
    }

    setLoading(false);
  }, [npi, practiceId]);

  useEffect(() => {
    fetchData();
    setActiveTab('overview'); // Reset tab when provider changes
  }, [fetchData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isOpen = npi !== null;
  const displayName = titleCase(provider?.provider_name);
  const initials = displayName
    ? displayName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
    : '??';

  const healthColor =
    (provider?.health_score ?? 100) >= 80
      ? colors.green
      : (provider?.health_score ?? 100) >= 50
        ? colors.gold
        : colors.red;

  const rosterInfo = rosterStatusMap[provider?.roster_status || 'active'] || rosterStatusMap.active;

  const activeWorkflows = workflows.filter((w) =>
    ['action_needed', 'in_progress'].includes(w.status),
  );
  const monitoringWorkflows = workflows.filter((w) => w.status === 'awaiting');
  const resolvedWorkflows = workflows.filter((w) => ['resolved', 'cancelled'].includes(w.status));

  // Credentialing workflows get special treatment
  const credentialingWorkflows = workflows.filter(
    (w) =>
      ['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type) &&
      !['resolved', 'cancelled'].includes(w.status),
  );
  // Auto-switch to credentialing tab when provider has an active credentialing workflow
  useEffect(() => {
    if (credentialingWorkflows.length > 0 && !loading) {
      setActiveTab('credentialing');
    }
  }, [credentialingWorkflows.length, loading]);

  const nonCredentialingActive = activeWorkflows.filter(
    (w) => !['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type),
  );
  const nonCredentialingMonitoring = monitoringWorkflows.filter(
    (w) => !['credentialing_onboarding', 'credentialing_departure'].includes(w.workflow_type),
  );

  // ── Build comparison data ─────────────────────────────────────────────────

  const nppesAddress = nppes
    ? titleCase(`${nppes.address_line_1}, ${nppes.city}, ${nppes.state} ${nppes.zip_code}`)
    : null;
  const websiteAddress = practiceProvider?.web_address
    ? titleCase(practiceProvider.web_address)
    : null;

  // Payer columns for comparison grid (order: NPPES, 6 payers, Website)
  const PAYER_COLS: { code: string; label: string; dbCode?: string }[] = [
    { code: 'nppes', label: 'NPPES' },
    { code: 'uhc', label: 'UHC' },
    { code: 'aetna', label: 'Aetna' },
    { code: 'cigna', label: 'Cigna' },
    { code: 'humana', label: 'Humana' },
    { code: 'bcbs_tx', label: 'BCBS TX' },
    { code: 'bcbs_ca', label: 'BSC CA' },
    { code: 'website', label: 'Website' },
  ];

  // Build per-source values for each field row
  function getPayerValue(
    code: string,
    field: 'address' | 'phone' | 'specialty' | 'accepting_patients',
  ): string | null {
    if (code === 'nppes') {
      if (field === 'address') return nppesAddress;
      if (field === 'phone') return formatPhone(nppes?.phone);
      if (field === 'specialty') return titleCase(nppes?.taxonomy_desc);
    }
    if (code === 'website') {
      if (field === 'address') return websiteAddress;
      if (field === 'phone') return formatPhone(practiceProvider?.web_phone);
      if (field === 'specialty') return titleCase(practiceProvider?.web_specialty);
    }
    const snap = payerSnapshots[code];
    if (!snap) return null;
    if (field === 'address')
      return snap.listed_address_line1
        ? titleCase(
            `${snap.listed_address_line1}, ${snap.listed_city || ''}, ${snap.listed_state || ''}`,
          )
        : null;
    if (field === 'phone') return formatPhone(snap.listed_phone);
    if (field === 'specialty')
      return snap.listed_specialty_display ? titleCase(snap.listed_specialty_display) : null;
    if (field === 'accepting_patients') {
      if (snap.listed_accepting_patients === true) return 'Yes';
      if (snap.listed_accepting_patients === false) return 'No';
      return null;
    }
    return null;
  }

  const comparisonRows: {
    field: string;
    key: 'address' | 'phone' | 'specialty' | 'accepting_patients';
  }[] = [
    { field: 'Address', key: 'address' },
    { field: 'Phone', key: 'phone' },
    { field: 'Specialty', key: 'specialty' },
    { field: 'Accepting Patients', key: 'accepting_patients' },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────

  const sectionTitle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,30,46,0.4)',
            zIndex: 200,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 560,
          background: '#fff',
          zIndex: 201,
          boxShadow: isOpen ? '-8px 0 32px rgba(0,0,0,0.15)' : 'none',
          overflowY: 'auto',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            padding: 20,
            borderBottom: `1px solid ${colors.gray200}`,
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1,
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: colors.gray400,
              padding: '4px 8px',
              borderRadius: 6,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>

          {loading ? (
            <div style={{ fontSize: 13, color: colors.gray400, padding: '20px 0' }}>Loading...</div>
          ) : (
            provider && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background:
                        provider.open_issues > 0
                          ? colors.redPale
                          : provider.monitoring > 0
                            ? colors.bluePale
                            : colors.greenPale,
                      color:
                        provider.open_issues > 0
                          ? colors.red
                          : provider.monitoring > 0
                            ? colors.blue
                            : colors.green,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>
                      {displayName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span
                        style={{ fontFamily: 'monospace', fontSize: 11, color: colors.gray400 }}
                      >
                        NPI {provider.npi}
                      </span>
                      {provider.open_issues > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 100,
                            background: colors.redPale,
                            color: colors.red,
                          }}
                        >
                          {provider.open_issues} issue{provider.open_issues !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 100,
                          background: rosterInfo.bg,
                          color: rosterInfo.color,
                        }}
                      >
                        {rosterInfo.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Health bar */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: colors.gray200,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${provider.health_score}%`,
                        background: healthColor,
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: colors.gray400, fontWeight: 600 }}>
                    {provider.health_score}% health
                  </span>
                </div>
              </>
            )
          )}
        </div>

        {/* ── Tab bar ──────────────────────────────────────── */}
        {!loading && provider && (
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${colors.gray200}`,
              padding: '0 20px',
              background: '#fff',
            }}
          >
            {(
              [
                { key: 'overview', label: 'Overview' },
                ...(credentialingWorkflows.length > 0
                  ? [
                      {
                        key: 'credentialing',
                        label:
                          credentialingWorkflows[0]?.workflow_type === 'credentialing_departure'
                            ? 'Departure'
                            : 'Credentialing',
                      },
                    ]
                  : []),
                { key: 'history', label: 'History' },
              ] as { key: typeof activeTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: activeTab === tab.key ? colors.navy : colors.gray400,
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.key ? `2px solid ${colors.navy}` : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                {tab.key === 'history' && activeWorkflows.length > 0 && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 100,
                      background: colors.redPale,
                      color: colors.red,
                    }}
                  >
                    {activeWorkflows.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────── */}
        {!loading && provider && (
          <div style={{ padding: 20 }}>
            {/* ═══════ OVERVIEW TAB ═══════ */}
            {activeTab === 'overview' && (
              <>
                {/* Data Accuracy Across Sources */}
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>Data accuracy across sources</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        minWidth: 600,
                        borderCollapse: 'collapse',
                        fontSize: 10,
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: '5px 6px',
                              background: colors.gray100,
                              fontWeight: 700,
                              color: colors.gray400,
                              textTransform: 'uppercase',
                              fontSize: 9,
                              letterSpacing: '0.03em',
                              textAlign: 'left',
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                            }}
                          >
                            Field
                          </th>
                          {PAYER_COLS.map((col) => (
                            <th
                              key={col.code}
                              style={{
                                padding: '5px 4px',
                                background: colors.gray100,
                                fontWeight: 700,
                                color: colors.gray400,
                                textTransform: 'uppercase',
                                fontSize: 9,
                                letterSpacing: '0.03em',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row, i) => {
                          const nppesVal = getPayerValue('nppes', row.key);
                          return (
                            <tr key={i}>
                              <td
                                style={{
                                  padding: '5px 6px',
                                  borderTop: `1px solid ${colors.gray100}`,
                                  fontWeight: 600,
                                  position: 'sticky',
                                  left: 0,
                                  background: 'white',
                                  zIndex: 1,
                                }}
                              >
                                {row.field}
                              </td>
                              {PAYER_COLS.map((col) => {
                                const val = getPayerValue(col.code, row.key);
                                const isMatch =
                                  val && nppesVal
                                    ? val.toLowerCase().slice(0, 12) ===
                                      nppesVal.toLowerCase().slice(0, 12)
                                    : null;
                                const isMissing = !val;
                                return (
                                  <td
                                    key={col.code}
                                    style={{
                                      padding: '5px 4px',
                                      borderTop: `1px solid ${colors.gray100}`,
                                      color: isMissing
                                        ? colors.gray200
                                        : isMatch === false
                                          ? colors.red
                                          : isMatch === true
                                            ? colors.green
                                            : colors.gray400,
                                      fontWeight: isMatch === false ? 600 : 400,
                                      fontStyle: isMissing ? 'italic' : 'normal',
                                      fontSize: 10,
                                      maxWidth: 120,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={val || undefined}
                                  >
                                    {val || (col.code === 'bcbs_ca' ? 'Pending' : '—')}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {nppes?.credential && (
                    <div style={{ fontSize: 11, color: colors.gray400, marginTop: 6 }}>
                      Credential: {nppes.credential} · Specialty:{' '}
                      {titleCase(nppes.taxonomy_desc) || 'N/A'}
                    </div>
                  )}
                </div>

                {/* License & Credentialing */}
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>License & credentialing</div>
                  <div
                    style={{
                      background: colors.gray50,
                      border: `1px solid ${colors.gray200}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                    }}
                  >
                    {[
                      {
                        label: `${nppes?.state || 'State'} medical license`,
                        value: practiceProvider?.has_license_issue
                          ? practiceProvider.license_issue_type || 'Issue detected'
                          : 'Active',
                        color: practiceProvider?.has_license_issue ? colors.red : colors.green,
                        bg: practiceProvider?.has_license_issue ? colors.redPale : colors.greenPale,
                      },
                      {
                        label: 'Disciplinary',
                        value:
                          practiceProvider?.has_license_issue &&
                          practiceProvider?.license_issue_type?.includes('disciplin')
                            ? 'Active'
                            : 'None',
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
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 0',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: colors.gray400, fontWeight: 600 }}>{row.label}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 100,
                            background: row.bg,
                            color: row.color,
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Provider Reference */}
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>Provider reference</div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: colors.gray50,
                      borderRadius: 8,
                      border: `1px solid ${colors.gray200}`,
                      fontSize: 12,
                    }}
                  >
                    {[
                      { label: 'NPI', value: provider.npi, mono: true },
                      { label: 'Specialty', value: titleCase(provider.specialty) || 'N/A' },
                      { label: 'Credential', value: provider.credential || 'N/A' },
                      { label: 'Status', value: rosterInfo.badge },
                    ].map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: i < 3 ? 4 : 0,
                        }}
                      >
                        <span style={{ color: colors.gray400, fontWeight: 600 }}>{row.label}</span>
                        <span
                          style={{
                            color: colors.navy,
                            fontWeight: 600,
                            fontFamily: row.mono ? 'monospace' : 'inherit',
                            fontSize: row.mono ? 11 : 12,
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ═══════ CREDENTIALING TAB ═══════ */}
            {activeTab === 'credentialing' && credentialingWorkflows.length > 0 && (
              <>
                {credentialingWorkflows.map((cw) => {
                  const estWeeks = cw.finding_details?.estimated_completion_weeks || 12;
                  const bottleneck = cw.finding_details?.bottleneck;
                  const isOnboarding = cw.workflow_type === 'credentialing_onboarding';
                  const tasksLabel = isOnboarding ? 'onboarding' : 'departure';
                  const cwTasks = credentialingTasks[cw.id] || [];

                  // Compute task group counts
                  const immediateTasks = cwTasks.filter((t) => t.metadata?.group === 'immediate');
                  const submitTasks = cwTasks.filter((t) => t.metadata?.group === 'submit_wait');
                  const monitorTasks = cwTasks.filter((t) => t.metadata?.group === 'monitoring');
                  const completedCount = cwTasks.filter((t) => t.status === 'completed').length;

                  return (
                    <div key={cw.id}>
                      {/* Status header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>
                            {isOnboarding ? 'Provider Onboarding' : 'Provider Departure'}
                          </div>
                          <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                            {completedCount}/{cwTasks.length} tasks complete · Est. {estWeeks} weeks
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 100,
                            background:
                              cw.status === 'action_needed' ? colors.redPale : colors.bluePale,
                            color: cw.status === 'action_needed' ? colors.red : colors.blue,
                          }}
                        >
                          {cw.status === 'in_progress'
                            ? 'In progress'
                            : cw.status === 'action_needed'
                              ? 'Needs attention'
                              : 'Monitoring'}
                        </span>
                      </div>

                      {/* Timeline visualization — full width, breathing room */}
                      <div
                        style={{
                          background: colors.gray50,
                          border: `1px solid ${colors.gray200}`,
                          borderRadius: 10,
                          padding: '16px 20px',
                          marginBottom: 20,
                        }}
                      >
                        <CredentialingTimeline
                          workflowType={
                            cw.workflow_type as
                              | 'credentialing_onboarding'
                              | 'credentialing_departure'
                          }
                          tasks={cwTasks}
                          estimatedWeeks={estWeeks}
                          createdAt={cw.created_at}
                        />
                        {bottleneck && (
                          <div
                            style={{
                              fontSize: 11,
                              color: colors.gold,
                              fontWeight: 600,
                              marginTop: 8,
                              textAlign: 'center',
                            }}
                          >
                            Bottleneck: {bottleneck.charAt(0).toUpperCase() + bottleneck.slice(1)}
                          </div>
                        )}
                      </div>

                      {/* Task group summary cards */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 8,
                          marginBottom: 20,
                        }}
                      >
                        {[
                          {
                            label: 'Immediate',
                            tasks: immediateTasks,
                            icon: '⚡',
                            accent: colors.red,
                          },
                          {
                            label: 'Submit & Wait',
                            tasks: submitTasks,
                            icon: '📤',
                            accent: colors.gold,
                          },
                          {
                            label: 'Monitoring',
                            tasks: monitorTasks,
                            icon: '📡',
                            accent: colors.blue,
                          },
                        ].map((group) => {
                          const done = group.tasks.filter((t) => t.status === 'completed').length;
                          return (
                            <div
                              key={group.label}
                              style={{
                                padding: '12px 10px',
                                background: '#fff',
                                border: `1px solid ${colors.gray200}`,
                                borderRadius: 8,
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontSize: 16, marginBottom: 4 }}>{group.icon}</div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: colors.gray400,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {group.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color:
                                    done === group.tasks.length && group.tasks.length > 0
                                      ? colors.green
                                      : colors.navy,
                                  marginTop: 2,
                                }}
                              >
                                {done}/{group.tasks.length}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Task list — compact */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={sectionTitle}>All tasks</div>
                        {cwTasks
                          .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
                          .map((t, i) => {
                            const isDone = t.status === 'completed';
                            const isActive = t.status === 'active';
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '8px 10px',
                                  borderBottom: `1px solid ${colors.gray100}`,
                                  opacity: isDone ? 0.5 : 1,
                                }}
                              >
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    background: isDone
                                      ? colors.green
                                      : isActive
                                        ? colors.blue
                                        : colors.gray200,
                                    color: isDone || isActive ? '#fff' : colors.gray400,
                                  }}
                                >
                                  {isDone ? '✓' : isActive ? '→' : i + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: isActive ? 700 : 500,
                                      color: colors.navy,
                                      textDecoration: isDone ? 'line-through' : 'none',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {t.title}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    flexShrink: 0,
                                    textTransform: 'uppercase',
                                    background:
                                      t.metadata?.group === 'immediate'
                                        ? colors.redPale
                                        : t.metadata?.group === 'submit_wait'
                                          ? '#FFF8E1'
                                          : t.metadata?.group === 'monitoring'
                                            ? colors.bluePale
                                            : colors.gray100,
                                    color:
                                      t.metadata?.group === 'immediate'
                                        ? colors.red
                                        : t.metadata?.group === 'submit_wait'
                                          ? '#F57F17'
                                          : t.metadata?.group === 'monitoring'
                                            ? colors.blue
                                            : colors.gray400,
                                  }}
                                >
                                  {t.metadata?.group === 'immediate'
                                    ? 'Now'
                                    : t.metadata?.group === 'submit_wait'
                                      ? 'Submit'
                                      : t.metadata?.group === 'monitoring'
                                        ? 'Auto'
                                        : ''}
                                </span>
                              </div>
                            );
                          })}
                      </div>

                      {/* Open full checklist button */}
                      <button
                        onClick={() => setActiveWorkflowId(cw.id)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: colors.navy,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Open full {tasksLabel} checklist →
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* ═══════ HISTORY TAB ═══════ */}
            {activeTab === 'history' && (
              <>
                {/* Action Items */}
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>
                    Action items
                    {activeWorkflows.length > 0 && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 100,
                          background: colors.redPale,
                          color: colors.red,
                        }}
                      >
                        {activeWorkflows.length}
                      </span>
                    )}
                  </div>

                  {activeWorkflows.length === 0 && monitoringWorkflows.length === 0 && (
                    <div
                      style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        color: colors.gray400,
                        fontSize: 12,
                        background: colors.gray50,
                        borderRadius: 8,
                        border: `1px solid ${colors.gray200}`,
                      }}
                    >
                      No open action items — all clear!
                    </div>
                  )}

                  {activeWorkflows.map((w) => {
                    const dotColor = w.status === 'action_needed' ? colors.red : colors.gold;
                    const details = w.finding_details || {};
                    const fieldLabel = FIELD_LABELS[details.field] || details.field || '';
                    const isExpanded = expandedAction === w.id;
                    const isPhone = details.field === 'phone';
                    const isAddr = details.field === 'address_line_1';
                    const fmtVal = (v: string) =>
                      isPhone ? formatPhone(v) : isAddr ? titleCase(v) : titleCase(v);
                    const isMismatch = w.workflow_type === 'nppes_update' && details.field;
                    const typeLabel = WORKFLOW_TYPE_LABELS[w.workflow_type] || w.workflow_type;
                    const typeIcon = WORKFLOW_TYPE_ICONS[w.workflow_type] || '📋';

                    return (
                      <div key={w.id} style={{ marginBottom: 6 }}>
                        <div
                          onClick={() =>
                            isMismatch
                              ? setExpandedAction(isExpanded ? null : w.id)
                              : setActiveWorkflowId(w.id)
                          }
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 14px',
                            background: '#fff',
                            border: `1px solid ${isExpanded ? colors.navy : colors.gray200}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: dotColor,
                              marginTop: 5,
                              flexShrink: 0,
                            }}
                          />
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
                                  {w.approved_value
                                    ? ` · Approved: ${fmtVal(w.approved_value)}`
                                    : ' · Approve correction'}
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
                            <span
                              style={{
                                fontSize: 10,
                                color: colors.gray400,
                                flexShrink: 0,
                                marginTop: 4,
                              }}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: colors.blue,
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              Open →
                            </span>
                          )}
                        </div>

                        {/* Expanded: show correction details (only for mismatch workflows) */}
                        {isMismatch && isExpanded && (
                          <div
                            style={{
                              marginTop: -1,
                              padding: 14,
                              background: colors.gray50,
                              border: `1px solid ${colors.navy}`,
                              borderTop: 'none',
                              borderRadius: '0 0 8px 8px',
                            }}
                          >
                            {details.nppes_value && details.website_value && (
                              <div style={{ marginBottom: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: colors.gray400,
                                    marginBottom: 4,
                                  }}
                                >
                                  COMPARISON
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      background: '#fff',
                                      border: `1px solid ${colors.gray200}`,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: colors.gray400,
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      Website
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: colors.navy,
                                        marginTop: 2,
                                      }}
                                    >
                                      {fmtVal(details.website_value)}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      background: '#fff',
                                      border: `1px solid ${colors.gray200}`,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: colors.gray400,
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      NPPES
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: colors.navy,
                                        marginTop: 2,
                                      }}
                                    >
                                      {fmtVal(details.nppes_value)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 100,
                                  background:
                                    statusBgColors[w.status as keyof typeof statusBgColors] ||
                                    colors.gray100,
                                  color:
                                    statusColors[w.status as keyof typeof statusColors] ||
                                    colors.gray600,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {w.status === 'action_needed'
                                  ? 'Needs action'
                                  : w.status === 'in_progress'
                                    ? 'In progress'
                                    : w.status}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveWorkflowId(w.id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: colors.blue,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
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
                  {monitoringWorkflows.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 14px',
                        background: '#fff',
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: 'pointer',
                      }}
                      onClick={() => setActiveWorkflowId(w.id)}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: colors.blue,
                          marginTop: 5,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                          {w.finding_summary || 'Monitoring correction'}
                        </div>
                        <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                          Awaiting confirmation · Approved: {w.approved_value || 'N/A'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.blue,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
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
                        const dotColor =
                          ev.event_type === 'created'
                            ? colors.blue
                            : ev.event_type === 'approved'
                              ? colors.green
                              : ev.event_type === 'form_downloaded'
                                ? colors.navy
                                : ev.event_type === 'submitted'
                                  ? colors.gold
                                  : ev.event_type === 'overdue'
                                    ? colors.red
                                    : ev.event_type === 'auto_confirmed' ||
                                        ev.event_type === 'completed'
                                      ? colors.green
                                      : ev.event_type === 'cancelled' ||
                                          ev.event_type === 'workflow_cancelled'
                                        ? colors.gray400
                                        : colors.gold;

                        return (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              gap: 12,
                              paddingBottom: 12,
                              position: 'relative',
                            }}
                          >
                            {i < Math.min(events.length, 15) - 1 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 4,
                                  top: 14,
                                  bottom: 0,
                                  width: 1,
                                  background: colors.gray200,
                                }}
                              />
                            )}
                            <div
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: dotColor,
                                flexShrink: 0,
                                marginTop: 3,
                                zIndex: 1,
                              }}
                            />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: colors.navy }}>
                                {ev.title}
                              </div>
                              <div style={{ fontSize: 11, color: colors.gray400 }}>
                                {new Date(ev.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
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
                    {resolvedWorkflows.slice(0, 5).map((w) => (
                      <div
                        key={w.id}
                        onClick={() => setActiveWorkflowId(w.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 14px',
                          background: colors.gray50,
                          border: `1px solid ${colors.gray200}`,
                          borderRadius: 8,
                          marginBottom: 4,
                          fontSize: 12,
                          color: colors.gray400,
                          cursor: 'pointer',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = colors.navy)}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = colors.gray200)}
                      >
                        <span
                          style={{ color: w.status === 'resolved' ? colors.green : colors.gray400 }}
                        >
                          {w.status === 'resolved' ? '✓' : '✕'}
                        </span>
                        <span style={{ flex: 1 }}>
                          {w.finding_summary ||
                            WORKFLOW_TYPE_LABELS[w.workflow_type] ||
                            w.workflow_type}
                        </span>
                        <span style={{ fontSize: 10 }}>
                          {new Date(w.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
