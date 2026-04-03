import Link from 'next/link';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function SolutionsPage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="m-section" style={{ paddingTop: '56px', paddingBottom: '40px' }}>
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header" style={{ marginBottom: 0 }}>
            <span className="m-tag m-tag-blue">Solutions</span>
            <h1 className="m-page-title">
              Built for teams that manage<br />
              <em>provider data at scale</em>
            </h1>
            <p className="m-page-subtitle">
              Whether you&apos;re a practice administrator managing 10 providers or a credentialing
              organization overseeing thousands, KairoLogic adapts to how you work.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ SEGMENT 1: Medical Groups ═══ */}
      <section className="m-section" style={{ paddingTop: '16px' }} id="practices">
        <div className="m-container">
          <div className="m-solution-card">
            <div className="m-solution-content">
              <span className="m-solution-eyebrow">For Medical Groups &amp; Practices</span>
              <h2>Stop credentialing fires <em>before they start</em></h2>
              <p>
                You run a practice. You shouldn&apos;t also have to manually track whether every
                provider&apos;s NPI is current, their payer listings are accurate, and your state&apos;s
                latest regulations are being met. KairoLogic does that for you.
              </p>
              <div className="m-solution-benefits">
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128269;</span>
                  <div>
                    <strong>Catch data issues early</strong>
                    <span>Address mismatches, expired licenses, and taxonomy errors flagged automatically</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#9878;&#65039;</span>
                  <div>
                    <strong>Stay compliant without a compliance team</strong>
                    <span>State regulation checks run automatically based on where your providers practice</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128337;</span>
                  <div>
                    <strong>Save hours on credentialing</strong>
                    <span>New provider onboarding tracked from assessment through payer enrollment</span>
                  </div>
                </div>
              </div>
              <div className="m-solution-ideal">
                <strong>Ideal for:</strong> Solo practices, group practices, multi-site medical groups (1–40 providers)
              </div>
              <Link href="/contact" className="m-btn-primary m-gold" style={{ marginTop: '20px' }}>
                Get Started
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEGMENT 2: CVOs ═══ */}
      <section className="m-section" style={{ background: 'var(--m-gray-50)' }} id="cvos">
        <div className="m-container">
          <div className="m-solution-card">
            <div className="m-solution-content">
              <span className="m-solution-eyebrow">For CVOs &amp; Credentialing Organizations</span>
              <h2>Verify faster, <em>monitor continuously</em></h2>
              <p>
                Credentialing verification is a data problem. You&apos;re comparing provider-submitted
                information against primary sources — NPPES, state boards, payer directories — and
                the data changes constantly. KairoLogic keeps those comparisons current.
              </p>
              <div className="m-solution-benefits">
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128640;</span>
                  <div>
                    <strong>Continuous primary source verification</strong>
                    <span>NPPES, state medical boards, PECOS, and payer directories checked on an ongoing basis</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128451;&#65039;</span>
                  <div>
                    <strong>Audit-ready data trail</strong>
                    <span>Every verification, every change, every alert logged with timestamps</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128202;</span>
                  <div>
                    <strong>Payer enrollment tracking</strong>
                    <span>Monitor enrollment status across all major payers from one dashboard</span>
                  </div>
                </div>
              </div>
              <div className="m-solution-ideal">
                <strong>Ideal for:</strong> Credentialing verification organizations, medical staffing companies, delegated credentialing teams
              </div>
              <Link href="/contact" className="m-btn-primary m-gold" style={{ marginTop: '20px' }}>
                Get Started
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEGMENT 3: Health Systems ═══ */}
      <section className="m-section" id="health-systems">
        <div className="m-container">
          <div className="m-solution-card">
            <div className="m-solution-content">
              <span className="m-solution-eyebrow">For Health Systems &amp; Networks</span>
              <h2>Multi-state, multi-site <em>provider intelligence</em></h2>
              <p>
                Managing provider data across locations, states, and payer contracts means complexity
                multiplies. KairoLogic gives you a single view across your entire network with
                state-specific compliance built in.
              </p>
              <div className="m-solution-benefits">
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#127758;</span>
                  <div>
                    <strong>Multi-state compliance coverage</strong>
                    <span>TX and CA live today, with 48 more states on the roadmap — all automatic</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128279;</span>
                  <div>
                    <strong>API access</strong>
                    <span>Integrate provider intelligence into your existing systems and workflows</span>
                  </div>
                </div>
                <div className="m-solution-benefit">
                  <span className="m-solution-benefit-icon">&#128101;</span>
                  <div>
                    <strong>Unlimited provider roster</strong>
                    <span>No per-provider pricing at enterprise scale — monitor your entire network</span>
                  </div>
                </div>
              </div>
              <div className="m-solution-ideal">
                <strong>Ideal for:</strong> Health systems, physician networks, IPAs, MSOs, payer provider relations teams (40+ providers)
              </div>
              <Link href="/contact" className="m-btn-primary m-gold" style={{ marginTop: '20px' }}>
                Contact Sales
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <div className="m-cta-band">
        <div className="m-container">
          <div className="m-cta-inner">
            <span className="m-tag" style={{ background: 'rgba(212,160,23,0.15)', color: 'var(--m-gold)', borderColor: 'rgba(212,160,23,0.3)' }}>Get Started</span>
            <h2>Ready to see what KairoLogic <em>finds?</em></h2>
            <p>14-day free trial — full platform access, no credit card required.</p>
            <div className="m-cta-actions">
              <Link href="/contact" className="m-btn-primary m-gold">
                Get Started
                <ArrowIcon />
              </Link>
              <Link href="/platform" className="m-btn-ghost">Explore the Platform</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
