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
import { colors, rosterStatusMap } from '@/lib/design-tokens';
import { KPICard, PayerSyncPanel, Tooltip } from './ui';
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
          borderRadius: 12, padding: '18px 20px', marginBottom: 16, color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Welcome, {userName}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, background: 'rgba(212,160,23,.2)', color: colors.goldLight,
                padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase',
              }}>Free trial</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, maxWidth: 600 }}>
              {kpis.needs_attention} of your {kpis.total_providers} providers need attention. Click any provider below
              to review issues, approve corrections, and track resolution — everything updates automatically.
            </div>
          </div>
          <button onClick={() => setShowWelcome(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
            fontSize: 18, padding: '0 0 0 12px', lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* KPI bar — provider-centric */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div
          onClick={() => navigateTo('/roster')}
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(214,69,69,0.12)', transition: 'transform 0.1s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.red }}>{kpis.needs_attention}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.red, marginTop: 2 }}>Needs attention</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(212,160,23,0.12)', transition: 'transform 0.1s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: '#96700A' }}>{kpis.in_progress}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#96700A', marginTop: 2 }}>In progress</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(24,95,165,0.12)', transition: 'transform 0.1s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.blue }}>{kpis.monitoring}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.blue, marginTop: 2 }}>Monitoring</div>
        </div>
        <div
          onClick={() => navigateTo('/roster')}
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(26,158,109,0.12)', transition: 'transform 0.1s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'none')}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.green }}>{kpis.all_clear}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.green, marginTop: 2 }}>All clear</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        {/* Left: Priority providers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400 }}>
              Priority providers
            </span>
            <button onClick={() => navigateTo('/roster')} style={{
              background: 'none', border: 'none', color: colors.blue, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>View all {kpis.total_providers} providers →</button>
          </div>

          {priorityProviders.length === 0 && (
            <div style={{
              padding: '40px 20px', textAlign: 'center', color: colors.gray400,
              fontSize: 13, background: colors.gray50, borderRadius: 10,
              border: `1px solid ${colors.gray200}`,
            }}>
              All providers are clear — no issues detected.
            </div>
          )}

          {priorityProviders.map(p => {
            const issueColor = p.open_issues >= 3 ? colors.red : p.open_issues >= 1 ? colors.red : colors.gold;
            const borderColor = p.open_issues >= 3 ? colors.red : p.open_issues >= 1 ? colors.red : colors.gold;
            const avatarBg = p.open_issues > 0 ? colors.redPale : colors.greenPale;
            const avatarColor = p.open_issues > 0 ? colors.red : colors.green;

            return (
              <div
                key={p.npi}
                onClick={() => setSelectedNpi(p.npi)}
                style={{
                  background: '#fff', border: `1px solid ${colors.gray200}`,
                  borderRadius: 10, padding: '14px 16px', marginBottom: 8,
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: `3px solid ${borderColor}`,
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = colors.navy;
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = colors.gray200;
                  (e.currentTarget as HTMLElement).style.borderLeftColor = borderColor;
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: avatarBg,
                    color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{getInitials(titleCase(p.provider_name))}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy }}>{titleCase(p.provider_name)}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: colors.gray400 }}>{p.npi}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: colors.redPale, color: colors.red,
                  }}>{p.open_issues} issue{p.open_issues !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ fontSize: 11, color: colors.gray600, marginBottom: 6 }}>
                  {titleCase(p.specialty) || 'Specialty not listed'}
                </div>
                {/* Issue type tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(p.has_license_issue || p.has_active_license_renewal) && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: colors.redPale, color: colors.red }}>
                      License renewal
                    </span>
                  )}
                  {p.has_active_payer_directory && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: colors.redPale, color: colors.red }}>
                      Payer directory
                    </span>
                  )}
                  {p.has_active_compliance && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: colors.redPale, color: colors.red }}>
                      Compliance
                    </span>
                  )}
                  {p.has_address_mismatch && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#E65100' }}>
                      Address
                    </span>
                  )}
                  {p.has_phone_mismatch && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#E65100' }}>
                      Phone
                    </span>
                  )}
                  {p.has_name_mismatch && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#E65100' }}>
                      Name
                    </span>
                  )}
                  {p.has_taxonomy_mismatch && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#E65100' }}>
                      Specialty
                    </span>
                  )}
                  {p.has_active_onboarding && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: colors.bluePale, color: colors.blue }}>
                      Onboarding
                    </span>
                  )}
                  {p.has_active_credentialing && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: colors.bluePale, color: colors.blue }}>
                      Credentialing
                    </span>
                  )}
                  {p.has_active_departure && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FFF3E0', color: '#E65100' }}>
                      Departing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Practice compliance + Payer sync */}
        <div>
          {/* Practice compliance */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, marginBottom: 10 }}>
              Practice compliance
            </div>
            <div style={{
              background: '#fff', border: `1px solid ${colors.gray200}`, borderRadius: 10, padding: 16,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: colors.green }}>—</div>
              <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>Compliance score</div>
              <div style={{ marginTop: 12, borderTop: `1px solid ${colors.gray200}`, paddingTop: 10 }}>
                {[
                  { label: 'SB 1188 (Data sovereignty)', value: 'Pending' },
                  { label: 'HB 149 (AI transparency)', value: 'Pending' },
                  { label: 'AB 3030 (CA AI disclosure)', value: 'N/A' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
                    <span style={{ color: colors.gray600 }}>{row.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: colors.gray100, color: colors.gray400,
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payer sync status */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Tooltip text="Real-time payer directory monitoring via FHIR PDex Plan-Net APIs">
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, cursor: 'help' }}>Payer sync status</span>
              </Tooltip>
            </div>
            <div style={{
              background: '#fff', border: `1px solid ${colors.gray200}`, borderRadius: 10, padding: 16,
            }}>
              {payers.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                  <span style={{ color: colors.gray600, flex: 1 }}>{p.payer}</span>
                  <span style={{ color: colors.gray400, fontSize: 11 }}>{p.status}</span>
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
