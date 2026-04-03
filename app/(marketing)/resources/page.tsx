import Link from 'next/link';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ResourcesPage() {
  return (
    <>
      <section className="m-section" style={{ paddingTop: '56px' }}>
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header">
            <span className="m-tag m-tag-blue">Resources</span>
            <h1 className="m-page-title">
              Learn, explore, <em>stay informed</em>
            </h1>
            <p className="m-page-subtitle">
              Guides, documentation, and insights to help you get the most from KairoLogic
              and stay ahead of provider data challenges.
            </p>
          </div>
        </div>
      </section>

      <section className="m-section" style={{ paddingTop: 0 }}>
        <div className="m-container">
          <div className="m-resources-grid">
            {/* State Compliance Guide */}
            <Link href="/compliance" className="m-resource-card m-resource-featured">
              <div className="m-resource-tag">Guide</div>
              <h2>State Compliance Guide</h2>
              <p>
                A detailed breakdown of state-level healthcare regulations that KairoLogic tracks —
                TX (SB 1188, HB 149), CA (AB 3030), and upcoming states.
              </p>
              <span className="m-resource-link">
                Read the guide <ArrowIcon />
              </span>
            </Link>

            {/* Pricing */}
            <Link href="/pricing" className="m-resource-card">
              <div className="m-resource-tag">Plans</div>
              <h2>Pricing</h2>
              <p>
                Simple plans for every organization size — from solo practices to enterprise health systems.
                See the Founders Rate and all available tiers.
              </p>
              <span className="m-resource-link">
                View pricing <ArrowIcon />
              </span>
            </Link>

            {/* Insights */}
            <Link href="/blog" className="m-resource-card">
              <div className="m-resource-tag">Blog</div>
              <h2>Insights &amp; Blog</h2>
              <p>
                Analysis of provider data trends, regulatory changes, and credentialing best practices.
                Written for practice administrators and compliance teams.
              </p>
              <span className="m-resource-link">
                Read articles <ArrowIcon />
              </span>
            </Link>

            {/* API Docs */}
            <div className="m-resource-card m-resource-coming">
              <div className="m-resource-tag">Coming Soon</div>
              <h2>API Documentation</h2>
              <p>
                Integrate KairoLogic&apos;s provider intelligence into your existing systems.
                REST API with provider lookup, compliance status, and mismatch detection.
              </p>
              <span className="m-resource-link m-muted">
                Coming soon
              </span>
            </div>

            {/* Contact / Support */}
            <Link href="/contact" className="m-resource-card">
              <div className="m-resource-tag">Support</div>
              <h2>Contact Us</h2>
              <p>
                Questions about KairoLogic? Reach out to our team.
                Email info@kairologic.net or call (512) 402-2237.
              </p>
              <span className="m-resource-link">
                Get in touch <ArrowIcon />
              </span>
            </Link>

            {/* Get Started */}
            <Link href="/contact" className="m-resource-card m-resource-cta">
              <div className="m-resource-tag">Free Trial</div>
              <h2>Get Started</h2>
              <p>
                Start your 14-day free trial today. Full platform access,
                no credit card required.
              </p>
              <span className="m-resource-link">
                Start free trial <ArrowIcon />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
