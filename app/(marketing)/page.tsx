import Link from 'next/link';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="m-hero">
        <div className="m-container">
          <div className="m-hero-inner">
            <div className="m-hero-content">
              <div className="m-hero-label">
                <span className="m-tag">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/></svg>
                  Provider Data Intelligence Platform
                </span>
              </div>
              <h1>Know your providers.<br/><em>Before problems arise.</em></h1>
              <p className="m-hero-desc">
                KairoLogic continuously monitors 1.8M+ provider records for data integrity, credential drift,
                address mismatches, and state regulation compliance — giving healthcare organizations real-time
                confidence in their provider data.
              </p>
              <div className="m-hero-actions">
                <Link href="/contact" className="m-btn-primary m-gold">
                  Request a Demo
                  <ArrowIcon />
                </Link>
                <Link href="/registry" className="m-btn-outline">Explore the Registry</Link>
              </div>
              <div className="m-hero-note">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L8 5h4.5L9 7.5l1.5 4L6.5 9 3 11.5l1.5-4L1 5H5.5L6.5 1z" fill="currentColor"/></svg>
                No credit card required &middot; HIPAA-aligned infrastructure &middot; TX &amp; CA live
              </div>
            </div>

            {/* Dashboard Preview — matches real product */}
            <div className="m-hero-visual">
              {/* Floating badge left */}
              <div className="m-float-badge m-left">
                <div className="m-float-icon" style={{ background: 'var(--m-green-pale)' }}>&#10003;</div>
                <div className="m-float-badge-text">
                  <div className="m-title">NPI Verified</div>
                  <div className="m-sub">Dr. Sarah Chen &middot; TX</div>
                </div>
              </div>

              <div className="m-dashboard-frame m-app-frame">
                {/* Dark Navy Sidebar */}
                <div className="m-app-sidebar">
                  <div className="m-app-sidebar-logo">KairoLogic</div>
                  <div className="m-app-sidebar-practice">
                    <div className="m-app-practice-name">North Texas Medical Surgical Clinic PA</div>
                    <div className="m-app-practice-meta">Denton, TX &middot; 18 providers</div>
                  </div>
                  <nav className="m-app-sidebar-nav">
                    <div className="m-app-nav-item m-active">
                      <span className="m-app-nav-dot" style={{ background: 'var(--m-green)' }}></span>
                      Dashboard
                    </div>
                    <div className="m-app-nav-item">
                      <span className="m-app-nav-dot" style={{ background: 'var(--m-gold)' }}></span>
                      Provider roster
                    </div>
                    <div className="m-app-nav-item">
                      <span className="m-app-nav-dot" style={{ background: 'var(--m-gray-400)' }}></span>
                      Compliance
                    </div>
                    <div className="m-app-nav-item">
                      <span className="m-app-nav-dot" style={{ background: 'var(--m-gray-400)' }}></span>
                      Documents
                    </div>
                    <div className="m-app-nav-item">
                      <span className="m-app-nav-dot" style={{ background: 'var(--m-gray-400)' }}></span>
                      Audit trail
                    </div>
                  </nav>
                  <div className="m-app-sidebar-soon">
                    <div className="m-app-soon-label">COMING SOON</div>
                    <div className="m-app-nav-item m-disabled">Reports</div>
                    <div className="m-app-nav-item m-disabled">Settings</div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="m-app-main">
                  {/* Top Header */}
                  <div className="m-app-topbar">
                    <div>
                      <div className="m-app-page-title">Dashboard</div>
                      <div className="m-app-page-meta">NORTH TEXAS MEDICAL SURGICAL CLINIC PA &middot; 18 providers &middot; Last sync: 2 hours ago</div>
                    </div>
                    <div className="m-app-topbar-actions">
                      <span className="m-app-btn-add">+ Add provider</span>
                      <span className="m-app-status-dot"></span>
                      <span className="m-app-status-text">Operational</span>
                    </div>
                  </div>

                  {/* Welcome Banner */}
                  <div className="m-app-welcome-banner">
                    <div className="m-app-welcome-text">
                      <strong>Welcome, support</strong>
                      <span className="m-app-trial-badge">FREE TRIAL</span>
                    </div>
                    <div className="m-app-welcome-desc">17 of your 19 providers need attention. Click any provider below to review issues, approve corrections, and track resolution.</div>
                  </div>

                  {/* Status KPI Cards */}
                  <div className="m-app-kpi-row">
                    <div className="m-app-kpi m-app-kpi-red">
                      <div className="m-app-kpi-num">17</div>
                      <div className="m-app-kpi-label">Needs attention</div>
                    </div>
                    <div className="m-app-kpi m-app-kpi-yellow">
                      <div className="m-app-kpi-num">0</div>
                      <div className="m-app-kpi-label">In progress</div>
                    </div>
                    <div className="m-app-kpi m-app-kpi-blue">
                      <div className="m-app-kpi-num">0</div>
                      <div className="m-app-kpi-label">Monitoring</div>
                    </div>
                    <div className="m-app-kpi m-app-kpi-green">
                      <div className="m-app-kpi-num">2</div>
                      <div className="m-app-kpi-label">All clear</div>
                    </div>
                  </div>

                  {/* Bottom Two-Col: Priority Providers + Compliance */}
                  <div className="m-app-bottom-row">
                    <div className="m-app-providers-panel">
                      <div className="m-app-panel-header">
                        <span className="m-app-panel-title">PRIORITY PROVIDERS</span>
                        <span className="m-app-panel-link">View all 19 providers &rarr;</span>
                      </div>
                      <div className="m-app-provider-row">
                        <div className="m-app-prov-avatar" style={{ background: '#E8A0A0' }}>DW</div>
                        <div className="m-app-prov-info">
                          <div className="m-app-prov-name">David Willingham</div>
                          <div className="m-app-prov-npi">1750312120</div>
                          <div className="m-app-prov-specialty">Optometry</div>
                          <span className="m-app-prov-tag">Credentialing</span>
                        </div>
                        <div className="m-app-prov-issues m-app-issues-red">1 issue</div>
                      </div>
                      <div className="m-app-provider-row">
                        <div className="m-app-prov-avatar" style={{ background: '#E8A0A0' }}>RC</div>
                        <div className="m-app-prov-info">
                          <div className="m-app-prov-name">Robert Connaughton</div>
                          <div className="m-app-prov-npi">1326061003</div>
                        </div>
                        <div className="m-app-prov-issues m-app-issues-red">2 issues</div>
                      </div>
                    </div>

                    <div className="m-app-compliance-panel">
                      <div className="m-app-panel-title">PRACTICE COMPLIANCE</div>
                      <div className="m-app-compliance-score">
                        <div className="m-app-score-bar"></div>
                        <span>Compliance score</span>
                      </div>
                      <div className="m-app-comp-item">
                        <span>SB 1188 (Data sov.)</span>
                        <span className="m-app-comp-status m-pending">Pending</span>
                      </div>
                      <div className="m-app-comp-item">
                        <span>HB 149 (AI transp.)</span>
                        <span className="m-app-comp-status m-pending">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge right */}
              <div className="m-float-badge m-right">
                <div className="m-float-icon" style={{ background: 'var(--m-red-pale)' }}>&#9888;</div>
                <div className="m-float-badge-text">
                  <div className="m-title">Drift Detected</div>
                  <div className="m-sub">Address mismatch &middot; 3 providers</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TRUST BAR ═══ */}
        <div className="m-trust-bar">
          <div className="m-container">
            <div className="m-trust-bar-inner">
              <div className="m-trust-stat">
                <div className="m-trust-num">1.8<em>M+</em></div>
                <div className="m-trust-label">Provider records indexed</div>
              </div>
              <div className="m-trust-stat">
                <div className="m-trust-num">34<em>K+</em></div>
                <div className="m-trust-label">Practice websites monitored</div>
              </div>
              <div className="m-trust-stat">
                <div className="m-trust-num">14</div>
                <div className="m-trust-label">Integrity checks per provider</div>
              </div>
              <div className="m-trust-stat">
                <div className="m-trust-num">TX <em>+</em> CA</div>
                <div className="m-trust-label">Live — 48 states coming</div>
              </div>
              <div className="m-trust-stat">
                <div className="m-trust-num">&lt;<em>30s</em></div>
                <div className="m-trust-label">Scan turnaround</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VALUE PROPS ═══ */}
      <section className="m-section m-value-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag">Why KairoLogic</span>
            <h2>Provider data is <em>messier</em> than you think</h2>
            <p>NPPES data goes stale. Websites drift. Regulations change. KairoLogic bridges the gap between what your data says and what&apos;s actually true on the ground.</p>
          </div>
          <div className="m-value-grid">
            <div className="m-value-card">
              <div className="m-value-icon">&#128269;</div>
              <h3>NPI &amp; Address Integrity</h3>
              <p>Cross-reference NPPES, state boards, and practice websites to catch address mismatches, inactive NPIs, and data discrepancies before they cause credentialing failures.</p>
            </div>
            <div className="m-value-card">
              <div className="m-value-icon">&#9878;&#65039;</div>
              <h3>State Regulation Compliance</h3>
              <p>Texas SB 1188, HB 149, California AB 3030 — our engine maps each regulation to provider-level checks and surfaces drift the moment it happens, filtered by your providers&apos; states.</p>
            </div>
            <div className="m-value-card">
              <div className="m-value-icon">&#128225;</div>
              <h3>Continuous Roster Monitoring</h3>
              <p>Detect when providers join or leave a practice through website scan analysis. Get ahead of roster drift before it affects payer contracts, directories, or patient access.</p>
            </div>
            <div className="m-value-card">
              <div className="m-value-icon">&#128451;&#65039;</div>
              <h3>NPPES Differential Sync</h3>
              <p>Weekly differential sync from NPPES keeps our registry current. You always see the latest provider data without waiting for quarterly credentialing cycles.</p>
            </div>
            <div className="m-value-card">
              <div className="m-value-icon">&#127973;</div>
              <h3>Practice-Level Intelligence</h3>
              <p>Group providers by practice, network, or geographic region. Understand your entire book at a glance — not just individual provider snapshots.</p>
            </div>
            <div className="m-value-card">
              <div className="m-value-icon">&#128640;</div>
              <h3>Built for National Scale</h3>
              <p>Architected for all 50 states from day one. State-specific regulation profiles activate automatically as providers are added — no manual configuration required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="m-section m-how-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag m-tag-blue">How It Works</span>
            <h2>From raw data to <em>actionable intelligence</em></h2>
            <p>Three steps from provider upload to continuous monitoring — no IT team or complex integration required to get started.</p>
          </div>
          <div className="m-steps-grid">
            <div className="m-step-card">
              <div className="m-step-num">01</div>
              <h3>Connect Your Roster</h3>
              <p>Upload a CSV or connect via API. KairoLogic resolves each provider against NPPES, state license boards, and 34K+ practice websites in your first scan.</p>
            </div>
            <div className="m-step-card">
              <div className="m-step-num">02</div>
              <h3>Baseline &amp; Score</h3>
              <p>Each provider receives an integrity score across 14 checks — NPI validity, address accuracy, credential status, and applicable state regulation compliance.</p>
            </div>
            <div className="m-step-card">
              <div className="m-step-num">03</div>
              <h3>Monitor &amp; Alert</h3>
              <p>Ongoing scans surface drift the moment it appears. Your dashboard shows real-time alerts, trend data, and a full audit trail for every change detected.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE 1: Provider Intelligence ═══ */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-feature-split">
            <div className="m-feature-text">
              <span className="m-tag m-tag-green">Provider Verification</span>
              <h2>Catch data integrity issues <em>before they escalate</em></h2>
              <p>Most credentialing problems start with a simple data mismatch — an address that changed, a name that was entered differently, a license that expired quietly. KairoLogic finds these automatically across your entire roster.</p>
              <ul className="m-feature-list">
                <li>NPI cross-referenced against NPPES, TMB, and PECOS simultaneously</li>
                <li>Address verification against USPS, Google Maps, and practice website data</li>
                <li>Taxonomy and specialty mismatch detection</li>
                <li>License board action monitoring (suspensions, probations, revocations)</li>
                <li>DEA and CDS credential status checks</li>
              </ul>
            </div>
            <div className="m-feature-visual">
              <div className="m-visual-header">
                <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                <span className="m-visual-title">Provider Roster — Austin Regional Medical</span>
              </div>
              <div className="m-visual-body">
                <div className="m-provider-card">
                  <div className="m-prov-avatar">SC</div>
                  <div className="m-prov-info">
                    <div className="m-prov-name">Dr. Sarah Chen, MD</div>
                    <div className="m-prov-meta">Internal Medicine &middot; Austin, TX</div>
                  </div>
                  <div className="m-prov-status">
                    <span className="m-status-badge m-verified">Verified</span>
                    <span className="m-prov-npi">NPI 1234567890</span>
                  </div>
                </div>
                <div className="m-provider-card">
                  <div className="m-prov-avatar" style={{ background: 'var(--m-gold)', color: 'var(--m-navy)' }}>MW</div>
                  <div className="m-prov-info">
                    <div className="m-prov-name">Dr. Marcus Webb, DO</div>
                    <div className="m-prov-meta">Family Medicine &middot; Houston, TX</div>
                  </div>
                  <div className="m-prov-status">
                    <span className="m-status-badge m-drift">Address Drift</span>
                    <span className="m-prov-npi">NPI 9876543210</span>
                  </div>
                </div>
                <div className="m-provider-card">
                  <div className="m-prov-avatar" style={{ background: '#4A90D9' }}>PN</div>
                  <div className="m-prov-info">
                    <div className="m-prov-name">Dr. Priya Nair, MD</div>
                    <div className="m-prov-meta">Pediatrics &middot; San Francisco, CA</div>
                  </div>
                  <div className="m-prov-status">
                    <span className="m-status-badge m-verified">Verified</span>
                    <span className="m-prov-npi">NPI 1122334455</span>
                  </div>
                </div>
                <div className="m-provider-card">
                  <div className="m-prov-avatar" style={{ background: 'var(--m-red)' }}>JR</div>
                  <div className="m-prov-info">
                    <div className="m-prov-name">Dr. James Rivera, DDS</div>
                    <div className="m-prov-meta">Dentistry &middot; Dallas, TX</div>
                  </div>
                  <div className="m-prov-status">
                    <span className="m-status-badge m-error">License Expiring</span>
                    <span className="m-prov-npi">NPI 5544332211</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ FEATURE 2: Multi-State ═══ */}
          <div className="m-feature-split m-reverse">
            <div className="m-feature-text">
              <span className="m-tag">Multi-State Coverage</span>
              <h2>One platform. <em>Every state&apos;s rules.</em></h2>
              <p>Regulation varies dramatically by state. KairoLogic maintains state-specific compliance profiles so the right checks run automatically for each provider based on where they practice — not a one-size-fits-all scan.</p>
              <ul className="m-feature-list">
                <li>Texas SB 1188 (data sovereignty) and HB 149 (AI disclosure) live now</li>
                <li>California AB 3030 (AI in healthcare) checks in active build</li>
                <li>State license board API integrations for TX TMB, CA MBC, and more</li>
                <li>New state profiles activate without re-configuring your account</li>
                <li>National PECOS enrollment data for CMS-enrolled providers</li>
              </ul>
            </div>
            <div className="m-feature-visual">
              <div className="m-visual-header">
                <div className="m-visual-dot" style={{ background: '#FF605C' }}></div>
                <div className="m-visual-dot" style={{ background: '#FFBD44' }}></div>
                <div className="m-visual-dot" style={{ background: '#00CA4E' }}></div>
                <span className="m-visual-title">State Coverage Map</span>
              </div>
              <div className="m-visual-body">
                <div className="m-map-visual">
                  <div className="m-map-bg">
                    <div className="m-map-dot m-large" style={{ left: '30%', top: '55%' }}></div>
                    <div className="m-map-dot" style={{ left: '34%', top: '62%' }}></div>
                    <div className="m-map-dot" style={{ left: '26%', top: '48%' }}></div>
                    <div className="m-map-dot m-large" style={{ left: '12%', top: '50%' }}></div>
                    <div className="m-map-dot" style={{ left: '10%', top: '42%' }}></div>
                    <div className="m-map-label" style={{ left: '26%', top: '68%' }}>Texas</div>
                    <div className="m-map-label" style={{ left: '6%', top: '56%' }}>California</div>
                  </div>
                  <div className="m-state-chips">
                    <div className="m-state-chip"><span className="m-dot"></span> Texas — Live</div>
                    <div className="m-state-chip"><span className="m-dot"></span> California — Live</div>
                    <div className="m-state-chip m-coming"><span className="m-dot"></span> Florida — Q3 2026</div>
                    <div className="m-state-chip m-coming"><span className="m-dot"></span> New York — Q3 2026</div>
                    <div className="m-state-chip m-coming"><span className="m-dot"></span> +46 states coming</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING — Model D Bands ═══ */}
      <section className="m-section m-pricing-section">
        <div className="m-container">
          <div className="m-section-header">
            <span className="m-tag m-tag-blue">Pricing</span>
            <h2>Simple plans for every <em>organization size</em></h2>
            <p>From solo practices to enterprise health systems — KairoLogic scales with your roster. All plans include TX and CA compliance coverage.</p>
          </div>
          <div className="m-pricing-grid">
            {/* Starter */}
            <div className="m-pricing-card">
              <div className="m-plan-name">Starter</div>
              <div className="m-plan-price"><sup>$</sup>49<sub>/mo</sub></div>
              <div className="m-plan-desc">For small practices with up to 5 providers. Full monitoring, all compliance checks included.</div>
              <div className="m-pricing-divider"></div>
              <ul className="m-pricing-features">
                <li>Up to 5 providers monitored</li>
                <li>Full 14-point integrity scan</li>
                <li>NPI + address verification</li>
                <li>State regulation compliance (TX &amp; CA)</li>
                <li>Real-time drift alerts</li>
                <li>Monthly compliance reports</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Get Started</Link>
            </div>

            {/* Growth (featured) */}
            <div className="m-pricing-card m-featured">
              <div className="m-pricing-badge">Most Popular</div>
              <div className="m-plan-name">Growth</div>
              <div className="m-plan-price"><sup>$</sup>99<sub>/mo</sub></div>
              <div className="m-plan-desc">For growing practices managing up to 15 providers with full dashboard access and priority support.</div>
              <div className="m-pricing-divider"></div>
              <ul className="m-pricing-features">
                <li>Up to 15 providers monitored</li>
                <li>Everything in Starter</li>
                <li>Live compliance dashboard</li>
                <li>Payer directory monitoring</li>
                <li>Credentialing workflow tracking</li>
                <li>Quarterly forensic reports</li>
                <li>Priority email support</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Start Monitoring</Link>
            </div>

            {/* Group */}
            <div className="m-pricing-card">
              <div className="m-plan-name">Group</div>
              <div className="m-plan-price"><sup>$</sup>199<sub>/mo</sub></div>
              <div className="m-plan-desc">For multi-site practices and groups managing up to 40 providers across locations.</div>
              <div className="m-pricing-divider"></div>
              <ul className="m-pricing-features">
                <li>Up to 40 providers monitored</li>
                <li>Everything in Growth</li>
                <li>Multi-location roster management</li>
                <li>NPPES differential sync</li>
                <li>Roster change detection</li>
                <li>Dedicated onboarding</li>
                <li>Phone support</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Contact Sales</Link>
            </div>

            {/* Enterprise */}
            <div className="m-pricing-card">
              <div className="m-plan-name">Enterprise</div>
              <div className="m-plan-price" style={{ fontSize: '32px', marginTop: '8px' }}>Custom</div>
              <div className="m-plan-desc">For health systems, payers, CVO organizations, and networks managing 40+ providers.</div>
              <div className="m-pricing-divider"></div>
              <ul className="m-pricing-features">
                <li>Unlimited provider roster</li>
                <li>API access + webhooks</li>
                <li>Multi-state coverage</li>
                <li>Bulk NPI resolution engine</li>
                <li>Custom SLA &amp; compliance reporting</li>
                <li>Dedicated account manager</li>
                <li>SSO &amp; advanced security</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Contact Sales</Link>
            </div>
          </div>

          {/* Founders Rate Callout */}
          <div className="m-founders-banner">
            <strong>Founders Rate:</strong> Join our early access program at <em>$99/mo flat</em> — regardless of roster size. Limited to first 20 organizations. <Link href="/contact" style={{ color: 'var(--m-gold)', fontWeight: 700, textDecoration: 'underline' }}>Apply now &rarr;</Link>
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
            <p>Run a free scan on any Texas or California provider and see exactly what KairoLogic finds in under 30 seconds.</p>
            <div className="m-cta-actions">
              <Link href="/scan" className="m-btn-primary m-gold">
                Run a Free Scan
                <ArrowIcon />
              </Link>
              <Link href="/contact" className="m-btn-ghost">Schedule a Demo</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
