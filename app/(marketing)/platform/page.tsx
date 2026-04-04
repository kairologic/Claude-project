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

export default function PlatformPage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="m-section m-platform-hero">
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header" style={{ marginBottom: 0 }}>
            <span className="m-tag">Platform</span>
            <h1 className="m-page-title">
              Everything you need to keep
              <br />
              <em>provider data accurate</em>
            </h1>
            <p className="m-page-subtitle">
              One dashboard to monitor your entire provider roster — data integrity, state
              compliance, credentialing progress, and payer directory accuracy. All updated
              continuously.
            </p>
            <div className="m-hero-actions" style={{ justifyContent: 'center', marginTop: '28px' }}>
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/solutions" className="m-btn-outline">
                See who it&apos;s for
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 1: Provider Monitoring ═══ */}
      <section className="m-section" id="monitoring">
        <div className="m-container">
          <div className="m-platform-feature">
            <div className="m-platform-feature-text">
              <span className="m-tag m-tag-green">Core Feature</span>
              <h2 className="m-platform-h2">Provider Monitoring</h2>
              <p>
                Your provider roster is checked against multiple authoritative sources continuously.
                When data drifts — an address changes, a license expires, a taxonomy code is wrong —
                KairoLogic surfaces it on your dashboard before it causes downstream problems.
              </p>
              <div className="m-platform-feature-list">
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>14-point integrity scan</strong>
                    <span>
                      NPI validity, address accuracy, license status, taxonomy matching, and more
                    </span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Real-time drift alerts</strong>
                    <span>
                      Get notified the moment something changes — not at the next quarterly review
                    </span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Practice website monitoring</strong>
                    <span>
                      34K+ practice websites scanned to detect roster changes and address
                      discrepancies
                    </span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Full audit trail</strong>
                    <span>Every data change, every check, every alert — logged and exportable</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="m-platform-feature-visual">
              <div className="m-platform-mock">
                <div className="m-platform-mock-header">
                  <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                  <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                  <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                  <span>Dashboard — Provider Roster</span>
                </div>
                <div className="m-platform-mock-body">
                  <div className="m-platform-kpi-row">
                    <div className="m-platform-kpi" style={{ borderLeftColor: 'var(--m-red)' }}>
                      <div className="m-platform-kpi-num">5</div>
                      <div className="m-platform-kpi-label">Needs attention</div>
                    </div>
                    <div className="m-platform-kpi" style={{ borderLeftColor: 'var(--m-gold)' }}>
                      <div className="m-platform-kpi-num">3</div>
                      <div className="m-platform-kpi-label">In progress</div>
                    </div>
                    <div className="m-platform-kpi" style={{ borderLeftColor: 'var(--m-green)' }}>
                      <div className="m-platform-kpi-num">16</div>
                      <div className="m-platform-kpi-label">All clear</div>
                    </div>
                  </div>
                  <div className="m-platform-provider-row">
                    <div
                      className="m-platform-prov-dot"
                      style={{ background: 'var(--m-red)' }}
                    ></div>
                    <span className="m-platform-prov-name">Dr. Marcus Webb, DO</span>
                    <span className="m-platform-prov-issue">Address drift detected</span>
                  </div>
                  <div className="m-platform-provider-row">
                    <div
                      className="m-platform-prov-dot"
                      style={{ background: 'var(--m-gold)' }}
                    ></div>
                    <span className="m-platform-prov-name">Dr. Priya Nair, MD</span>
                    <span className="m-platform-prov-issue">NPPES correction pending</span>
                  </div>
                  <div className="m-platform-provider-row">
                    <div
                      className="m-platform-prov-dot"
                      style={{ background: 'var(--m-green)' }}
                    ></div>
                    <span className="m-platform-prov-name">Dr. Sarah Chen, MD</span>
                    <span className="m-platform-prov-issue m-clear">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 2: Compliance Tracking ═══ */}
      <section className="m-section" style={{ background: 'var(--m-gray-50)' }} id="compliance">
        <div className="m-container">
          <div className="m-platform-feature m-reverse">
            <div className="m-platform-feature-text">
              <span className="m-tag">Integrated</span>
              <h2 className="m-platform-h2">Compliance Tracking</h2>
              <p>
                State regulations are mapped to provider-level checks automatically. When a new law
                takes effect or your provider&apos;s compliance status changes, your dashboard
                reflects it immediately.
              </p>
              <div className="m-platform-feature-list">
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>State-specific profiles</strong>
                    <span>TX (SB 1188, HB 149), CA (AB 3030), with FL, NY, IL coming Q3 2026</span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Auto-activation</strong>
                    <span>
                      Add a provider in a new state and the right compliance checks activate
                      automatically
                    </span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Compliance scoring</strong>
                    <span>Practice-level and provider-level scores visible on your dashboard</span>
                  </div>
                </div>
              </div>
              <Link href="/compliance" className="m-btn-outline" style={{ marginTop: '16px' }}>
                See state coverage details
                <ArrowIcon />
              </Link>
            </div>
            <div className="m-platform-feature-visual">
              <div className="m-platform-mock">
                <div className="m-platform-mock-header">
                  <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                  <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                  <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                  <span>Dashboard — Compliance</span>
                </div>
                <div className="m-platform-mock-body">
                  <div className="m-platform-comp-row">
                    <span className="m-platform-comp-state">Texas</span>
                    <div className="m-platform-comp-regs">
                      <span className="m-platform-comp-tag m-pending">SB 1188 — Pending</span>
                      <span className="m-platform-comp-tag m-pending">HB 149 — Pending</span>
                    </div>
                  </div>
                  <div className="m-platform-comp-row">
                    <span className="m-platform-comp-state">California</span>
                    <div className="m-platform-comp-regs">
                      <span className="m-platform-comp-tag m-ok">AB 3030 — Compliant</span>
                    </div>
                  </div>
                  <div className="m-platform-score-bar-wrap">
                    <div className="m-platform-score-label">Practice compliance score</div>
                    <div className="m-platform-score-bar">
                      <div className="m-platform-score-fill" style={{ width: '72%' }}></div>
                    </div>
                    <span className="m-platform-score-pct">72%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 3: Credentialing Workflows ═══ */}
      <section className="m-section" id="credentialing">
        <div className="m-container">
          <div className="m-platform-feature">
            <div className="m-platform-feature-text">
              <span className="m-tag m-tag-blue">Workflow</span>
              <h2 className="m-platform-h2">Credentialing Workflows</h2>
              <p>
                When a new provider joins or needs re-credentialing, KairoLogic creates a tracked
                workflow from assessment through payer enrollment. Every step is visible, every
                deadline is tracked.
              </p>
              <div className="m-platform-feature-list">
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>5-stage pipeline</strong>
                    <span>Assess → CAQH → NPPES → Payer Enrollment → Continuous Monitoring</span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Clear ownership</strong>
                    <span>See what KairoLogic handles vs. what you need to do at each step</span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Multi-payer tracking</strong>
                    <span>
                      Track enrollment status across UHC, Aetna, Cigna, Humana, BCBS, and more
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="m-platform-feature-visual">
              <div className="m-platform-mock">
                <div className="m-platform-mock-header">
                  <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                  <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                  <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                  <span>Dashboard — Active Workflow</span>
                </div>
                <div className="m-platform-mock-body">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--m-navy)',
                      marginBottom: '4px',
                    }}
                  >
                    Dr. Marcus Webb, DO
                  </div>
                  <div
                    style={{ fontSize: '10px', color: 'var(--m-gray-400)', marginBottom: '16px' }}
                  >
                    Family Medicine &middot; Onboarding
                  </div>
                  <div className="m-platform-wf-steps">
                    <div className="m-platform-wf-step m-done">Assess</div>
                    <div className="m-platform-wf-step m-done">CAQH</div>
                    <div className="m-platform-wf-step m-active">NPPES</div>
                    <div className="m-platform-wf-step">Payers</div>
                    <div className="m-platform-wf-step">Monitor</div>
                  </div>
                  <div className="m-platform-wf-tasks">
                    <div className="m-platform-wf-task">
                      <span className="m-wf-done">&#10003;</span> Assessment complete
                    </div>
                    <div className="m-platform-wf-task">
                      <span className="m-wf-done">&#10003;</span> CAQH profile updated
                    </div>
                    <div className="m-platform-wf-task">
                      <span className="m-wf-active">&#8226;</span> Submit NPPES correction
                    </div>
                    <div className="m-platform-wf-task">
                      <span className="m-wf-pending">&#9675;</span> Payer enrollment (3)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 4: Payer Directory Monitoring ═══ */}
      <section
        className="m-section"
        style={{ background: 'var(--m-gray-50)' }}
        id="payer-directories"
      >
        <div className="m-container">
          <div className="m-platform-feature m-reverse">
            <div className="m-platform-feature-text">
              <span className="m-tag m-tag-green">Connected</span>
              <h2 className="m-platform-h2">Payer Directory Monitoring</h2>
              <p>
                Your providers are listed in payer directories — but is the data accurate?
                KairoLogic queries each payer&apos;s FHIR directory and flags mismatches against
                your verified data.
              </p>
              <div className="m-platform-feature-list">
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>5 major payers connected</strong>
                    <span>UnitedHealthcare, Aetna, Cigna, Humana, BCBS — with more coming</span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Field-level mismatch detection</strong>
                    <span>Name, address, phone, specialty — every field compared and flagged</span>
                  </div>
                </div>
                <div className="m-platform-feature-item">
                  <span className="m-platform-check">&#10003;</span>
                  <div>
                    <strong>Correction workflows</strong>
                    <span>
                      Auto-generated fix instructions: update CAQH, contact payer relations, or both
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="m-platform-feature-visual">
              <div className="m-platform-mock">
                <div className="m-platform-mock-header">
                  <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                  <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                  <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                  <span>Dashboard — Payer Directories</span>
                </div>
                <div className="m-platform-mock-body">
                  <div className="m-platform-payer-grid">
                    <div className="m-platform-payer-cell m-match">
                      UHC<span>Match</span>
                    </div>
                    <div className="m-platform-payer-cell m-mismatch">
                      Aetna<span>Mismatch</span>
                    </div>
                    <div className="m-platform-payer-cell m-match">
                      Cigna<span>Match</span>
                    </div>
                    <div className="m-platform-payer-cell m-not-listed">
                      Humana<span>Not listed</span>
                    </div>
                    <div className="m-platform-payer-cell m-match">
                      BCBS<span>Match</span>
                    </div>
                  </div>
                  <div className="m-platform-mismatch-detail">
                    <div className="m-platform-mismatch-field">
                      <span className="m-platform-mismatch-label">Address (Aetna)</span>
                      <div className="m-platform-mismatch-vals">
                        <span className="m-val-nppes">NPPES: 123 Main St, Austin TX</span>
                        <span className="m-val-payer">Aetna: 456 Oak Ave, Austin TX</span>
                      </div>
                    </div>
                  </div>
                </div>
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
              See your provider data <em>clearly.</em>
            </h2>
            <p>21-day free trial — full platform access, no credit card required.</p>
            <div className="m-cta-actions">
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/solutions" className="m-btn-ghost">
                See who it&apos;s for
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
