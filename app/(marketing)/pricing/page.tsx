'use client';

import { useState } from 'react';
import Link from 'next/link';
import CheckoutModal from './checkout-modal';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="8" cy="8" r="8" fill="#E6F7F2"/>
    <path d="M5 8.2l2 2 4-4" stroke="#1A9E6D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="8" cy="8" r="8" fill="#E8EAED"/>
    <path d="M5 5l6 6M11 5l-6 6" stroke="#9AA3AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type BillingInterval = 'month' | 'year';

interface PricingTier {
  id: string;
  name: string;
  providers: number;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceId: string;
  annualPriceId: string;
  highlighted: boolean;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    providers: 5,
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceId: '',
    annualPriceId: '',
    highlighted: false,
    description: 'Perfect for getting started',
    features: [
      'Up to 5 providers',
      'Weekly payer scans (Medicare + 2 payers)',
      'Weekly mismatch digest email',
      'SB 1188 / HB 149 compliance status',
      '1 PDF report / month',
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'small',
    name: 'Small Practice',
    providers: 15,
    monthlyPrice: 149,
    annualPrice: 1490,
    monthlyPriceId: 'price_1TI8I6Gg3oiiGF7ggGMO0z1i',
    annualPriceId: 'price_1TI8I8Gg3oiiGF7gAmKNYWCV',
    highlighted: false,
    description: 'For growing practices',
    features: [
      'Up to 15 providers',
      'Daily payer scans (UHC, Aetna, Cigna, Humana)',
      'Real-time mismatch alerts',
      'Full compliance scanning + alerts',
      'Confidence scoring + review queue',
      'Unlimited PDF reports',
      'Email support (24h)',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'medium',
    name: 'Medium Practice',
    providers: 25,
    monthlyPrice: 299,
    annualPrice: 2990,
    monthlyPriceId: 'price_1TIH6qGg3oiiGF7gUjKWRfUG',
    annualPriceId: 'price_1TIH6rGg3oiiGF7gC60HdQtT',
    highlighted: true,
    badge: 'Most Popular',
    description: 'Most practices start here',
    features: [
      'Up to 25 providers',
      'Everything in Small Practice, plus:',
      'Credential & license tracking',
      'Team roles (admin, manager, viewer)',
      'Priority email support',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    providers: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceId: '',
    annualPriceId: '',
    highlighted: false,
    badge: 'Custom',
    description: 'For large practices, MSOs, and health systems',
    features: [
      'Unlimited providers + locations',
      'Everything in Medium Practice, plus:',
      'Dedicated account manager + SLA',
      'Custom compliance frameworks',
      'API access (REST + webhooks)',
      'EHR/PM system integrations',
      'White-label reporting',
      'SOC 2 Type II & BAA included',
    ],
    cta: 'Contact Sales',
  },
];

const allFeatures = [
  { name: 'Providers', showInComparison: true },
  { name: 'Weekly payer scans (Medicare + 2)', free: true },
  { name: 'Daily payer scans (UHC, Aetna, Cigna, Humana)', free: false },
  { name: 'Real-time mismatch alerts', free: false },
  { name: 'Full compliance scanning', free: false },
  { name: 'Confidence scoring', free: false },
  { name: 'Weekly mismatch digest', free: true },
  { name: 'PDF reports', free: true, freeCount: '1/mo' },
  { name: 'Unlimited PDF reports', free: false },
  { name: 'SB 1188 / HB 149 compliance status', free: true },
  { name: 'Workflow automation', free: false },
  { name: 'Credential & license tracking', free: false },
  { name: 'Team roles (admin, manager, viewer)', free: false },
  { name: 'Email support', free: true, freeTime: '24h' },
  { name: 'Priority email support', free: false },
  { name: 'API access (REST + webhooks)', free: false },
  { name: 'EHR/PM integrations', free: false },
  { name: 'White-label reporting', free: false },
  { name: 'Dedicated account manager + SLA', free: false },
  { name: '14-day free trial', free: false },
];

const faqs = [
  {
    q: 'How does the free trial work?',
    a: 'All paid plans include a 14-day free trial. Credit card required at signup (you won\'t be charged during the trial). Cancel anytime before the trial ends to avoid charges.',
  },
  {
    q: 'What happens after the trial?',
    a: 'Your subscription automatically converts to the paid plan you selected. You\'ll be billed on your billing date. If you don\'t want to continue, you can cancel anytime from your dashboard.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade, downgrade, or cancel anytime from your dashboard. Changes take effect immediately, and we\'ll prorate your billing.',
  },
  {
    q: 'What counts as a provider?',
    a: 'Each unique NPI counts as one provider. If a provider appears at multiple locations, they still count as one provider.',
  },
  {
    q: 'How are payer directories monitored?',
    a: 'We query FHIR APIs from UnitedHealthcare, Aetna, Cigna, Humana, and BCBS to compare your provider data. Any mismatches are flagged automatically.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use HIPAA-aligned infrastructure with encrypted data at rest and in transit. We never store PHI — only publicly available provider data.',
  },
  {
    q: 'What\'s your cancellation policy?',
    a: 'Cancel anytime from your dashboard. No long-term contracts, no questions asked. Your access ends immediately.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards via Stripe. For practices with 25+ providers, we also offer invoicing.',
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [expandedFaqs, setExpandedFaqs] = useState<Record<number, boolean>>({});

  const handleStartTrial = (tier: PricingTier) => {
    if (tier.id === 'free' || tier.id === 'enterprise') {
      window.location.href = '/contact';
      return;
    }
    setSelectedTier(tier);
    setShowCheckout(true);
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const savingsPercent = Math.round((1 - (pricingTiers[2].annualPrice / 12) / pricingTiers[2].monthlyPrice) * 100);

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
          .comparison-table {
            overflow-x: auto;
          }
          .comparison-table table {
            font-size: 13px;
          }
          .pricing-cards {
            max-width: 100%;
          }
        }
      `}</style>

      {/* Hero */}
      <section style={{
        padding: '80px 24px 40px',
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
            Simple, practice-based pricing
          </h1>
          <p style={{
            fontSize: 18,
            color: '#5A6472',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Start free with up to 5 providers. Upgrade when you're ready. All paid plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div style={{
            marginTop: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}>
            <button
              onClick={() => setBillingInterval('month')}
              style={{
                background: billingInterval === 'month' ? '#0F1E2E' : 'transparent',
                color: billingInterval === 'month' ? '#FFFFFF' : '#5A6472',
                border: '1px solid #E8EAED',
                padding: '10px 20px',
                borderRadius: 24,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              style={{
                background: billingInterval === 'year' ? '#0F1E2E' : 'transparent',
                color: billingInterval === 'year' ? '#FFFFFF' : '#5A6472',
                border: '1px solid #E8EAED',
                padding: '10px 20px',
                borderRadius: 24,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Annual
              {billingInterval === 'year' && (
                <span style={{
                  marginLeft: 8,
                  background: '#D4A017',
                  color: '#0F1E2E',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  Save {savingsPercent}%
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '40px 24px 80px' }}>
        <div className="m-container">
          <div
            className="pricing-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
              maxWidth: 1080,
              margin: '0 auto',
            }}
          >
            {pricingTiers.map((tier) => {
              const price = billingInterval === 'month' ? tier.monthlyPrice : Math.round(tier.annualPrice / 12);
              const displayPrice = billingInterval === 'month' ? tier.monthlyPrice : tier.annualPrice;
              const interval = billingInterval === 'month' ? 'month' : 'year';

              return (
                <div
                  key={tier.id}
                  style={{
                    background: tier.highlighted ? '#0F1E2E' : '#FFFFFF',
                    border: tier.highlighted ? '2px solid #D4A017' : '1px solid #E8EAED',
                    borderRadius: 16,
                    padding: '36px 28px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transform: tier.highlighted ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: tier.highlighted ? '0 12px 40px rgba(15,30,46,0.14)' : 'none',
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
                  }}>
                    {tier.name}
                  </h3>

                  <p style={{
                    fontSize: 14,
                    color: tier.highlighted ? '#D4A017' : '#D4A017',
                    fontWeight: 600,
                    margin: '0 0 20px',
                  }}>
                    {tier.id === 'enterprise' ? 'Unlimited providers' : `Up to ${tier.providers} providers`}
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    {tier.id === 'enterprise' ? (
                      <span style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: '#0F1E2E',
                        lineHeight: 1,
                      }}>
                        Custom
                      </span>
                    ) : tier.monthlyPrice === 0 ? (
                      <span style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                        lineHeight: 1,
                      }}>
                        $0
                      </span>
                    ) : (
                      <>
                        <span style={{
                          fontSize: 48,
                          fontWeight: 800,
                          color: tier.highlighted ? '#FFFFFF' : '#0F1E2E',
                          lineHeight: 1,
                        }}>
                          ${displayPrice}
                        </span>
                        <span style={{
                          fontSize: 14,
                          color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                          marginLeft: 4,
                        }}>
                          /{interval}
                        </span>
                      </>
                    )}
                  </div>

                  {tier.id === 'free' && (
                    <p style={{
                      fontSize: 14,
                      color: '#5A6472',
                      margin: '0 0 20px',
                      fontStyle: 'italic',
                    }}>
                      Forever free — no credit card required
                    </p>
                  )}
                  {tier.id === 'enterprise' && (
                    <p style={{
                      fontSize: 14,
                      color: '#5A6472',
                      margin: '0 0 20px',
                      fontStyle: 'italic',
                    }}>
                      For MSOs, health systems, and 25+ providers
                    </p>
                  )}

                  <p style={{
                    fontSize: 14,
                    color: tier.highlighted ? '#8BA3B8' : '#5A6472',
                    lineHeight: 1.6,
                    margin: '0 0 24px',
                  }}>
                    {tier.description}
                  </p>

                  <button
                    onClick={() => handleStartTrial(tier)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      background: tier.highlighted ? '#D4A017' : '#0F1E2E',
                      color: tier.highlighted ? '#0F1E2E' : '#FFFFFF',
                      padding: '14px 20px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      marginBottom: 24,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.opacity = '1';
                    }}
                  >
                    {tier.cta}
                  </button>

                  <div style={{
                    borderTop: `1px solid ${tier.highlighted ? '#1A3249' : '#E8EAED'}`,
                    paddingTop: 20,
                    flex: 1,
                  }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {tier.features.map((f, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 10,
                            fontSize: 13,
                            color: tier.highlighted ? '#D1D8E0' : '#5A6472',
                            lineHeight: 1.5,
                            marginBottom: 10,
                          }}
                        >
                          {f.includes('Everything in') ? (
                            <span style={{ marginTop: 2, color: tier.highlighted ? '#D4A017' : '#D4A017' }}>→</span>
                          ) : (
                            <CheckIcon />
                          )}
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 25+ Providers CTA */}
          <div style={{
            marginTop: 40,
            padding: 24,
            background: '#F4F5F7',
            borderRadius: 16,
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: 16,
              color: '#0F1E2E',
              margin: 0,
            }}>
              Need more than 25 providers?{' '}
              <Link
                href="/contact"
                style={{
                  color: '#D4A017',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Contact us for custom pricing
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section style={{
        padding: '60px 24px',
        background: '#F4F5F7',
      }}>
        <div className="m-container" style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#5A6472',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 24,
          }}>
            Trusted by Texas healthcare practices
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
          }}>
            <div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#0F1E2E',
                marginBottom: 8,
              }}>
                4
              </div>
              <p style={{
                fontSize: 13,
                color: '#5A6472',
                margin: 0,
              }}>
                Major Payer APIs
              </p>
            </div>
            <div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#0F1E2E',
                marginBottom: 8,
              }}>
                Real-time
              </div>
              <p style={{
                fontSize: 13,
                color: '#5A6472',
                margin: 0,
              }}>
                Monitoring
              </p>
            </div>
            <div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#0F1E2E',
                marginBottom: 8,
              }}>
                HIPAA
              </div>
              <p style={{
                fontSize: 13,
                color: '#5A6472',
                margin: 0,
              }}>
                Aligned Infrastructure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section style={{ padding: '80px 24px' }}>
        <div className="m-container">
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#0F1E2E',
            textAlign: 'center',
            margin: '0 0 48px',
          }}>
            Complete feature comparison
          </h2>

          <div className="comparison-table" style={{ overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left',
                    padding: '16px 12px',
                    borderBottom: '2px solid #E8EAED',
                    fontWeight: 700,
                    color: '#0F1E2E',
                  }}>
                    Feature
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    borderBottom: '2px solid #E8EAED',
                    fontWeight: 700,
                    color: '#0F1E2E',
                  }}>
                    Free
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    borderBottom: '2px solid #E8EAED',
                    fontWeight: 700,
                    color: '#0F1E2E',
                  }}>
                    Small
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    borderBottom: '2px solid #E8EAED',
                    fontWeight: 700,
                    color: '#0F1E2E',
                    background: '#FDF6E3',
                  }}>
                    Medium
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    borderBottom: '2px solid #E8EAED',
                    fontWeight: 700,
                    color: '#0F1E2E',
                  }}>
                    Large
                  </th>
                </tr>
              </thead>
              <tbody>
                {allFeatures.map((feature, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid #E8EAED',
                  }}>
                    <td style={{
                      padding: '16px 12px',
                      fontWeight: feature.name.includes('Provider') ? 700 : 500,
                      color: '#0F1E2E',
                    }}>
                      {feature.name}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '16px 12px',
                      color: '#5A6472',
                    }}>
                      {feature.name === 'Providers' ? '5' : (
                        feature.free ? (
                          feature.freeCount ? (
                            <span>{feature.freeCount}</span>
                          ) : feature.freeTime ? (
                            <span>{feature.freeTime}</span>
                          ) : (
                            <CheckIcon />
                          )
                        ) : (
                          <XIcon />
                        )
                      )}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '16px 12px',
                      color: '#5A6472',
                    }}>
                      {feature.name === 'Providers' ? '15' : <CheckIcon />}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '16px 12px',
                      color: '#5A6472',
                      background: '#FDF6E3',
                    }}>
                      {feature.name === 'Providers' ? '25' : <CheckIcon />}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '16px 12px',
                      color: '#5A6472',
                    }}>
                      {feature.name === 'Providers' ? 'Unlimited' : <CheckIcon />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px' }}>
        <div className="m-container">
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#0F1E2E',
            textAlign: 'center',
            margin: '0 0 48px',
          }}>
            Frequently asked questions
          </h2>
          <div style={{
            maxWidth: 680,
            margin: '0 auto',
          }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                borderBottom: '1px solid #E8EAED',
                padding: '24px 0',
              }}>
                <button
                  onClick={() => toggleFaq(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    padding: 0,
                  }}
                >
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0F1E2E',
                    margin: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    {faq.q}
                    <span style={{
                      fontSize: 20,
                      color: '#D4A017',
                      transition: 'transform 0.2s',
                      transform: expandedFaqs[i] ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                      ▼
                    </span>
                  </h3>
                </button>
                {expandedFaqs[i] && (
                  <p style={{
                    fontSize: 14,
                    color: '#5A6472',
                    lineHeight: 1.7,
                    margin: '12px 0 0',
                  }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '60px 24px',
        background: '#0F1E2E',
        textAlign: 'center',
      }}>
        <div className="m-container">
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px' }}>
            Start monitoring your provider data today
          </h2>
          <p style={{ fontSize: 16, color: '#8BA3B8', margin: '0 0 24px' }}>
            All paid plans include a 14-day free trial. No credit card required for Free tier.
          </p>
          <button
            onClick={() => {
              setSelectedTier(pricingTiers[2]); // Default to Medium
              setShowCheckout(true);
            }}
            style={{
              display: 'inline-block',
              background: '#D4A017',
              color: '#0F1E2E',
              padding: '14px 32px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckout && selectedTier && selectedTier.id !== 'free' && (
        <CheckoutModal
          tier={selectedTier}
          billingInterval={billingInterval}
          onClose={() => {
            setShowCheckout(false);
            setSelectedTier(null);
          }}
        />
      )}
    </>
  );
}
