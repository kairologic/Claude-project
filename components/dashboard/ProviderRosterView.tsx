/**
 * components/dashboard/ProviderRosterView.tsx
 *
 * Provider roster table with:
 * - Avatar + name, specialty, monospace NPI, status badge, issue count
 * - Action menu (view details, mark departing, view workflows)
 * - Color-coded issues (address, phone, license, taxonomy)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, rosterStatusMap, avatarColors } from '@/lib/design-tokens';
import { Tooltip } from './ui';
import WorkflowDetailPanel from './WorkflowDetailPanel';

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
  workflowMap: Record<string, string>; // NPI → first workflow_id for that provider
}

export default function ProviderRosterView({ providers, practiceId, workflowMap }: ProviderRosterViewProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [detailWorkflowId, setDetailWorkflowId] = useState<string | null>(null);

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
          display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.9fr 40px',
          padding: '10px 16px', background: colors.gray100, borderBottom: `1px solid ${colors.gray200}`,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400,
        }}>
          <span>Provider</span><span>Specialty</span><span>NPI</span><span>Status</span><span>Issues</span><span></span>
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
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.9fr 40px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: `1px solid ${colors.gray100}`,
                  cursor: 'pointer', transition: 'background .1s',
                }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = colors.gray50}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onClick={() => {
                  const wfId = workflowMap[p.npi];
                  if (wfId) setDetailWorkflowId(wfId);
                }}
              >
                {/* Provider name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: avatarBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{getInitials(p.provider_name)}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                    {p.provider_name || 'Unknown'}
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

                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  background: statusInfo.bg, color: statusInfo.color,
                  display: 'inline-block', width: 'fit-content', textTransform: 'uppercase',
                }}>
                  {statusInfo.badge}
                </span>

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
                  <button onClick={() => { setOpenMenu(null); const wfId = workflowMap[p.npi]; if (wfId) setDetailWorkflowId(wfId); }}
                    style={menuItemStyle}>
                    <span style={menuIconStyle}>👤</span> View provider details
                  </button>
                  {status !== 'departing' && status !== 'departed' && (
                    <button onClick={() => setOpenMenu(null)}
                      style={{ ...menuItemStyle, color: colors.red }}>
                      <span style={menuIconStyle}>🚪</span> Mark as departing
                    </button>
                  )}
                  {status === 'departing' && (
                    <button onClick={() => setOpenMenu(null)}
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

      {/* Workflow detail panel */}
      {detailWorkflowId && (
        <WorkflowDetailPanel
          workflowId={detailWorkflowId}
          practiceId={practiceId}
          onClose={() => setDetailWorkflowId(null)}
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
