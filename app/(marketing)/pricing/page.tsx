import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — KairoLogic',
  description: 'Simple, transparent pricing for provider data intelligence. Start with a free trial.',
};

export default function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="m-section" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="m-container" style={{ textAlign: 'center' }}>
          <span className="m-section-label">Pricing</span>
          <h1 className="m-section-title" style={{ maxWidth: '600px', margin: '0 auto 16px' }}>
            Simple, transparent pricing
          </h1>
          <p className="m-section-sub" style={{ maxWidth: '520px', margin: '0 auto' }}>
            Start free. Scale as you grow. No hidden fees, no long-term contracts.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="m-section" style={{ paddingTop: '20px' }}>
        <div className="m-container">
          <div className="m-pricing-grid">
            {/* Starter */}
            <div className="m-pricing-card">
              <div className="m-pricing-header">
                <h3 className="m-pricing-name">Starter</h3>
                <p className="m-pricing-desc">For small practices getting started with provider data management</p>
              </div>
              <div className="m-pricing-price">
                <span className="m-pricing-amt">$0</span>
                <span className="m-pricing-period">/month</span>
              </div>
              <ul className="m-pricing-features">
                <li>Up to 10 providers</li>
                <li>NPPES monitoring</li>
                <li>Basic compliance dashboard</li>
                <li>Email alerts</li>
                <li>Community support</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Start Free</Link>
            </div>

            {/* Professional — highlighted */}
            <div className="m-pricing-card m-pricing-featured">
              <div className="m-pricing-badge">Most Popular</div>
              <div className="m-pricing-header">
                <h3 className="m-pricing-name">Professional</h3>
                <p className="m-pricing-desc">For growing medical groups that need compliance automation</p>
              </div>
              <div className="m-pricing-price">
                <span className="m-pricing-amt">$299</span>
                <span className="m-pricing-period">/month</span>
              </div>
              <ul className="m-pricing-features">
                <li>Up to 50 providers</li>
                <li>Full NPPES + state board monitoring</li>
                <li>Compliance tracking (TX, CA, FL, NY, IL)</li>
                <li>Credentialing workflows</li>
                <li>Payer directory monitoring</li>
                <li>Priority support</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta m-pricing-cta-featured">Get Free Trial</Link>
            </div>

            {/* Enterprise */}
            <div className="m-pricing-card">
              <div className="m-pricing-header">
                <h3 className="m-pricing-name">Enterprise</h3>
                <p className="m-pricing-desc">For health systems and networks with complex needs</p>
              </div>
              <div className="m-pricing-price">
                <span className="m-pricing-amt">Custom</span>
              </div>
              <ul className="m-pricing-features">
                <li>Unlimited providers</li>
                <li>All Professional features</li>
                <li>Custom integrations &amp; API access</li>
                <li>FHIR directory API (AB 3030)</li>
                <li>Dedicated account manager</li>
                <li>SLA &amp; enterprise support</li>
              </ul>
              <Link href="/contact" className="m-pricing-cta">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Founders Rate Banner */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-founders-banner">
            <p>
              <strong>Founders Rate:</strong> Early customers lock in 40% off Professional pricing for the life of their account.
              Limited to the first 50 organizations.{' '}
              <Link href="/contact" style={{ color: 'var(--m-gold)', fontWeight: 600 }}>Claim your spot &rarr;</Link>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="m-section" style={{ paddingBottom: '80px' }}>
        <div className="m-container" style={{ maxWidth: '680px' }}>
          <h2 className="m-section-title" style={{ textAlign: 'center', marginBottom: '40px' }}>
            Common questions
          </h2>

          <div className="m-legal-body">
            <h3>Is there a free trial?</h3>
            <p>Yes. All plans include a 14-day free trial with full access to features. No credit card required to start.</p>

            <h3>Can I change plans later?</h3>
            <p>Absolutely. Upgrade or downgrade at any time. Changes take effect at your next billing cycle.</p>

            <h3>What happens when I exceed my provider limit?</h3>
            <p>We&rsquo;ll notify you and help you upgrade to the appropriate plan. Your service won&rsquo;t be interrupted.</p>

            <h3>Do you offer annual billing?</h3>
            <p>Yes. Annual billing saves 20% compared to monthly. Contact us for details.</p>

            <h3>Is my data secure?</h3>
            <p>Yes. All data is encrypted at rest and in transit, stored on U.S.-based servers, and our infrastructure is HIPAA-aligned with SOC 2 Type II certification in progress.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
