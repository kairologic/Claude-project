import Link from 'next/link';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M2.5 7h9M8 3.5L11.5 7 8 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function CompliancePage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="m-section" style={{ paddingTop: '56px', paddingBottom: '48px' }}>
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header" style={{ marginBottom: 0 }}>
            <span className="m-tag m-tag-green">State Coverage</span>
            <h1
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 400,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                color: 'var(--m-navy)',
                marginTop: '12px',
                marginBottom: '16px',
              }}
            >
              Regulation tracking,
              <br />
              <em style={{ fontStyle: 'italic', color: 'var(--m-gold)' }}>built into every scan</em>
            </h1>
            <p
              style={{
                fontSize: '17px',
                color: 'var(--m-gray-600)',
                lineHeight: 1.7,
                maxWidth: '620px',
                margin: '0 auto',
              }}
            >
              Healthcare regulation varies dramatically by state. KairoLogic maps each state&apos;s
              requirements to provider-level checks so the right compliance rules apply
              automatically — no manual configuration, no guesswork.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ LIVE STATES ═══ */}
      <section className="m-section" style={{ paddingTop: 0 }}>
        <div className="m-container">
          <div className="m-compliance-states-grid">
            {/* Texas */}
            <div className="m-comp-state-card">
              <div className="m-comp-state-header">
                <div className="m-comp-state-dot m-live"></div>
                <div>
                  <h2 className="m-comp-state-name">Texas</h2>
                  <span className="m-comp-state-status">Live</span>
                </div>
              </div>
              <p className="m-comp-state-desc">
                Texas has enacted two key regulations affecting healthcare data practices.
                KairoLogic monitors compliance for both at the provider level.
              </p>
              <div className="m-comp-regulations">
                <div className="m-comp-reg">
                  <div className="m-comp-reg-header">
                    <h3>SB 1188</h3>
                    <span className="m-comp-reg-tag">Data Sovereignty</span>
                  </div>
                  <p>
                    Requires Protected Health Information to reside on US-based servers. KairoLogic
                    tracks data residency attestation status across your roster and flags providers
                    whose records may be stored in non-compliant locations.
                  </p>
                  <div className="m-comp-checks">
                    <span>Data residency attestation</span>
                    <span>Server location verification</span>
                    <span>Vendor compliance tracking</span>
                  </div>
                </div>
                <div className="m-comp-reg">
                  <div className="m-comp-reg-header">
                    <h3>HB 149</h3>
                    <span className="m-comp-reg-tag">AI Transparency</span>
                  </div>
                  <p>
                    Mandates disclosure when AI is used in healthcare decision-making. KairoLogic
                    monitors whether your providers&apos; practices have proper AI disclosure
                    policies in place and flags gaps.
                  </p>
                  <div className="m-comp-checks">
                    <span>AI usage disclosure status</span>
                    <span>Policy documentation</span>
                    <span>Patient notification tracking</span>
                  </div>
                </div>
              </div>
              <div className="m-comp-sources">
                <strong>Data sources:</strong> Texas Medical Board (TMB), NPPES, PECOS, practice
                website scans
              </div>
            </div>

            {/* California */}
            <div className="m-comp-state-card">
              <div className="m-comp-state-header">
                <div className="m-comp-state-dot m-live"></div>
                <div>
                  <h2 className="m-comp-state-name">California</h2>
                  <span className="m-comp-state-status">Live</span>
                </div>
              </div>
              <p className="m-comp-state-desc">
                California leads in healthcare AI regulation with AB 3030, plus a robust FHIR-based
                provider directory. KairoLogic monitors both.
              </p>
              <div className="m-comp-regulations">
                <div className="m-comp-reg">
                  <div className="m-comp-reg-header">
                    <h3>AB 3030</h3>
                    <span className="m-comp-reg-tag">AI in Healthcare</span>
                  </div>
                  <p>
                    Requires healthcare providers to disclose when AI generates communications or is
                    involved in clinical decisions. KairoLogic tracks disclosure policy status
                    across your California providers.
                  </p>
                  <div className="m-comp-checks">
                    <span>AI disclosure policy status</span>
                    <span>Communication audit readiness</span>
                    <span>Clinical decision documentation</span>
                  </div>
                </div>
                <div className="m-comp-reg">
                  <div className="m-comp-reg-header">
                    <h3>FHIR Directory</h3>
                    <span className="m-comp-reg-tag">Provider Directory</span>
                  </div>
                  <p>
                    California offers a FHIR-based provider directory through Blue Shield and other
                    payers. KairoLogic cross-references your provider data against these directories
                    to catch listing discrepancies.
                  </p>
                  <div className="m-comp-checks">
                    <span>Blue Shield CA directory sync</span>
                    <span>MBC license verification</span>
                    <span>Directory listing accuracy</span>
                  </div>
                </div>
              </div>
              <div className="m-comp-sources">
                <strong>Data sources:</strong> Medical Board of California (MBC), Blue Shield CA
                FHIR API, NPPES, PECOS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMING SOON ═══ */}
      <section className="m-section" style={{ background: 'var(--m-gray-50)' }}>
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag m-tag-blue">Coming Soon</span>
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 400,
                lineHeight: 1.15,
                color: 'var(--m-navy)',
                marginTop: '12px',
              }}
            >
              Expanding to{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--m-gold)' }}>all 50 states</em>
            </h2>
            <p>
              New state profiles activate automatically as we expand — no reconfiguration on your
              end.
            </p>
          </div>

          <div className="m-comp-upcoming-grid">
            <div className="m-comp-upcoming-card">
              <div className="m-comp-upcoming-state">Florida</div>
              <div className="m-comp-upcoming-timeline">Q3 2026</div>
              <p>Telehealth regulations, Baker Act reporting requirements</p>
            </div>
            <div className="m-comp-upcoming-card">
              <div className="m-comp-upcoming-state">New York</div>
              <div className="m-comp-upcoming-timeline">Q3 2026</div>
              <p>SHIELD Act data security, behavioral health parity compliance</p>
            </div>
            <div className="m-comp-upcoming-card">
              <div className="m-comp-upcoming-state">Illinois</div>
              <div className="m-comp-upcoming-timeline">Q4 2026</div>
              <p>BIPA biometric data requirements, surprise billing protections</p>
            </div>
            <div className="m-comp-upcoming-card">
              <div className="m-comp-upcoming-state">+45 states</div>
              <div className="m-comp-upcoming-timeline">2026–2027</div>
              <p>State-specific regulation profiles built from day one for national scale</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="m-section">
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header">
            <span className="m-tag">How It Works</span>
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 400,
                lineHeight: 1.15,
                color: 'var(--m-navy)',
                marginTop: '12px',
              }}
            >
              Compliance checks that{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--m-gold)' }}>run themselves</em>
            </h2>
          </div>

          <div className="m-comp-how-list">
            <div className="m-comp-how-item">
              <div className="m-comp-how-num">1</div>
              <div>
                <h3>Add providers to your roster</h3>
                <p>
                  Upload a CSV or add providers by NPI. KairoLogic detects which states they
                  practice in and activates the relevant compliance profiles automatically.
                </p>
              </div>
            </div>
            <div className="m-comp-how-item">
              <div className="m-comp-how-num">2</div>
              <div>
                <h3>We check against active regulations</h3>
                <p>
                  Each provider is evaluated against state-specific requirements — data residency,
                  AI disclosure policies, license status, and more. Results appear on your dashboard
                  as compliance scores.
                </p>
              </div>
            </div>
            <div className="m-comp-how-item">
              <div className="m-comp-how-num">3</div>
              <div>
                <h3>Get notified when something changes</h3>
                <p>
                  When a new regulation takes effect or a provider&apos;s compliance status changes,
                  KairoLogic surfaces it immediately. No waiting for quarterly audits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <div className="m-cta-band">
        <div className="m-container">
          <div className="m-cta-inner">
            <span
              className="m-tag"
              style={{
                background: 'rgba(212,160,23,0.15)',
                color: 'var(--m-gold)',
                borderColor: 'rgba(212,160,23,0.3)',
              }}
            >
              Get Started
            </span>
            <h2>
              See where your providers stand <em>today.</em>
            </h2>
            <p>
              Start your 14-day free trial and get compliance visibility across your entire roster —
              TX and CA coverage included.
            </p>
            <div className="m-cta-actions">
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/demo" className="m-btn-ghost">
                Watch a Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
