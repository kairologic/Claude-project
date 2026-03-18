/**
 * components/dashboard/PreviewPage.tsx
 *
 * Public preview page shown to practice managers from outreach emails.
 * No auth required. Shows:
 * - Practice name, NPI, location, provider count
 * - KPI boxes: mismatches found, provider issues, alert count
 * - Findings summary with category breakdown
 * - Affected providers (first 3, NPIs partially masked)
 * - "Claim your dashboard" email input
 */

'use client';

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';

interface ProviderPreview {
  provider_name: string;
  npi: string;
  issues: string[];
  issue_count: number;
}

interface FindingSummary {
  address_mismatches: number;
  phone_mismatches: number;
  name_mismatches: number;
  taxonomy_mismatches: number;
  license_issues: number;
  total: number;
}

interface PreviewPageProps {
  practice: {
    name: string;
    city: string;
    state: string;
    provider_count: number;
    mismatch_count: number;
  };
  findings: FindingSummary;
  providers: ProviderPreview[];
  totalProviders: number;
  token: string;
}

function maskNpi(npi: string): string {
  if (npi.length < 6) return '••••••••••';
  return npi.slice(0, 3) + '••••' + npi.slice(-3);
}

export default function PreviewPage({ practice, findings, providers, totalProviders, token }: PreviewPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [practiceName, setPracticeName] = useState('');

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setPracticeName(data.practice_name || practice.name);
      setSubmitted(true);
    } catch {
      setError('Failed to send verification email. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: colors.navy }}>Kairo</span>
          <span style={{ color: colors.gold }}>Logic</span>
        </div>
        <div style={styles.headerTag}>Practice Intelligence Report</div>
      </div>

      {/* Practice info */}
      <div style={styles.practiceBar}>
        <div>
          <div style={styles.practiceName}>{practice.name}</div>
          <div style={styles.practiceMeta}>
            {practice.city}, {practice.state} · {practice.provider_count} providers
          </div>
        </div>
      </div>

      {/* KPI boxes */}
      <div style={styles.kpiRow}>
        <div style={{ ...styles.kpiBox, background: colors.redPale, borderColor: `${colors.red}33` }}>
          <div style={{ ...styles.kpiNum, color: colors.red }}>{findings.total}</div>
          <div style={styles.kpiLabel}>Data discrepancies found</div>
        </div>
        <div style={{ ...styles.kpiBox, background: colors.goldPale, borderColor: `${colors.gold}33` }}>
          <div style={{ ...styles.kpiNum, color: colors.gold }}>
            {findings.license_issues > 0 ? findings.license_issues : totalProviders}
          </div>
          <div style={styles.kpiLabel}>
            {findings.license_issues > 0 ? 'License issues' : 'Providers affected'}
          </div>
        </div>
        <div style={{ ...styles.kpiBox, background: colors.bluePale, borderColor: `${colors.blue}33` }}>
          <div style={{ ...styles.kpiNum, color: colors.blue }}>
            {findings.address_mismatches + findings.phone_mismatches}
          </div>
          <div style={styles.kpiLabel}>NPPES mismatches</div>
        </div>
      </div>

      {/* Findings breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>What we found</div>
        <div style={styles.findingsList}>
          {findings.address_mismatches > 0 && (
            <FindingRow icon="📍" label="Address mismatches" count={findings.address_mismatches}
              desc="Provider addresses on your website don't match federal NPPES records" />
          )}
          {findings.phone_mismatches > 0 && (
            <FindingRow icon="📞" label="Phone mismatches" count={findings.phone_mismatches}
              desc="Phone numbers differ between your website and NPPES" />
          )}
          {findings.name_mismatches > 0 && (
            <FindingRow icon="👤" label="Name discrepancies" count={findings.name_mismatches}
              desc="Provider or organization names don't match registry records" />
          )}
          {findings.taxonomy_mismatches > 0 && (
            <FindingRow icon="🏥" label="Specialty mismatches" count={findings.taxonomy_mismatches}
              desc="Specialties listed don't match NPPES taxonomy codes" />
          )}
          {findings.license_issues > 0 && (
            <FindingRow icon="⚠️" label="License alerts" count={findings.license_issues}
              desc="Provider license issues detected from state medical board records" />
          )}
        </div>
      </div>

      {/* Affected providers */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Affected providers</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {providers.slice(0, 3).map((p, i) => {
            const initials = p.provider_name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={i} style={styles.providerCard}>
                <div style={styles.providerAvatar}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.providerName}>{p.provider_name}</div>
                  <div style={styles.providerNpi}>NPI: {maskNpi(p.npi)}</div>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  background: colors.redPale, color: colors.red,
                }}>
                  {p.issue_count} issue{p.issue_count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
          {totalProviders > 3 && (
            <div style={styles.moreProviders}>
              + {totalProviders - 3} more provider{totalProviders - 3 !== 1 ? 's' : ''} with findings
            </div>
          )}
        </div>
      </div>

      {/* Blurred dashboard preview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Your Practice Intelligence Dashboard</div>
        <div style={styles.dashPreviewWrap}>
          {/* Full-scale dashboard replica */}
          <div style={styles.dashMock}>
            {/* Sidebar */}
            <div style={styles.mockSidebar}>
              <div style={{ padding: '12px 12px 10px', fontSize: 14, fontWeight: 800 }}>
                <span style={{ color: '#fff' }}>Kairo</span><span style={{ color: colors.gold }}>Logic</span>
              </div>
              <div style={{ margin: '0 8px 10px', background: colors.navyMid, borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{practice.name}</div>
                <div style={{ fontSize: 8, color: colors.navyLight }}>{practice.city}, {practice.state}</div>
              </div>
              {[
                { icon: '◉', label: 'Dashboard', active: true },
                { icon: '⚡', label: 'Workflows', active: false },
                { icon: '👥', label: 'Provider roster', active: false },
                { icon: '🔔', label: 'Alerts', active: false, badge: findings.total },
                { icon: '📄', label: 'Documents', active: false },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 11,
                  color: item.active ? '#fff' : colors.navyLight, fontWeight: item.active ? 700 : 500,
                  background: item.active ? colors.navyMid : 'transparent', position: 'relative',
                }}>
                  <span style={{ fontSize: 11 }}>{item.icon}</span> {item.label}
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', background: colors.red, color: '#fff', fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 100 }}>{item.badge}</span>
                  )}
                </div>
              ))}
              <div style={{ padding: '10px 12px 2px', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(139,163,184,.4)' }}>Coming soon</div>
              {['🔐 Credentialing', '📊 Reports', '⚙️ Settings'].map((item, i) => (
                <div key={i} style={{ padding: '5px 12px', fontSize: 11, color: 'rgba(139,163,184,.3)' }}>{item}</div>
              ))}
            </div>

            {/* Main content */}
            <div style={styles.mockMain}>
              {/* Header */}
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.gray200}`, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>Dashboard</div>
                  <div style={{ fontSize: 9, color: colors.gray400 }}>{practice.name} · {practice.provider_count} providers</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: colors.navy, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>+ Add provider</div>
                  <div style={{ fontSize: 9, color: colors.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.green }} /> Operational
                  </div>
                </div>
              </div>

              {/* KPI row */}
              <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'rgba(214,69,69,.75)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{findings.total}</div>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>New</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(214,69,69,.12)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${colors.gray200}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.red }}>{findings.total}</div>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: colors.gray400 }}>Needs action</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(212,160,23,.12)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${colors.gray200}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.gold }}>0</div>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: colors.gray400 }}>In progress</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(24,95,165,.12)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${colors.gray200}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.blue }}>0</div>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: colors.gray400 }}>Awaiting</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(26,158,109,.12)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${colors.gray200}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.green }}>0</div>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: colors.gray400 }}>Resolved</div>
                </div>
              </div>

              {/* Two columns */}
              <div style={{ padding: '4px 16px', display: 'flex', gap: 12 }}>
                {/* Workflows */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, marginBottom: 6 }}>Active workflows</div>
                  {providers.slice(0, 3).map((p, i) => (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${colors.gray200}`, borderLeft: `3px solid ${colors.red}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: colors.gold, textTransform: 'uppercase' }}>NPPES UPDATE</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: colors.red, background: colors.redPale, padding: '1px 6px', borderRadius: 100 }}>NEEDS ACTION</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.navy }}>{p.provider_name} — Address mismatch</div>
                      <div style={{ fontSize: 8, color: colors.gray600, marginTop: 2 }}>NPPES data differs from website listing</div>
                      <div style={{ height: 3, background: colors.gray200, borderRadius: 2, marginTop: 5 }}>
                        <div style={{ height: '100%', width: '15%', background: colors.red, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Alerts */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, marginBottom: 6 }}>Recent alerts</div>
                  {providers.slice(0, 3).map((p, i) => (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${colors.gray200}`, borderLeft: `3px solid ${colors.red}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.red }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: colors.navy }}>{p.provider_name}: Mismatch detected</span>
                        <span style={{ fontSize: 6, fontWeight: 700, background: colors.red, color: '#fff', padding: '0px 4px', borderRadius: 100 }}>NEW</span>
                      </div>
                      <div style={{ fontSize: 8, color: colors.gray600, paddingLeft: 9 }}>Requires review and correction</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Frosted overlay */}
          <div style={styles.dashOverlay}>
            <div style={styles.dashOverlayContent}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
              <div style={styles.dashOverlayTitle}>Your full dashboard is ready</div>
              <div style={styles.dashOverlayDesc}>
                Workflow tracking, pre-filled NPPES forms, payer directory monitoring, license alerts, and automatic confirmation
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                {['Workflow tracking', 'Pre-filled forms', 'Payer monitoring', 'License alerts', 'Auto-confirmation'].map(f => (
                  <span key={f} style={{
                    fontSize: 10, fontWeight: 600, color: colors.navy, background: 'rgba(255,255,255,.9)',
                    padding: '4px 12px', borderRadius: 100, border: `1px solid ${colors.gray200}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim section */}
      <div style={styles.claimSection}>
        {!submitted ? (
          <>
            <div style={styles.claimTitle}>Claim your dashboard</div>
            <div style={styles.claimDesc}>
              Enter your email to access your full Practice Intelligence Dashboard with actionable workflows,
              pre-filled correction forms, and automatic monitoring.
            </div>
            <form onSubmit={handleClaim} style={styles.claimForm}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@practice.com"
                required
                style={styles.claimInput}
              />
              <button type="submit" disabled={loading} style={{
                ...styles.claimBtn,
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Sending...' : 'Claim dashboard'}
              </button>
            </form>
            {error && <div style={styles.claimError}>{error}</div>}
            <div style={styles.claimSub}>
              Free trial · No credit card · HIPAA-aligned
            </div>
          </>
        ) : (
          <div style={styles.claimSuccess}>
            <div style={styles.successIcon}>✉️</div>
            <div style={styles.successTitle}>Check your email</div>
            <div style={styles.successDesc}>
              We sent a verification link to <strong>{email}</strong>. Click the link to set your password
              and access your dashboard for {practiceName || practice.name}.
            </div>
            <div style={styles.successSub}>
              Link expires in 24 hours · <button
                onClick={() => { setSubmitted(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: colors.blue, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}
              >Resend email</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLogo}>
          <span style={{ color: colors.navy }}>Kairo</span>
          <span style={{ color: colors.gold }}>Logic</span>
        </div>
        <div style={styles.footerText}>
          Provider data intelligence for independent medical practices.
          Data sourced from NPPES, CMS PECOS, state medical boards, and payer FHIR directories.
        </div>
      </div>
    </div>
  );
}

function FindingRow({ icon, label, count, desc }: { icon: string; label: string; count: number; desc: string }) {
  return (
    <div style={styles.findingRow}>
      <div style={styles.findingDot}>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.findingLabel}>
          {label}
          <span style={styles.findingCount}>{count}</span>
        </div>
        <div style={styles.findingDesc}>{desc}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    maxWidth: 680, margin: '0 auto', padding: '0 20px 40px',
    color: colors.navy, background: '#fff', minHeight: '100vh',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 0', borderBottom: `1px solid ${colors.gray200}`,
  },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' },
  headerTag: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: colors.gray400,
  },
  practiceBar: {
    padding: '20px 0', borderBottom: `1px solid ${colors.gray200}`,
  },
  practiceName: { fontSize: 20, fontWeight: 800, color: colors.navy, marginBottom: 4 },
  practiceMeta: { fontSize: 13, color: colors.gray600 },
  kpiRow: { display: 'flex', gap: 12, padding: '20px 0' },
  kpiBox: {
    flex: 1, padding: '16px', borderRadius: 10, border: '1px solid',
    textAlign: 'center' as const,
  },
  kpiNum: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  kpiLabel: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: colors.gray400, marginTop: 6,
  },
  section: { padding: '20px 0', borderTop: `1px solid ${colors.gray200}` },
  sectionTitle: {
    fontSize: 13, fontWeight: 800, color: colors.navy, marginBottom: 12, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  findingsList: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  findingRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  findingDot: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  findingLabel: { fontSize: 13, fontWeight: 700, color: colors.navy, display: 'flex', alignItems: 'center', gap: 6 },
  findingCount: {
    fontSize: 10, fontWeight: 700, background: colors.redPale, color: colors.red,
    padding: '1px 6px', borderRadius: 100,
  },
  findingDesc: { fontSize: 12, color: colors.gray600, marginTop: 2, lineHeight: 1.4 },
  providerCard: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
    background: colors.gray50, borderRadius: 8, border: `1px solid ${colors.gray200}`,
  },
  providerAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: colors.navy,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  providerName: { fontSize: 13, fontWeight: 700, color: colors.navy },
  providerNpi: { fontSize: 11, color: colors.gray400, fontFamily: 'monospace' },
  moreProviders: {
    fontSize: 12, color: colors.blue, fontWeight: 600, textAlign: 'center' as const,
    padding: '10px 0',
  },
  claimSection: {
    marginTop: 24, padding: '28px 24px', background: colors.gray50,
    borderRadius: 12, border: `1px solid ${colors.gray200}`, textAlign: 'center' as const,
  },
  claimTitle: { fontSize: 18, fontWeight: 800, color: colors.navy, marginBottom: 8 },
  claimDesc: { fontSize: 13, color: colors.gray600, lineHeight: 1.5, maxWidth: 480, margin: '0 auto 16px' },
  claimForm: { display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto' },
  claimInput: {
    flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${colors.gray200}`,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', color: colors.navy,
  },
  claimBtn: {
    padding: '10px 20px', background: colors.navy, color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  claimError: {
    marginTop: 8, fontSize: 12, color: colors.red, fontWeight: 600,
  },
  claimSub: {
    marginTop: 10, fontSize: 11, color: colors.gray400,
  },
  claimSuccess: { padding: '8px 0' },
  successIcon: { fontSize: 32, marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: 800, color: colors.navy, marginBottom: 8 },
  successDesc: { fontSize: 13, color: colors.gray600, lineHeight: 1.5, maxWidth: 400, margin: '0 auto' },
  successSub: { marginTop: 12, fontSize: 12, color: colors.gray400 },
  footer: {
    marginTop: 40, paddingTop: 20, borderTop: `1px solid ${colors.gray200}`, textAlign: 'center' as const,
  },
  footerLogo: { fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 },
  footerText: { fontSize: 11, color: colors.gray400, lineHeight: 1.5, maxWidth: 400, margin: '0 auto' },
  dashPreviewWrap: {
    position: 'relative' as const, borderRadius: 12, overflow: 'hidden',
    border: `1px solid ${colors.gray200}`, height: 380,
  },
  dashMock: {
    display: 'flex', height: '100%', filter: 'blur(2.5px)',
  },
  mockSidebar: {
    width: 160, background: colors.navy, flexShrink: 0, overflow: 'hidden',
  },
  mockMain: {
    flex: 1, background: colors.gray50, overflow: 'hidden',
  },
  dashOverlay: {
    position: 'absolute' as const, inset: 0,
    background: 'rgba(250,250,250,.6)',
    backdropFilter: 'blur(1px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dashOverlayContent: {
    textAlign: 'center' as const, maxWidth: 400, padding: '0 20px',
  },
  dashOverlayTitle: {
    fontSize: 18, fontWeight: 800, color: colors.navy, marginBottom: 8,
  },
  dashOverlayDesc: {
    fontSize: 12, color: colors.gray600, lineHeight: 1.5,
  },
};
