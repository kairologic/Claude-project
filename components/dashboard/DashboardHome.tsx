/**
 * components/dashboard/DashboardHome.tsx
 *
 * v2: Provider-centric dashboard home.
 * KPIs count providers (not workflows). Priority providers list replaces workflow cards.
 * The practice manager sees "Who needs attention?" — not "What workflows exist?"
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, rosterStatusMap, shadows, transitions, radii, spacing, typography, keyframes } from '@/lib/design-tokens';
import { KPICard, PayerSyncPanel, Tooltip, AnimatedNumber, EmptyState, StaggeredList } from './ui';
import ProviderDetailPanel from './ProviderDetailPanel';
import { titleCase } from '@/lib/format-helpers';

interface KPIs {
  needs_attention: number;
  in_progress: number;
  monitoring: number;
  all_clear: number;
  total_providers: number;
  unseen_alert_count: number;
}

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
  has_address_mismatch: boolean;
  has_phone_mismatch: boolean;
  has_taxonomy_mismatch: boolean;
  has_name_mismatch: boolean;
  has_license_issue: boolean;
  has_active_license_renewal: boolean;
  has_active_payer_directory: boolean;
  has_active_onboarding: boolean;
  has_active_compliance: boolean;
  has_active_credentialing: boolean;
  has_active_departure: boolean;
}

interface PayerData {
  payer: string;
  status: string;
  color: string;
}

interface DashboardHomeProps {
  kpis: KPIs;
  priorityProviders: ProviderHealth[];
  payers: PayerData[];
  practiceId: string;
  practiceName: string;
  userName: string;
}

export default function DashboardHome({
  kpis, priorityProviders, payers, practiceId, practiceName, userName,
}: DashboardHomeProps) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);

  function navigateTo(sub: string) {
    router.push(`/practice/${practiceId}${sub}`);
  }

  function getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div>
      {/* Welcome banner */}
      {showWelcome && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyMid} 100%)`,
          borderRadius: radii.lg, padding: `${spacing.md}px ${spacing.lg}px`, marginBottom: spacing.lg, color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: shadows.sm,
          animation: `fadeInUp ${keyframes.fadeInUp} ${transitions.base}`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
              <span style={{ ...typography.h3, color: '#fff' }}>Welcome, {userName}</span>
              <span style={{
                ...typography.caption, background: 'rgba(212,160,23,.2)', color: colors.goldLight,
                padding: `2px ${spacing.xs}px`, borderRadius: radii.full, textTransform: 'uppercase',
              }}>Free trial</span>
            </div>
            <div style={{ ...typography.body, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, maxWidth: 600 }}>
              <AnimatedNumber value={kpis.needs_attention} /> of your {kpis.total_providers} providers need attention. Click any provider below
              to review issues, approve corrections, and track resolution — everything updates automatically.
            </div>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss welcome banner"
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
              fontSize: 18, padding: `0 0 0 ${spacing.xs}px`, lineHeight: 1,
              transition: `color ${transitions.fast}`,
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,.8)')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,.5)')}
          >×</button>
        </div>
      )}

      {/* KPI bar — provider-centric */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl }}>
        <div
          onClick={() => navigateTo('/roster')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTo('/roster'); }}
          style={{
            flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radii.lg, cursor: 'pointer',
            background: 'rgba(214,69,69,0.12)', transition: `all ${transitions.base}`,
            boxShadow: shadows.xs,
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.transform = 'none';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.xs;
          }}
        >
          <div style={{ ...typography.h1, color: colors.red }}><AnimatedNumber value={kpis.needs_attention} /></div>
          <div style={{ ...typography.label, color: colors.red, marginTop: spacing.xs }}>Needs attention</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTo('/roster'); }}
          style={{
            flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radii.lg, cursor: 'pointer',
            background: 'rgba(212,160,23,0.12)', transition: `all ${transitions.base}`,
            boxShadow: shadows.xs,
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.transform = 'none';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.xs;
          }}
        >
          <div style={{ ...typography.h1, color: '#96700A' }}><AnimatedNumber value={kpis.in_progress} /></div>
          <div style={{ ...typography.label, color: '#96700A', marginTop: spacing.xs }}>In progress</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTo('/roster'); }}
          style={{
            flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radii.lg, cursor: 'pointer',
            background: 'rgba(24,95,165,0.12)', transition: `all ${transitions.base}`,
            boxShadow: shadows.xs,
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.transform = 'none';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.xs;
          }}
        >
          <div style={{ ...typography.h1, color: colors.blue }}><AnimatedNumber value={kpis.monitoring} /></div>
          <div style={{ ...typography.label, color: colors.blue, marginTop: spacing.xs }}>Monitoring</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTo('/roster'); }}
          style={{
            flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radii.lg, cursor: 'pointer',
            background: 'rgba(26,158,109,0.12)', transition: `all ${transitions.base}`,
            boxShadow: shadows.xs,
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.transform = 'none';
            (e.currentTarget as HTMLElement).style.boxShadow = shadows.xs;
          }}
        >
          <div style={{ ...typography.h1, color: colors.green }}><AnimatedNumber value={kpis.all_clear} /></div>
          <div style={{ ...typography.label, color: colors.green, marginTop: spacing.xs }}>All clear</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: spacing.xl }}>
        {/* Left: Priority providers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <span style={{ ...typography.label, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400 }}>
              Priority providers
            </span>
            <button onClick={() => navigateTo('/roster')} style={{
              background: 'none', border: 'none', color: colors.blue, ...typography.bodySmall, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: `color ${transitions.fast}`,
            }}
            onMouseOver={e => (e.currentTarget.style.color = colors.blue)}
            onMouseOut={e => (e.currentTarget.style.color = colors.blue)}>
              View all {kpis.total_providers} providers →
            </button>
          </div>

          {priorityProviders.length === 0 && (
            <EmptyState
              icon="✓"
              title="All providers clear"
              description="No issues detected across your providers."
            />
          )}

          {priorityProviders.length > 0 && (
            <StaggeredList>
              {priorityProviders.map(p => {
            const issueColor = p.open_issues >= 3 ? colors.red : p.open_issues >= 1 ? colors.red : colors.gold;
            const borderColor = p.open_issues >= 3 ? colors.red : p.open_issues >= 1 ? colors.red : colors.gold;
            const avatarBg = p.open_issues > 0 ? colors.redPale : colors.greenPale;
            const avatarColor = p.open_issues > 0 ? colors.red : colors.green;

            return (
              <div
                key={p.npi}
                onClick={() => setSelectedNpi(p.npi)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedNpi(p.npi); }}
                style={{
                  background: '#fff', border: `1px solid ${colors.gray200}`,
                  borderRadius: radii.lg, padding: `${spacing.sm}px ${spacing.md}px`, marginBottom: spacing.xs,
                  cursor: 'pointer', transition: `all ${transitions.base}`,
                  borderLeft: `3px solid ${borderColor}`,
                  boxShadow: shadows.xs,
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = colors.navy;
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = colors.gray200;
                  (e.currentTarget as HTMLElement).style.borderLeftColor = borderColor;
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.xs;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: radii.full, background: avatarBg,
                    color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...typography.label, flexShrink: 0,
                  }}>{getInitials(titleCase(p.provider_name))}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...typography.h4, color: colors.navy }}>{titleCase(p.provider_name)}</div>
                    <div style={{ ...typography.mono, color: colors.gray400 }}>{p.npi}</div>
                  </div>
                  <span style={{
                    ...typography.label, padding: `2px ${spacing.xs}px`, borderRadius: radii.lg,
                    background: colors.redPale, color: colors.red,
                  }}>{p.open_issues} issue{p.open_issues !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ ...typography.bodySmall, color: colors.gray600, marginBottom: spacing.xs }}>
                  {titleCase(p.specialty) || 'Specialty not listed'}
                </div>
                {/* Issue type tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xxs }}>
                  {(p.has_license_issue || p.has_active_license_renewal) && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: colors.redPale, color: colors.red }}>
                      License renewal
                    </span>
                  )}
                  {p.has_active_payer_directory && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: colors.redPale, color: colors.red }}>
                      Payer directory
                    </span>
                  )}
                  {p.has_active_compliance && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: colors.redPale, color: colors.red }}>
                      Compliance
                    </span>
                  )}
                  {p.has_address_mismatch && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: '#FFF3E0', color: '#E65100' }}>
                      Address
                    </span>
                  )}
                  {p.has_phone_mismatch && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: '#FFF3E0', color: '#E65100' }}>
                      Phone
                    </span>
                  )}
                  {p.has_name_mismatch && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: '#FFF3E0', color: '#E65100' }}>
                      Name
                    </span>
                  )}
                  {p.has_taxonomy_mismatch && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: '#FFF3E0', color: '#E65100' }}>
                      Specialty
                    </span>
                  )}
                  {p.has_active_onboarding && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: colors.bluePale, color: colors.blue }}>
                      Onboarding
                    </span>
                  )}
                  {p.has_active_credentialing && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: colors.bluePale, color: colors.blue }}>
                      Credentialing
                    </span>
                  )}
                  {p.has_active_departure && (
                    <span style={{ ...typography.caption, padding: `1px ${spacing.xs}px`, borderRadius: radii.sm, background: '#FFF3E0', color: '#E65100' }}>
                      Departing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
            </StaggeredList>
          )}
        </div>

        {/* Right: Practice compliance + Payer sync */}
        <div>
          {/* Practice compliance */}
          <div style={{ marginBottom: spacing.md }}>
            <div style={{ ...typography.label, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, marginBottom: spacing.sm }}>
              Practice compliance
            </div>
            <div style={{
              background: '#fff', border: `1px solid ${colors.gray200}`, borderRadius: radii.lg, padding: spacing.md,
              boxShadow: shadows.xs,
              transition: `all ${transitions.base}`,
            }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = shadows.md)}
            onMouseOut={e => (e.currentTarget.style.boxShadow = shadows.xs)}>
              <div style={{ ...typography.h2, color: colors.green }}>—</div>
              <div style={{ ...typography.bodySmall, color: colors.gray400, marginTop: spacing.xs }}>Compliance score</div>
              <div style={{ marginTop: spacing.sm, borderTop: `1px solid ${colors.gray200}`, paddingTop: spacing.xs }}>
                {[
                  { label: 'SB 1188 (Data sovereignty)', value: 'Pending' },
                  { label: 'HB 149 (AI transparency)', value: 'Pending' },
                  { label: 'AB 3030 (CA AI disclosure)', value: 'N/A' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.xs}px 0`, ...typography.body }}>
                    <span style={{ color: colors.gray600 }}>{row.label}</span>
                    <span style={{
                      ...typography.label, padding: `2px ${spacing.xs}px`, borderRadius: radii.full,
                      background: colors.gray100, color: colors.gray400,
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payer sync status */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Tooltip text="Real-time payer directory monitoring via FHIR PDex Plan-Net APIs">
                <span style={{ ...typography.label, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, cursor: 'help' }}>Payer sync status</span>
              </Tooltip>
            </div>
            <div style={{
              background: '#fff', border: `1px solid ${colors.gray200}`, borderRadius: radii.lg, padding: spacing.md,
              boxShadow: shadows.xs,
              transition: `all ${transitions.base}`,
            }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = shadows.md)}
            onMouseOut={e => (e.currentTarget.style.boxShadow = shadows.xs)}>
              {payers.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, padding: `${spacing.xs}px 0`, ...typography.body }}>
                  <div style={{ width: 6, height: 6, borderRadius: radii.full, background: p.color }} />
                  <span style={{ color: colors.gray600, flex: 1 }}>{p.payer}</span>
                  <span style={{ color: colors.gray400, ...typography.bodySmall }}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
