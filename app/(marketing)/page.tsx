import Link from 'next/link';
import DashboardHero from '@/components/marketing/DashboardHero';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO — Centered headline + animated dashboard ═══ */}
      <section className="m-hero m-hero-v2">
        <div className="m-container">
          <div className="m-hero-centered">
            <span className="m-tag">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/></svg>
              Provider Data Intelligence Platform
            </span>
            <h1>Know your providers.<br/><em>Before problems arise.</em></h1>
            <p className="m-hero-desc">
              KairoLogic continuously monitors 1.8M+ provider records for data integrity,
              credential drift, and state regulation compliance — giving healthcare
              organizations real-time confidence in their provider data.
            </p>
            <div className="m-hero-actions">
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/demo" className="m-btn-outline">Watch a Demo</Link>
            </div>
            <div className="m-hero-note">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L8 5h4.5L9 7.5l1.5 4L6.5 9 3 11.5l1.5-4L1 5H5.5L6.5 1z" fill="currentColor"/></svg>
              14-day free trial &middot; No credit card required &middot; HIPAA-aligned infrastructure
            </div>
          </div>
        </div>

        {/* Animated product dashboard */}
        <div className="m-hero-dashboard-wrap">
          <div className="m-container m-container-wide">
            <DashboardHero />
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP — Compliance badges + stats ═══ */}
      <section className="m-trust-strip">
        <div className="m-container">
          <div className="m-trust-strip-inner">
            <div className="m-trust-badge">
              <div className="m-trust-badge-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="m-trust-badge-text">
                <strong>HIPAA-Aligned</strong>
                <span>Infrastructure</span>
              </div>
            </div>
            <div className="m-trust-badge">
              <div className="m-trust-badge-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="m-trust-badge-text">
                <strong>SOC 2 Type II</strong>
                <span>In progress</span>
              </div>
            </div>
            <div className="m-trust-divider"></div>
            <div className="m-trust-stat-inline">
              <strong>1.8M+</strong>
              <span>Provider records</span>
            </div>
            <div className="m-trust-stat-inline">
              <strong>TX &amp; CA</strong>
              <span>Live now</span>
            </div>
            <div className="m-trust-stat-inline">
              <strong>&lt;30s</strong>
              <span>Scan turnaround</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SCENARIO CARDS — Risk-anchored problem/solution ═══ */}
      <section className="m-section m-scenarios-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag">Why KairoLogic</span>
            <h2>Provider data breaks in <em>predictable ways</em></h2>
            <p>Every scenario below is costing healthcare organizations time, money, and compliance standing right now. KairoLogic catches them automatically.</p>
          </div>
          <div className="m-scenario-grid">
            {/* Scenario 1: Address Drift */}
            <div className="m-scenario-card">
              <div className="m-scenario-trigger">
                <div className="m-scenario-trigger-icon m-trigger-red">&#9888;</div>
                <div className="m-scenario-trigger-text">
                  <div className="m-scenario-when">A provider moved offices</div>
                  <div className="m-scenario-what">NPPES still shows the old address. Payer directory lists a third location. Practice website has the correct one.</div>
                </div>
              </div>
              <div className="m-scenario-divider"></div>
              <div className="m-scenario-response">
                <div className="m-scenario-response-label">KairoLogic detects</div>
                <h3>Address Drift</h3>
                <p>Cross-references NPPES, payer directories, and 34K+ practice websites to flag mismatches. Surfaces the correct address and generates a resolution workflow — before patients show up at the wrong location.</p>
                <div className="m-scenario-checks">
                  <span>NPI address verification</span>
                  <span>Website scan matching</span>
                  <span>Payer directory sync</span>
                </div>
              </div>
            </div>

            {/* Scenario 2: State Compliance */}
            <div className="m-scenario-card">
              <div className="m-scenario-trigger">
                <div className="m-scenario-trigger-icon m-trigger-gold">&#9878;&#65039;</div>
                <div className="m-scenario-trigger-text">
                  <div className="m-scenario-when">A new state regulation took effect</div>
                  <div className="m-scenario-what">Texas SB 1188 now requires data sovereignty attestation. Your 24 providers need compliance checks — today, not next quarter.</div>
                </div>
              </div>
              <div className="m-scenario-divider"></div>
              <div className="m-scenario-response">
                <div className="m-scenario-response-label">KairoLogic surfaces</div>
                <h3>Compliance Gaps</h3>
                <p>Maps each state regulation to provider-level checks and surfaces non-compliance the moment a law takes effect. Your dashboard shows exactly which providers are affected and what needs to change.</p>
                <div className="m-scenario-checks">
                  <span>SB 1188 data sovereignty</span>
                  <span>HB 149 AI transparency</span>
                  <span>AB 3030 AI in healthcare</span>
                </div>
              </div>
            </div>

            {/* Scenario 3: Credentialing */}
            <div className="m-scenario-card">
              <div className="m-scenario-trigger">
                <div className="m-scenario-trigger-icon m-trigger-blue">&#128100;</div>
                <div className="m-scenario-trigger-text">
                  <div className="m-scenario-when">A new provider joined your practice</div>
                  <div className="m-scenario-what">They need CAQH updated, NPPES corrected, and enrollment with 3 payers — each with its own timeline, forms, and follow-ups.</div>
                </div>
              </div>
              <div className="m-scenario-divider"></div>
              <div className="m-scenario-response">
                <div className="m-scenario-response-label">KairoLogic orchestrates</div>
                <h3>Credentialing Pipeline</h3>
                <p>Automatically creates a step-by-step workflow: assess the provider&apos;s current data, update CAQH, correct NPPES, submit payer enrollments, and begin continuous monitoring. Every step is tracked and visible.</p>
                <div className="m-scenario-checks">
                  <span>5-stage pipeline</span>
                  <span>Payer enrollment tracking</span>
                  <span>Automated monitoring</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CREDENTIALING PIPELINE — Full-width visualization ═══ */}
      <section className="m-section m-pipeline-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag m-tag-blue">Credentialing Workflow</span>
            <h2>From new provider to <em>fully enrolled</em></h2>
            <p>Most credentialing takes 90–120 days with manual tracking. KairoLogic gives you visibility into every step and handles the data work for you.</p>
          </div>

          <div className="m-pipeline-visual">
            {/* Pipeline Steps */}
            <div className="m-pipeline-steps">
              <div className="m-pipeline-step m-step-done">
                <div className="m-pipeline-step-num">1</div>
                <div className="m-pipeline-step-content">
                  <h4>Assess</h4>
                  <p>14-point integrity scan against NPPES, state boards, PECOS, and practice websites</p>
                </div>
                <div className="m-pipeline-step-owner">
                  <span className="m-owner-auto">KairoLogic</span>
                </div>
              </div>
              <div className="m-pipeline-connector"></div>
              <div className="m-pipeline-step m-step-done">
                <div className="m-pipeline-step-num">2</div>
                <div className="m-pipeline-step-content">
                  <h4>CAQH Update</h4>
                  <p>Flag outdated CAQH fields and generate corrections based on verified data</p>
                </div>
                <div className="m-pipeline-step-owner">
                  <span className="m-owner-auto">KairoLogic</span>
                  <span className="m-owner-you">You review</span>
                </div>
              </div>
              <div className="m-pipeline-connector"></div>
              <div className="m-pipeline-step m-step-active">
                <div className="m-pipeline-step-num">3</div>
                <div className="m-pipeline-step-content">
                  <h4>NPPES Correction</h4>
                  <p>Submit address and taxonomy corrections to NPPES with pre-filled data</p>
                </div>
                <div className="m-pipeline-step-owner">
                  <span className="m-owner-auto">KairoLogic</span>
                  <span className="m-owner-you">You submit</span>
                </div>
              </div>
              <div className="m-pipeline-connector"></div>
              <div className="m-pipeline-step">
                <div className="m-pipeline-step-num">4</div>
                <div className="m-pipeline-step-content">
                  <h4>Payer Enrollment</h4>
                  <p>Track enrollment status across UHC, Humana, Cigna, Aetna, BCBS, and more</p>
                </div>
                <div className="m-pipeline-step-owner">
                  <span className="m-owner-auto">KairoLogic tracks</span>
                  <span className="m-owner-you">You submit</span>
                </div>
              </div>
              <div className="m-pipeline-connector"></div>
              <div className="m-pipeline-step">
                <div className="m-pipeline-step-num">5</div>
                <div className="m-pipeline-step-content">
                  <h4>Monitor</h4>
                  <p>Continuous monitoring for data drift, license changes, and directory discrepancies</p>
                </div>
                <div className="m-pipeline-step-owner">
                  <span className="m-owner-auto">KairoLogic</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="m-pipeline-legend">
              <div className="m-legend-item">
                <span className="m-legend-dot m-legend-auto"></span>
                What KairoLogic handles
              </div>
              <div className="m-legend-item">
                <span className="m-legend-dot m-legend-you"></span>
                What you do
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATE COMPLIANCE — Coverage map ═══ */}
      <section className="m-section m-coverage-section">
        <div className="m-container">
          <div className="m-coverage-layout">
            <div className="m-coverage-text">
              <span className="m-tag m-tag-green">State Coverage</span>
              <h2>One platform.<br/><em>Every state&apos;s rules.</em></h2>
              <p>Healthcare regulation varies by state. KairoLogic maintains state-specific compliance profiles so the right checks run automatically based on where each provider practices.</p>
              <div className="m-coverage-states">
                <div className="m-coverage-state m-state-live">
                  <div className="m-state-status-dot m-live"></div>
                  <div>
                    <strong>Texas</strong>
                    <span>SB 1188 &middot; HB 149 &middot; TMB license checks</span>
                  </div>
                </div>
                <div className="m-coverage-state m-state-live">
                  <div className="m-state-status-dot m-live"></div>
                  <div>
                    <strong>California</strong>
                    <span>AB 3030 &middot; MBC license checks &middot; FHIR directory</span>
                  </div>
                </div>
                <div className="m-coverage-state m-state-coming">
                  <div className="m-state-status-dot m-coming-dot"></div>
                  <div>
                    <strong>Florida, New York, Illinois</strong>
                    <span>Q3 2026 &middot; +45 states on the roadmap</span>
                  </div>
                </div>
              </div>
              <Link href="/compliance" className="m-btn-outline" style={{ marginTop: '24px' }}>
                See what we track by state
                <ArrowIcon />
              </Link>
            </div>
            <div className="m-coverage-visual">
              <div className="m-coverage-map">
                <div className="m-map-bg">
                  <div className="m-map-dot m-large" style={{ left: '30%', top: '55%' }}></div>
                  <div className="m-map-dot" style={{ left: '34%', top: '62%' }}></div>
                  <div className="m-map-dot" style={{ left: '26%', top: '48%' }}></div>
                  <div className="m-map-dot m-large" style={{ left: '12%', top: '50%' }}></div>
                  <div className="m-map-dot" style={{ left: '10%', top: '42%' }}></div>
                  <div className="m-map-label" style={{ left: '26%', top: '68%' }}>Texas</div>
                  <div className="m-map-label" style={{ left: '6%', top: '56%' }}>California</div>
                </div>
              </div>
              <div className="m-coverage-stats">
                <div className="m-cov-stat">
                  <div className="m-cov-stat-num">14</div>
                  <div className="m-cov-stat-label">Integrity checks per provider</div>
                </div>
                <div className="m-cov-stat">
                  <div className="m-cov-stat-num">34K+</div>
                  <div className="m-cov-stat-label">Practice websites monitored</div>
                </div>
                <div className="m-cov-stat">
                  <div className="m-cov-stat-num">Weekly</div>
                  <div className="m-cov-stat-label">NPPES differential sync</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOUNDERS RATE — Simplified single callout ═══ */}
      <section className="m-section m-founders-section">
        <div className="m-container">
          <div className="m-founders-card">
            <div className="m-founders-content">
              <span className="m-tag">Limited Availability</span>
              <h2>Founders Rate: <em>$99/mo flat</em></h2>
              <p>
                We&apos;re onboarding our first 20 organizations at a flat rate of $99/month —
                regardless of roster size. Full platform access, all compliance checks,
                credentialing workflows, and priority support included.
              </p>
              <div className="m-founders-perks">
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  Unlimited providers
                </div>
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  Full compliance dashboard
                </div>
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  Credentialing workflows
                </div>
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  Priority support
                </div>
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  Rate locked for 12 months
                </div>
                <div className="m-founders-perk">
                  <span className="m-perk-check">&#10003;</span>
                  No credit card required
                </div>
              </div>
              <div className="m-founders-actions">
                <Link href="/contact" className="m-btn-primary m-gold">
                  Apply for Founders Rate
                  <ArrowIcon />
                </Link>
                <Link href="/pricing" className="m-btn-ghost">See all pricing plans &rarr;</Link>
              </div>
              <div className="m-founders-spots">
                <div className="m-spots-bar">
                  <div className="m-spots-fill" style={{ width: '35%' }}></div>
                </div>
                <span>7 of 20 spots filled</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="m-section m-social-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag m-tag-green">Trusted by Providers</span>
            <h2>What healthcare organizations <em>are saying</em></h2>
          </div>
          <div className="m-testimonial-grid">
            <div className="m-testimonial-card">
              <div className="m-testi-quote">&ldquo;</div>
              <div className="m-testi-text">KairoLogic caught an address mismatch for one of our providers that had been quietly failing PECOS verification for three months. Fixed in 24 hours instead of the next credentialing cycle.</div>
              <div className="m-testi-author">
                <div className="m-testi-avatar">MR</div>
                <div>
                  <div className="m-testi-name">Michael Rodriguez, CVO</div>
                  <div className="m-testi-role">North Texas Regional Health Network</div>
                </div>
              </div>
            </div>
            <div className="m-testimonial-card">
              <div className="m-testi-quote">&ldquo;</div>
              <div className="m-testi-text">As a solo practice in Texas, keeping up with SB 1188 and HB 149 felt impossible. KairoLogic&apos;s dashboard tells me exactly what to fix and why — no lawyer required.</div>
              <div className="m-testi-author">
                <div className="m-testi-avatar" style={{ background: 'var(--m-navy-light)' }}>SC</div>
                <div>
                  <div className="m-testi-name">Dr. Sandra Cho, MD</div>
                  <div className="m-testi-role">Austin Family Practice</div>
                </div>
              </div>
            </div>
            <div className="m-testimonial-card">
              <div className="m-testi-quote">&ldquo;</div>
              <div className="m-testi-text">We run credentialing for 200+ providers across TX and CA. KairoLogic&apos;s roster monitoring means we see departures and additions within days, not at the next audit.</div>
              <div className="m-testi-author">
                <div className="m-testi-avatar" style={{ background: '#4A6FA5' }}>JL</div>
                <div>
                  <div className="m-testi-name">Jennifer Lim, Director of Credentialing</div>
                  <div className="m-testi-role">Southwest Medical Partners</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA BAND ═══ */}
      <div className="m-cta-band">
        <div className="m-container">
          <div className="m-cta-inner">
            <span className="m-tag" style={{ background: 'rgba(212,160,23,0.15)', color: 'var(--m-gold)', borderColor: 'rgba(212,160,23,0.3)' }}>Get Started Today</span>
            <h2>Your provider data is <em>drifting right now.</em></h2>
            <p>Start monitoring your provider roster in minutes — full platform access for 14 days, no credit card required.</p>
            <div className="m-cta-actions">
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/demo" className="m-btn-ghost">Watch a Demo</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
