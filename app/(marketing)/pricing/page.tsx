import Link from 'next/link';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="8" cy="8" r="8" fill="#E6F7F2"/>
    <path d="M5 8.2l2 2 4-4" stroke="#1A9E6D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const tiers = [
  {
    name: 'Monitor',
    tagline: 'See the problem',
    price: 49,
    unit: 'per provider / month',
    description: 'Continuous monitoring of provider data across NPPES, payer directories, and state boards. Know the moment something drifts.',
    features: [
      'NPPES data monitoring (weekly)',
      'Payer directory drift detection (5 major payers)',
      'State medical board license tracking',
      'Mismatch alerts via email',
      'Dashboard with provider-level detail',
      'Up to 25 providers',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/contact',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Protect',
    tagline: 'Fix the problem',
    price: 99,
    unit: 'per provider / month',
    description: 'Everything in Monitor, plus guided correction workflows that walk your team through fixing mismatches — with auto-confirmation when done.',
    features: [
      'Everything in Monitor',
      'NPPES correction workflows (guided step-by-step)',
      'Payer directory update packets',
      'Auto-confirmation when NPPES reflects changes',
      'Overdue escalation alerts (14d + 28d)',
      'Correction audit trail',
      'Up to 100 providers',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/contact',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Command',
    tagline: 'Own the problem',
    price: null,
    unit: 'custom pricing',
    description: 'Full-service provider data operations for health systems and CVOs. Includes onboarding, departure, compliance, and credentialing workflows.',
    features: [
      'Everything in Protect',
      'Provider onboarding workflows (credentialing checklists)',
      'Provider departure tracking (directory cleanup)',
      'State compliance workflows (SB 1188, HB 149, AB 3030)',
      'Bulk batch operations (all providers × all payers)',
      'Custom email notification rules',
      'Dedicated success manager',
      'Unlimited providers',
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
    a: 'Every plan includes a 14-day free trial with full access. No credit card required. We\'ll run a scan on your providers within 24 hours so you can see real results immediately.',
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
    a: 'We query payer FHIR APIs (UnitedHealthcare, Aetna, Cigna, Humana, and BCBS) to compare your provider data against what each payer has listed. Any mismatches are flagged immediately.',
  },
  {
    q: 'Do you support Texas compliance requirements?',
    a: 'Yes. KairoLogic monitors SB 1188, HB 149, and AB 3030 (California) compliance. Our Protect and Command plans include remediation workflows for each regulation.',
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
      <section style={{
        padding: '80px 0 40px',
        textAlign: 'center',
      }}>
        <div className="m-container">
          <p style={{
            color: '#D4A017',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}>Pricing</p>
          <h1 style={{
            fontSize: 44,
            fontWeight: 800,
            color: '#0F1E2E',
            lineHeight: 1.15,
            margin: '0 0 16px',
          }}>
            Simple, provider-based pricing
          </h1>
          <p style={{
            fontSize: 18,
            color: '#5A6472',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Start with monitoring. Add correction workflows when you&apos;re ready.
            Every plan includes a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '20px 0 80px' }}>
        <div className="m-container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            maxWidth: 1080,
            margin: '0 auto',
          }}>
            {tiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.highlighted ? '#0F1E2E' : '#FFFFFF',
                  border: tier.highlighted ? '2px solid #D4A017' : '1px solid #E8EAED',
                  borderRadius: 16,
                  padding: '36px 28px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {tier.badge && (
                  <span style={{
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
                  }}>
                    {tier.badge}
                  </span>
                )}

                <h3 style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                  margin: '0 0 4px',
                }}>{tier.name}</h3>
                <p style={{
                  fontSize: 13,
                  color: tier.highlighted ? '#D4A017' : '#D4A017',
                  fontWeight: 600,
                  margin: '0 0 20px',
                }}>{tier.tagline}</p>

                <div style={{ marginBottom: 16 }}>
                  {tier.price !== null ? (
                    <>
                      <span style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                        lineHeight: 1,
                      }}>${tier.price}</span>
                      <span style={{
                        fontSize: 14,
                        color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                        marginLeft: 4,
                      }}>/ {tier.unit}</span>
                    </>
                  ) : (
                    <span style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                    }}>Custom</span>
                  )}
                </div>

                <p style={{
                  fontSize: 14,
                  color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                  minHeight: 66,
                }}>{tier.description}</p>

                <Link
                  href={tier.ctaHref}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: tier.highlighted ? '#D4A017' : '#0F1E2E',
                    color: tier.highlighted ? '#0F1E2E' : '#FFFFFF',
                    padding: '14px 20px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                    marginBottom: 24,
                  }}
                >
                  {tier.cta}
                </Link>

                <div style={{
                  borderTop: `1px solid ${tier.highlighted ? '#1A3249' : '#E8EAED'}`,
                  paddingTop: 20,
                  flex: 1,
                }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tier.features.map((f, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 13,
                        color: tier.highlighted ? '#D1D8E0' : '#5A6472',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}>
                        <CheckIcon />
                        <span>{f}</span>
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
      <section style={{
        padding: '48px 0',
        background: '#F4F5F7',
      }}>
        <div className="m-container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0F1E2E', margin: '0 0 8px' }}>
            Volume discounts available
          </h2>
          <p style={{ fontSize: 16, color: '#5A6472', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Managing 50+ providers? Contact us for volume pricing.
            Health systems and CVOs typically save 30-40% per provider.
          </p>
          <Link href="/contact" style={{
            display: 'inline-block',
            background: '#0F1E2E',
            color: '#FFFFFF',
            padding: '12px 28px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}>
            Get a Custom Quote
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 0' }}>
        <div className="m-container">
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#0F1E2E',
            textAlign: 'center',
            margin: '0 0 48px',
          }}>Frequently asked questions</h2>
          <div style={{
            maxWidth: 680,
            margin: '0 auto',
          }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                borderBottom: '1px solid #E8EAED',
                padding: '24px 0',
              }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0F1E2E',
                  margin: '0 0 8px',
                }}>{faq.q}</h3>
                <p style={{
                  fontSize: 14,
                  color: '#5A6472',
                  lineHeight: 1.7,
                  margin: 0,
                }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '60px 0',
        background: '#0F1E2E',
        textAlign: 'center',
      }}>
        <div className="m-container">
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px' }}>
            Start your 14-day free trial
          </h2>
          <p style={{ fontSize: 16, color: '#8BA3B8', margin: '0 0 24px' }}>
            No credit card required. See your provider data within 24 hours.
          </p>
          <Link href="/contact" style={{
            display: 'inline-block',
            background: '#D4A017',
            color: '#0F1E2E',
            padding: '14px 32px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
          }}>
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
