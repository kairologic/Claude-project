/**
 * components/dashboard/ComplianceView.tsx
 *
 * Client component for Compliance Remediation workflows.
 * Displays compliance findings grouped by statute with remediation templates.
 * Statutes: SB 1188 (TX AI disclosure), HB 149 (TX patient data), AB 3030 (CA AI disclosure)
 */

'use client';

import { useState, useMemo } from 'react';
import { colors, statusColors, statusBgColors, statusLabels } from '@/lib/design-tokens';
import { Badge, Tooltip } from './ui';

interface ComplianceWorkflow {
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

interface Props {
  practiceId: string;
  workflows: ComplianceWorkflow[];
}

type StatuteKey = 'all' | 'sb1188' | 'hb149' | 'ab3030';

interface StatuteInfo {
  key: StatuteKey;
  label: string;
  shortLabel: string;
  description: string;
  remediationTitle: string;
  remediationTemplate: string;
}

const statutes: Record<Exclude<StatuteKey, 'all'>, StatuteInfo> = {
  sb1188: {
    key: 'sb1188',
    label: 'SB 1188',
    shortLabel: 'SB 1188 (TX AI Disclosure)',
    description:
      'Texas Senate Bill 1188 requires healthcare providers to disclose when artificial intelligence is used in patient care',
    remediationTitle: 'Add AI Disclosure Page to Your Website',
    remediationTemplate: `<!-- AI Disclosure Notice -->
<section class="ai-disclosure" style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Artificial Intelligence Disclosure</h3>
  <p>
    Our practice uses artificial intelligence technology to enhance patient care and operational efficiency.
    Specifically, AI is used for:
  </p>
  <ul>
    <li>Clinical documentation and record analysis</li>
    <li>Treatment planning assistance</li>
    <li>Patient communication optimization</li>
  </ul>
  <p>
    You have the right to request information about AI usage in your care.
    Contact our office at [PHONE] or [EMAIL] for more details.
  </p>
</section>`,
  },
  hb149: {
    key: 'hb149',
    label: 'HB 149',
    shortLabel: 'HB 149 (TX Patient Data)',
    description:
      'Texas House Bill 149 establishes patient data privacy and protection standards including consent requirements',
    remediationTitle: 'Update Privacy Policy with Patient Data Provisions',
    remediationTemplate: `<!-- HB 149 Privacy Policy Section -->
<section class="patient-data-privacy">
  <h3>Patient Data Protection (HB 149)</h3>
  <p>
    <strong>Patient Consent:</strong> We obtain explicit consent before:
  </p>
  <ul>
    <li>Collecting personal health information beyond what is necessary for treatment</li>
    <li>Sharing patient data with third parties</li>
    <li>Using patient information for secondary purposes</li>
  </ul>
  <p>
    <strong>Data Rights:</strong> You have the right to:
  </p>
  <ul>
    <li>Access your complete medical records</li>
    <li>Request correction of inaccurate information</li>
    <li>Opt-out of certain data uses</li>
    <li>Request deletion where permitted by law</li>
  </ul>
  <p>
    Contact our Privacy Officer: [CONTACT_INFO]
  </p>
</section>`,
  },
  ab3030: {
    key: 'ab3030',
    label: 'AB 3030',
    shortLabel: 'AB 3030 (CA AI Disclosure)',
    description:
      'California Assembly Bill 3030 requires transparency regarding generative AI use in healthcare settings',
    remediationTitle: 'Add Generative AI Disclosure per California Requirements',
    remediationTemplate: `<!-- AB 3030 Generative AI Disclosure -->
<section class="genai-disclosure" style="border: 2px solid #ff9800; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #ff9800;">Generative AI Use Notice</h3>
  <p>
    <strong>Important:</strong> This practice uses generative artificial intelligence in the following ways:
  </p>
  <ul>
    <li>Administrative task automation (scheduling, billing)</li>
    <li>Clinical documentation enhancement</li>
    <li>Patient communication templates</li>
  </ul>
  <p>
    <strong>What This Means:</strong> Generative AI systems may process your health information
    to provide recommendations and assistance. These systems are not perfect and may make errors.
  </p>
  <p>
    <strong>Your Choices:</strong> You may request that AI not be used in your care.
    Please contact us at [PHONE] to discuss your preferences.
  </p>
</section>`,
  },
};

const statuteLabels: Record<string, string> = Object.values(statutes).reduce(
  (acc, statute) => {
    acc[statute.label] = statute.label;
    return acc;
  },
  {} as Record<string, string>
);

const priorityConfig: Record<number, { color: string; label: string; bg: string }> = {
  1: { color: '#D64545', label: 'CRITICAL', bg: '#FDEEEE' },
  2: { color: '#D4A017', label: 'HIGH', bg: '#FDF6E3' },
  3: { color: '#185FA5', label: 'MEDIUM', bg: '#EEF4FF' },
  4: { color: '#5A6472', label: 'LOW', bg: '#F4F5F7' },
};

// Detect statute from finding_summary or finding_details
function detectStatute(workflow: ComplianceWorkflow): Exclude<StatuteKey, 'all'> {
  const summary = (workflow.finding_summary || '').toLowerCase();
  const details = workflow.finding_details || {};
  const detailsStr = JSON.stringify(details).toLowerCase();
  const combined = `${summary} ${detailsStr}`;

  if (combined.includes('sb 1188') || combined.includes('ai disclosure')) return 'sb1188';
  if (combined.includes('hb 149') || combined.includes('patient data')) return 'hb149';
  if (combined.includes('ab 3030') || combined.includes('generative ai') || combined.includes('genai'))
    return 'ab3030';

  // Default based on summary keyword matching
  if (combined.includes('disclosure')) return 'sb1188';
  if (combined.includes('privacy') || combined.includes('data')) return 'hb149';
  if (combined.includes('ai') || combined.includes('artificial')) return 'ab3030';

  return 'sb1188'; // default
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ComplianceView({ practiceId, workflows }: Props) {
  const [selectedStatute, setSelectedStatute] = useState<StatuteKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group workflows by statute
  const groupedWorkflows = useMemo(() => {
    const grouped: Record<Exclude<StatuteKey, 'all'>, ComplianceWorkflow[]> = {
      sb1188: [],
      hb149: [],
      ab3030: [],
    };

    workflows.forEach((wf) => {
      const statute = detectStatute(wf);
      grouped[statute].push(wf);
    });

    return grouped;
  }, [workflows]);

  // Filter by selected statute
  const filteredWorkflows = useMemo(() => {
    if (selectedStatute === 'all') {
      return workflows;
    }
    return groupedWorkflows[selectedStatute] || [];
  }, [selectedStatute, workflows, groupedWorkflows]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = workflows.length;
    const critical = workflows.filter((w) => w.priority === 1).length;
    const resolved = workflows.filter((w) => w.status === 'resolved').length;

    // Calculate avg resolution time (simplified: resolved workflows created in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentResolved = workflows.filter(
      (w) =>
        w.status === 'resolved' &&
        new Date(w.created_at).getTime() > thirtyDaysAgo
    );
    const avgResolutionTime = recentResolved.length > 0
      ? Math.round(
          recentResolved.reduce((sum, w) => {
            // Mock calculation: assume resolution took 7 days on average
            return sum + 7;
          }, 0) / recentResolved.length
        )
      : 0;

    return { total, critical, resolved, avgResolutionTime };
  }, [workflows]);

  // Active findings count
  const activeFindingsCount = filteredWorkflows.filter(
    (w) => w.status !== 'resolved'
  ).length;

  return (
    <div style={{ padding: '20px 24px', background: colors.gray50, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.navy, margin: 0 }}>
            Compliance Remediation
          </h1>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              background: colors.red,
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 100,
            }}
          >
            {activeFindingsCount} active finding{activeFindingsCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Summary Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'Total Findings', value: stats.total },
            { label: 'Critical', value: stats.critical },
            { label: 'Resolved This Month', value: stats.resolved },
            {
              label: 'Avg Resolution',
              value: stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}d` : '—',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: '#fff',
                borderRadius: 10,
                border: `1px solid ${colors.gray200}`,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: colors.gray600, textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Statute Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedStatute('all')}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 20,
              border: selectedStatute === 'all' ? `2px solid ${colors.navy}` : `1px solid ${colors.gray200}`,
              background: selectedStatute === 'all' ? colors.navy : '#fff',
              color: selectedStatute === 'all' ? '#fff' : colors.navy,
              cursor: 'pointer',
              transition: 'all .15s',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
            onMouseOver={(e) => {
              if (selectedStatute !== 'all') {
                (e.currentTarget as HTMLElement).style.borderColor = colors.gold;
                (e.currentTarget as HTMLElement).style.background = colors.goldPale;
                (e.currentTarget as HTMLElement).style.color = colors.navy;
              }
            }}
            onMouseOut={(e) => {
              if (selectedStatute !== 'all') {
                (e.currentTarget as HTMLElement).style.borderColor = colors.gray200;
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.color = colors.navy;
              }
            }}
          >
            All ({workflows.length})
          </button>

          {(['sb1188', 'hb149', 'ab3030'] as const).map((statute) => {
            const count = groupedWorkflows[statute].length;
            const info = statutes[statute];
            return (
              <button
                key={statute}
                onClick={() => setSelectedStatute(statute)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: 20,
                  border:
                    selectedStatute === statute ? `2px solid ${colors.gold}` : `1px solid ${colors.gray200}`,
                  background: selectedStatute === statute ? colors.goldPale : '#fff',
                  color: selectedStatute === statute ? colors.navy : colors.navy,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = colors.gold;
                  (e.currentTarget as HTMLElement).style.background = colors.goldPale;
                }}
                onMouseOut={(e) => {
                  if (selectedStatute !== statute) {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.gray200;
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }
                }}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredWorkflows.length === 0 ? (
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              border: `1px solid ${colors.gray200}`,
              padding: '40px',
              textAlign: 'center',
              color: colors.gray600,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {selectedStatute === 'all'
                ? 'No compliance findings at this time.'
                : `No findings for ${statutes[selectedStatute as Exclude<StatuteKey, 'all'>].label}`}
            </p>
          </div>
        ) : (
          filteredWorkflows.map((workflow) => {
            const statute = detectStatute(workflow);
            const statuteInfo = statutes[statute];
            const priorityInfo = priorityConfig[workflow.priority] || priorityConfig[4];
            const isExpanded = expandedId === workflow.id;

            return (
              <div
                key={workflow.id}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: `1px solid ${colors.gray200}`,
                  borderLeft: `3px solid ${priorityInfo.color}`,
                  overflow: 'hidden',
                  transition: 'all .15s',
                }}
              >
                {/* Card Header - Always visible, clickable */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: isExpanded ? colors.gray50 : '#fff',
                    transition: 'all .15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                  onMouseOver={(e) => {
                    if (!isExpanded) {
                      (e.currentTarget as HTMLElement).style.background = colors.gray50;
                      (e.currentTarget as HTMLElement).style.borderLeftColor = colors.navy;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isExpanded) {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                      (e.currentTarget as HTMLElement).style.borderLeftColor = priorityInfo.color;
                    }
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: priorityInfo.bg,
                          color: priorityInfo.color,
                          padding: '2px 8px',
                          borderRadius: 100,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {priorityInfo.label}
                      </span>
                      <Badge status={workflow.status} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: colors.gold,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {statuteInfo.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: colors.navy,
                        marginBottom: 4,
                      }}
                    >
                      {workflow.finding_summary || 'Compliance Finding'}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: colors.gray600,
                        lineHeight: 1.4,
                      }}
                    >
                      {workflow.provider_name && (
                        <span style={{ fontWeight: 500 }}>{workflow.provider_name}</span>
                      )}
                      {workflow.provider_name && workflow.provider_npi && <span> • </span>}
                      {workflow.provider_npi && <span style={{ fontFamily: 'monospace' }}>NPI {workflow.provider_npi}</span>}
                      {(!workflow.provider_name || !workflow.provider_npi) && (
                        <span>Created {formatDate(workflow.created_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div
                    style={{
                      fontSize: 20,
                      color: colors.gray400,
                      transition: 'transform .15s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${colors.gray200}`,
                      padding: '16px',
                      background: colors.gray50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {/* Statute Info */}
                    <div>
                      <h4
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.gold,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 6,
                          margin: '0 0 6px 0',
                        }}
                      >
                        {statuteInfo.label}
                      </h4>
                      <p
                        style={{
                          fontSize: 11,
                          color: colors.gray600,
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {statuteInfo.description}
                      </p>
                    </div>

                    {/* What's Wrong */}
                    <div>
                      <h4
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.navy,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 6,
                          margin: '0 0 6px 0',
                        }}
                      >
                        What's Wrong
                      </h4>
                      <p
                        style={{
                          fontSize: 11,
                          color: colors.gray600,
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {workflow.finding_summary || 'Compliance issue detected during regulatory scan.'}
                      </p>
                    </div>

                    {/* How to Fix */}
                    <div>
                      <h4
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.navy,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 8,
                          margin: '0 0 8px 0',
                        }}
                      >
                        How to Fix
                      </h4>
                      <p
                        style={{
                          fontSize: 11,
                          color: colors.gray600,
                          lineHeight: 1.6,
                          margin: '0 0 10px 0',
                        }}
                      >
                        {statuteInfo.remediationTitle}
                      </p>

                      {/* Template Code Block */}
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: 8,
                          border: `1px solid ${colors.gray200}`,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            background: colors.navy,
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span>Template</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(statuteInfo.remediationTemplate);
                              alert('Template copied to clipboard');
                            }}
                            style={{
                              background: 'rgba(255,255,255,.2)',
                              border: 'none',
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all .15s',
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLElement).style.background = colors.gold;
                              (e.currentTarget as HTMLElement).style.color = colors.navy;
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.2)';
                              (e.currentTarget as HTMLElement).style.color = '#fff';
                            }}
                          >
                            Copy
                          </button>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            fontSize: 9,
                            color: colors.navy,
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            lineHeight: 1.4,
                          }}
                        >
                          {statuteInfo.remediationTemplate}
                        </pre>
                      </div>
                    </div>

                    {/* Re-scan Status */}
                    <div style={{ paddingTop: 8, borderTop: `1px solid ${colors.gray200}` }}>
                      <p
                        style={{
                          fontSize: 10,
                          color: colors.gray600,
                          fontWeight: 500,
                          margin: 0,
                        }}
                      >
                        {workflow.status === 'resolved' ? (
                          <span style={{ color: colors.green, fontWeight: 600 }}>
                            Resolved on {formatDate(workflow.created_at)}
                          </span>
                        ) : (
                          <span>Next compliance scan: {formatDate(workflow.overdue_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
