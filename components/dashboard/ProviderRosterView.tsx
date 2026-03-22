/**
 * components/dashboard/ProviderRosterView.tsx
 *
 * Provider roster table with:
 * - Avatar + name, specialty, monospace NPI, status badge, issue count
 * - Action menu (view details, mark departing, view workflows)
 * - Color-coded issues (address, phone, license, taxonomy)
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { colors, rosterStatusMap, avatarColors } from '@/lib/design-tokens';
import { Tooltip } from './ui';
import ProviderDetailPanel from './ProviderDetailPanel';
import { titleCase } from '@/lib/format-helpers';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { runDepartureAssessment } from '@/lib/credentialing/departure-engine';

interface ProviderData {
  id: string;
  npi: string;
  provider_name: string | null;
  roster_status: string | null;
  active_mismatch_count: number | null;
  web_specialty: string | null;
  has_address_mismatch: boolean;
  has_phone_mismatch: boolean;
  has_taxonomy_mismatch: boolean;
  has_name_mismatch: boolean;
  has_license_issue: boolean;
  license_issue_type: string | null;
}

interface ProviderRosterViewProps {
  providers: ProviderData[];
  practiceId: string;
  workflowMap: Record<string, string>;
  healthMap?: Record<string, { health_score: number; open_issues: number; specialty: string | null }>;
}

export default function ProviderRosterView({ providers, practiceId, workflowMap, healthMap = {} }: ProviderRosterViewProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);
  const [departingNpi, setDepartingNpi] = useState<string | null>(null);

  const handleMarkDeparting = useCallback(async (npi: string, providerName: string) => {
    if (!confirm(`Mark ${providerName} as departing? This will generate a departure checklist.`)) return;
    setDepartingNpi(npi);
    try {
      const supabase = createBrowserSupabaseClient();

      // Run departure assessment
      const output = await runDepartureAssessment(supabase, npi, practiceId);

      // Create credentialing_departure workflow
      const { data: wf } = await supabase.from('workflow_instances').insert({
        practice_id: practiceId,
        workflow_type: 'credentialing_departure',
        status: 'action_needed',
        provider_npi: npi,
        provider_name: providerName,
        finding_summary: output.summary,
        finding_details: {
          field: 'departure',
          assessment: output.assessment,
          directories_to_clear: output.directories_to_clear,
        },
        priority: 2,
      }).select('id').single();

      if (wf) {
        // Insert departure tasks
        if (output.tasks.length > 0) {
          await supabase.from('workflow_tasks').insert(
            output.tasks.map(t => ({
              workflow_id: wf.id,
              task_order: t.task_order,
              task_type: t.task_type,
              title: t.title,
              description: t.description,
              status: t.status,
              metadata: t.metadata,
            }))
          );
        }

        // Update roster status to departing
        await supabase.from('practice_providers')
          .update({ roster_status: 'departing', departure_workflow_id: wf.id })
          .eq('practice_website_id', practiceId)
          .eq('npi', npi);

        // Create alert
        await supabase.from('alerts').insert({
          practice_id: practiceId,
          severity: 'warning',
          title: `Departure started: ${providerName}`,
          description: `${output.directories_to_clear} directories to clear. ${output.tasks.length} tasks generated.`,
          workflow_id: wf.id,
          provider_npi: npi,
          provider_name: providerName,
          source: 'departure_engine',
          is_active: true,
        });

        // Log event
        await supabase.from('workflow_events').insert({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'user',
          title: `Departure started for ${providerName}`,
          details: {
            npi,
            directories_to_clear: output.directories_to_clear,
            tasks_generated: output.tasks.length,
          },
        });

        // Send departure notification email (non-blocking)
        fetch('/api/email/credentialing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'departure_started',
            provider_name: providerName,
            provider_npi: npi,
            practice_name: '',
            practice_id: practiceId,
            recipient_email: 'compliance@kairologic.net',
            details: {
              directories_to_clear: output.directories_to_clear,
              task_count: output.tasks.length,
            },
          }),
        }).catch(() => {});
      }

      // Reload to show updated status
      window.location.reload();
    } catch (err) {
      alert('Failed to start departure workflow. Please try again.');
    } finally {
      setDepartingNpi(null);
    }
  }, [practiceId]);

  function getInitials(name: string | null): string {
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function getIssueTooltip(p: ProviderData): string {
    const issues: string[] = [];
    if (p.has_address_mismatch) issues.push('Address mismatch');
    if (p.has_phone_mismatch) issues.push('Phone mismatch');
    if (p.has_taxonomy_mismatch) issues.push('Specialty mismatch');
    if (p.has_name_mismatch) issues.push('Name mismatch');
    if (p.has_license_issue) issues.push(`License: ${p.license_issue_type || 'issue detected'}`);
    return issues.length > 0 ? issues.join(', ') : 'No outstanding issues';
  }

  const statusOrder: Record<string, number> = { departing: 0, onboarding: 1, active: 2, departed: 3 };

  const sorted = [...providers].sort((a, b) => {
    // Issues first, then by status, then by name
    const aIssues = a.active_mismatch_count || 0;
    const bIssues = b.active_mismatch_count || 0;
    if (bIssues !== aIssues) return bIssues - aIssues;
    const aStatus = statusOrder[a.roster_status || 'active'] ?? 2;
    const bStatus = statusOrder[b.roster_status || 'active'] ?? 2;
    if (aStatus !== bStatus) return aStatus - bStatus;
    return (a.provider_name || '').localeCompare(b.provider_name || '');
  });

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: colors.gray400 }}>
        <span>{providers.length} providers</span>
        <span>·</span>
        <span>{providers.filter(p => (p.active_mismatch_count || 0) > 0).length} with issues</span>
        <span>·</span>
        <span style={{ color: colors.green }}>{providers.filter(p => (p.active_mismatch_count || 0) === 0).length} clear</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.7fr 0.7fr 0.7fr 40px',
          padding: '10px 16px', background: colors.gray100, borderBottom: `1px solid ${colors.gray200}`,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400,
        }}>
          <span>Provider</span><span>Specialty</span><span>NPI</span><span>Health</span><span>Issues</span><span>Status</span><span></span>
        </div>

        {/* Rows */}
        {sorted.map(p => {
          const status = p.roster_status || 'active';
          const statusInfo = rosterStatusMap[status] || rosterStatusMap.active;
          const issueCount = p.active_mismatch_count || 0;
          const hasLicense = p.has_license_issue;
          const avatarBg = avatarColors[status] || colors.navy;

          return (
            <div key={p.id} style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.7fr 0.7fr 0.7fr 40px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: `1px solid ${colors.gray100}`,
                  cursor: 'pointer', transition: 'background .1s',
                }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = colors.gray50}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onClick={() => setSelectedNpi(p.npi)}
              >
                {/* Provider name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: avatarBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{getInitials(p.provider_name)}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                    {titleCase(p.provider_name) || 'Unknown'}
                  </span>
                </div>

                {/* Specialty */}
                <span style={{ fontSize: 12, color: colors.gray600 }}>
                  {p.web_specialty || '—'}
                </span>

                {/* NPI */}
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: colors.gray400 }}>
                  {p.npi}
                </span>

                {/* Health score */}
                {(() => {
                  const h = healthMap[p.npi];
                  const score = h?.health_score ?? 100;
                  const hColor = score >= 80 ? colors.green : score >= 50 ? colors.gold : colors.red;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 6, background: colors.gray200, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${score}%`, background: hColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: hColor, fontWeight: 600 }}>{score}%</span>
                    </div>
                  );
                })()}

                {/* Issues */}
                <Tooltip text={getIssueTooltip(p)}>
                  {issueCount > 0 || hasLicense ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: hasLicense ? colors.redPale : colors.goldPale,
                      color: hasLicense ? colors.red : colors.gold,
                      display: 'inline-block', cursor: 'help',
                    }}>
                      {hasLicense ? '⚠ License' : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, color: colors.green, cursor: 'help' }}>
                      ✓ Clear
                    </span>
                  )}
                </Tooltip>

                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  background: statusInfo.bg, color: statusInfo.color,
                  display: 'inline-block', width: 'fit-content', textTransform: 'uppercase',
                }}>
                  {statusInfo.badge}
                </span>

                {/* Action menu trigger */}
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                    color: colors.gray400, padding: '0 4px', fontFamily: 'inherit',
                  }}
                >⋮</button>
              </div>

              {/* Action menu dropdown */}
              {openMenu === p.id && (
                <div style={{
                  position: 'absolute', right: 16, top: '100%', zIndex: 70,
                  background: '#fff', border: `1px solid ${colors.gray200}`, borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,.12)', overflow: 'hidden', minWidth: 200,
                }}>
                  <button onClick={() => { setOpenMenu(null); setSelectedNpi(p.npi); }}
                    style={menuItemStyle}>
                    <span style={menuIconStyle}>👤</span> View provider details
                  </button>
                  {status !== 'departing' && status !== 'departed' && (
                    <button onClick={() => {
                      setOpenMenu(null);
                      handleMarkDeparting(p.npi, titleCase(p.provider_name || ''));
                    }}
                      disabled={departingNpi === p.npi}
                      style={{ ...menuItemStyle, color: departingNpi === p.npi ? colors.gray400 : colors.red }}>
                      <span style={menuIconStyle}>{departingNpi === p.npi ? '⏳' : '🚪'}</span>
                      {departingNpi === p.npi ? 'Starting departure...' : 'Mark as departing'}
                    </button>
                  )}
                  {status === 'departing' && (
                    <button onClick={() => {
                      setOpenMenu(null);
                      setSelectedNpi(p.npi);
                    }}
                      style={menuItemStyle}>
                      <span style={menuIconStyle}>📋</span> View departure workflow
                    </button>
                  )}
                  <button onClick={() => {
                    setOpenMenu(null);
                    router.push(`/practice/${practiceId}/workflows`);
                  }} style={{ ...menuItemStyle, borderBottom: 'none' }}>
                    <span style={menuIconStyle}>⚡</span> View workflows
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {providers.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>
            No providers linked to this practice yet.
          </div>
        )}
      </div>

      {/* Provider detail panel */}
      {selectedNpi && (
        <ProviderDetailPanel
          npi={selectedNpi}
          practiceId={practiceId}
          onClose={() => setSelectedNpi(null)}
        />
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: '100%', padding: '9px 14px', background: 'none', border: 'none',
  borderBottom: `1px solid ${colors.gray100}`, fontSize: 12, fontWeight: 500,
  color: colors.navy, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 8,
};

const menuIconStyle: React.CSSProperties = {
  fontSize: 13, width: 18, textAlign: 'center',
};
