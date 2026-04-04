import Link from 'next/link';

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ flexShrink: 0, marginTop: 2 }}
  >
    <circle cx="8" cy="8" r="8" fill="#E6F7F2" />
    <path
      d="M5 8.2l2 2 4-4"
      stroke="#1A9E6D"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ flexShrink: 0, marginTop: 2 }}
  >
    <circle cx="8" cy="8" r="8" fill="#F4F5F7" />
    <path d="M5 8h6" stroke="#CCC" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const tiers = [
  {
    name: 'Free',
    tagline: 'Try it out',
    price: 0,
    unit: 'forever',
    description: 'Monitor up to 5 providers with weekly scans. See the value before you commit.',
    features: [
      { text: 'Up to 5 providers', included: true },
      { text: 'Weekly payer directory scans', included: true },
      { text: '3 major payers (UHC, Aetna, Cigna)', included: true },
      { text: 'Mismatch alerts (weekly digest)', included: true },
      { text: 'Dashboard with provider-level detail', included: true },
      { text: '1 PDF report per month', included: true },
      { text: 'Correction workflows', included: false },
      { text: 'Compliance scanning', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Starter',
    tagline: 'For small practices',
    price: 149,
    unit: 'per month',
    annualPrice: 1490,
    description:
      'Daily monitoring across all 5 major payers with real-time alerts and workflow automation. Up to 10 providers.',
    features: [
      { text: 'Up to 10 providers', included: true },
      { text: 'Daily payer directory scans', included: true },
      { text: 'All 5 payers (+ BCBS TX & Humana)', included: true },
      { text: 'Real-time mismatch alerts', included: true },
      { text: 'Confidence scoring & review queue', included: true },
      { text: 'Workflow automation', included: true },
      { text: 'Unlimited PDF reports', included: true },
      { text: 'Email support', included: true },
    ],
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/signup?plan=starter',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Professional',
    tagline: 'For growing practices',
    price: 249,
    unit: 'per month',
    annualPrice: 2490,
    description:
      'Everything in Starter plus correction workflows, compliance scanning, team access, and priority support. Up to 25 providers.',
    features: [
      { text: 'Up to 25 providers', included: true },
      { text: 'Everything in Starter', included: true },
      { text: 'NPPES correction workflows', included: true },
      { text: 'Payer directory update packets', included: true },
      { text: 'Compliance scanning (SB 1188, HB 149)', included: true },
      { text: 'Overdue escalation alerts', included: true },
      { text: 'Team access (up to 5 seats)', included: true },
      { text: 'Priority support (4h response)', included: true },
    ],
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/signup?plan=professional',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    tagline: 'For groups & MSOs',
    price: null,
    unit: 'custom pricing',
    description:
      'Unlimited providers, dedicated support, custom integrations, and SLA. For health systems, MSOs, and CVOs.',
    features: [
      { text: 'Unlimited providers', included: true },
      { text: 'Everything in Professional', included: true },
      { text: 'Unlimited team seats', included: true },
      { text: 'Custom compliance rules', included: true },
      { text: 'Bulk batch operations', included: true },
      { text: 'Dedicated success manager', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA & BAA available', included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact',
    highlighted: false,
    badge: 'Enterprise',
  },
];

const faqs = [
  {
    q: 'How does the free trial work?',
    a: 'Starter and Professional plans include a 14-day free trial with full access. No credit card required if you sign up through "Get Free Trial." If you sign up from the pricing page, you enter your card upfront and are automatically billed after 14 days.',
  },
  {
    q: 'What happens after the free trial?',
    a: "If you signed up without a credit card, you'll be downgraded to the Free tier (5 providers, weekly scans). You can upgrade anytime from your dashboard. If you signed up with a card, your selected plan starts billing automatically.",
  },
  {
    q: 'What counts as a "provider"?',
    a: 'Each unique NPI counts as one provider. If a provider appears at multiple practice locations, they still count as one provider.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the next billing cycle.',
  },
  {
    q: 'How are payer directories monitored?',
    a: 'We query payer FHIR APIs (UnitedHealthcare, Aetna, Cigna, Humana, and BCBS TX) to compare your provider data against what each payer has listed. Any mismatches are flagged immediately.',
  },
  {
    q: 'Is there a discount for annual billing?',
    a: 'Yes. Annual plans save you 2 months compared to monthly billing. Starter is $1,490/year ($124/mo) and Professional is $2,490/year ($208/mo).',
  },
  {
    q: 'Do you support Texas compliance requirements?',
    a: 'Yes. KairoLogic monitors SB 1188 and HB 149 compliance. Professional and Enterprise plans include remediation workflows.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use HIPAA-aligned infrastructure with encrypted data at rest and in transit. SOC 2 Type II certification is in progress. We never store PHI — only publicly available provider data.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 0 40px', textAlign: 'center' }}>
        <div className="m-container">
          <p
            style={{
              color: '#D4A017',
              fontWeight: 600,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            Pricing
          </p>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: '#0F1E2E',
              lineHeight: 1.15,
              margin: '0 0 16px',
            }}
          >
            Simple, flat pricing
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#5A6472',
              maxWidth: 560,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            No per-provider math. Pick the plan that fits your practice size. Every paid plan
            includes a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '20px 0 80px' }}>
        <div className="m-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              maxWidth: 1120,
              margin: '0 auto',
            }}
          >
            {tiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.highlighted ? '#0F1E2E' : '#FFFFFF',
                  border: tier.highlighted ? '2px solid #D4A017' : '1px solid #E8EAED',
                  borderRadius: 16,
                  padding: '36px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {tier.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#D4A017',
                      color: '#0F1E2E',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 20,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tier.badge}
                  </span>
                )}

                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                    margin: '0 0 4px',
                  }}
                >
                  {tier.name}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: '#D4A017',
                    fontWeight: 600,
                    margin: '0 0 20px',
                  }}
                >
                  {tier.tagline}
                </p>

                <div style={{ marginBottom: 16 }}>
                  {tier.price !== null ? (
                    <>
                      <span
                        style={{
                          fontSize: 44,
                          fontWeight: 800,
                          color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                          lineHeight: 1,
                        }}
                      >
                        {tier.price === 0 ? 'Free' : `$${tier.price}`}
                      </span>
                      {tier.price > 0 && (
                        <span
                          style={{
                            fontSize: 14,
                            color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                            marginLeft: 4,
                          }}
                        >
                          / {tier.unit}
                        </span>
                      )}
                      {'annualPrice' in tier && tier.annualPrice && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#1A9E6D',
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          or ${(tier.annualPrice / 12).toFixed(0)}/mo billed annually (save 17%)
                        </div>
                      )}
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: '#0F1E2E',
                      }}
                    >
                      Custom
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                    lineHeight: 1.6,
                    margin: '0 0 24px',
                    minHeight: 60,
                  }}
                >
                  {tier.description}
                </p>

                <Link
                  href={tier.ctaHref}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: tier.highlighted
                      ? '#D4A017'
                      : tier.price === 0
                        ? '#FFFFFF'
                        : '#0F1E2E',
                    color: tier.highlighted ? '#0F1E2E' : tier.price === 0 ? '#0F1E2E' : '#FFFFFF',
                    border: tier.price === 0 ? '1px solid #E8EAED' : 'none',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                    marginBottom: 24,
                  }}
                >
                  {tier.cta}
                </Link>

                <div
                  style={{
                    borderTop: `1px solid ${tier.highlighted ? '#1A3249' : '#E8EAED'}`,
                    paddingTop: 20,
                    flex: 1,
                  }}
                >
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tier.features.map((f, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          fontSize: 13,
                          color: f.included
                            ? tier.highlighted
                              ? '#D1D8E0'
                              : '#5A6472'
                            : tier.highlighted
                              ? '#3A4A5A'
                              : '#CCC',
                          lineHeight: 1.5,
                          marginBottom: 10,
                        }}
                      >
                        {f.included ? <CheckIcon /> : <DashIcon />}
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volume Discount */}
      <section style={{ padding: '48px 0', background: '#F4F5F7' }}>
        <div className="m-container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0F1E2E', margin: '0 0 8px' }}>
            Need more than 25 providers?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#5A6472',
              maxWidth: 500,
              margin: '0 auto 20px',
              lineHeight: 1.6,
            }}
          >
            Health systems, MSOs, and CVOs get custom pricing with dedicated support and SLA.
          </p>
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              background: '#0F1E2E',
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Talk to Sales
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 0' }}>
        <div className="m-container">
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#0F1E2E',
              textAlign: 'center',
              margin: '0 0 48px',
            }}
          >
            Frequently asked questions
          </h2>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #E8EAED', padding: '24px 0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F1E2E', margin: '0 0 8px' }}>
                  {faq.q}
                </h3>
                <p style={{ fontSize: 14, color: '#5A6472', lineHeight: 1.7, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 0', background: '#0F1E2E', textAlign: 'center' }}>
        <div className="m-container">
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px' }}>
            Start your 14-day free trial
          </h2>
          <p style={{ fontSize: 16, color: '#8BA3B8', margin: '0 0 24px' }}>
            No credit card required. See your provider data within 24 hours.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#D4A017',
              color: '#0F1E2E',
              padding: '14px 32px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
