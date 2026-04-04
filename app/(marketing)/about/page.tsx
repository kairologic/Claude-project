import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | KairoLogic',
  description:
    'KairoLogic builds provider data intelligence tools for healthcare organizations. Learn about our mission to eliminate provider data errors across the U.S. healthcare system.',
};

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

export default function AboutPage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="m-section" style={{ paddingBottom: 0 }}>
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header" style={{ marginBottom: 0 }}>
            <span className="m-tag">About Us</span>
            <h1 className="m-page-title">
              Making provider data
              <br />
              <em>actually reliable</em>
            </h1>
            <p className="m-page-subtitle">
              KairoLogic was founded on a simple observation: provider data across the U.S.
              healthcare system is broken, and it&apos;s costing practices millions. We&apos;re
              building the intelligence layer to fix it.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ MISSION ═══ */}
      <section className="m-section">
        <div className="m-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="m-tag m-tag-green">Our Mission</span>
              <h2
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: 'clamp(26px, 3vw, 36px)',
                  fontWeight: 400,
                  color: 'var(--m-navy)',
                  margin: '12px 0 16px',
                  letterSpacing: '-0.02em',
                }}
              >
                Every provider record should tell the truth
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--m-gray-600)',
                  lineHeight: 1.7,
                  marginBottom: '16px',
                }}
              >
                Across the healthcare ecosystem, provider directories are riddled with errors. Wrong
                addresses, expired licenses, stale NPI data, mismatched payer records. These
                inaccuracies create real harm — patients can&apos;t find in-network doctors, claims
                get denied, credentialing stalls, and practices lose revenue they never even know
                about.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--m-gray-600)', lineHeight: 1.7 }}>
                KairoLogic monitors provider data continuously across CMS NPPES, state medical
                boards, and payer directories. When something drifts, we surface it instantly — so
                your team can fix it before it becomes a compliance issue or a lost dollar.
              </p>
            </div>
            <div
              style={{
                background: 'var(--m-gray-50)',
                borderRadius: '16px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
              }}
            >
              {[
                { num: '1.8M+', label: 'U.S. provider records indexed' },
                { num: '57K+', label: 'Practice websites monitored' },
                { num: '24/7', label: 'Continuous data monitoring' },
                { num: '6', label: 'Major payer directories synced' },
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                  <span
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: '32px',
                      fontWeight: 400,
                      color: 'var(--m-navy)',
                      minWidth: '90px',
                    }}
                  >
                    {stat.num}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--m-gray-600)' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT WE DO ═══ */}
      <section className="m-section" style={{ background: 'var(--m-navy)' }}>
        <div className="m-container">
          <div className="m-section-header" style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 400,
                color: 'var(--m-white)',
                letterSpacing: '-0.02em',
                margin: '0 0 16px',
              }}
            >
              The provider data intelligence platform
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '600px',
                margin: '0 auto 48px',
                lineHeight: 1.7,
              }}
            >
              One dashboard that connects the dots between NPPES, state boards, payer directories,
              and your internal records — so nothing slips through the cracks.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}
          >
            {[
              {
                icon: '🔍',
                title: 'Provider Monitoring',
                desc: 'Continuously cross-reference your roster against NPPES, state boards, and payer directories. Get alerted the moment data drifts.',
              },
              {
                icon: '🏛️',
                title: 'State Compliance Tracking',
                desc: 'Every state has different rules for provider data. We track the regulatory landscape so you stay compliant — no matter where you operate.',
              },
              {
                icon: '📋',
                title: 'Credentialing Workflows',
                desc: 'Automate the credentialing pipeline from application to approval. Track status, manage renewals, and reduce manual follow-ups.',
              },
              {
                icon: '📡',
                title: 'Payer Directory Monitoring',
                desc: 'Monitor how payers list your providers. Catch incorrect addresses, phone numbers, and specialties before patients or regulators do.',
              },
              {
                icon: '📊',
                title: 'Data Accuracy Scoring',
                desc: 'Every provider gets a real-time accuracy score based on cross-source validation. Prioritize fixes by impact.',
              },
              {
                icon: '⚡',
                title: 'Drift Detection & Alerts',
                desc: "When a provider's address changes, a license expires, or a taxonomy code is wrong — know about it in hours, not months.",
              },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--m-navy-mid)',
                  borderRadius: '14px',
                  padding: '32px',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>{card.icon}</div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--m-white)',
                    marginBottom: '10px',
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY KAIROLOGIC ═══ */}
      <section className="m-section">
        <div className="m-container" style={{ maxWidth: '780px' }}>
          <div className="m-section-header" style={{ textAlign: 'center' }}>
            <span className="m-tag">Why KairoLogic</span>
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 400,
                color: 'var(--m-navy)',
                letterSpacing: '-0.02em',
                margin: '12px 0 16px',
              }}
            >
              Built for healthcare teams that <em>can&apos;t afford</em> data errors
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--m-gray-600)', lineHeight: 1.7 }}>
              Provider data errors aren&apos;t just an inconvenience — they lead to denied claims,
              compliance penalties, credentialing delays, and patients who can&apos;t find their
              doctors. We built KairoLogic because spreadsheets and manual audits can&apos;t keep up
              with the scale of modern healthcare operations.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px' }}>
            {[
              {
                title: 'For Medical Groups & Practices',
                desc: 'Monitor your provider roster across every source. Catch data mismatches before they cause claim denials or compliance issues.',
              },
              {
                title: 'For CVOs & Credentialing Organizations',
                desc: 'Automate primary source verification. Track credentialing workflows from initial application through approval and renewal.',
              },
              {
                title: 'For Health Systems & Networks',
                desc: 'Enterprise-scale provider data monitoring across hundreds of locations. Centralized compliance tracking, decentralized operations.',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '28px 32px',
                  border: '1px solid var(--m-gray-200)',
                  borderRadius: '14px',
                  transition: 'border-color 0.15s',
                }}
              >
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--m-navy)',
                    marginBottom: '8px',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--m-gray-600)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BASED IN AUSTIN ═══ */}
      <section className="m-section" style={{ background: 'var(--m-gray-50)' }}>
        <div className="m-container" style={{ maxWidth: '680px', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 'clamp(24px, 2.5vw, 32px)',
              fontWeight: 400,
              color: 'var(--m-navy)',
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}
          >
            Based in Austin, Texas
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--m-gray-600)',
              lineHeight: 1.7,
              marginBottom: '12px',
            }}
          >
            KairoLogic is a healthcare technology company headquartered in Austin, TX. We serve
            medical groups, credentialing organizations, and health systems across the United
            States.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--m-gray-400)', marginBottom: '32px' }}>
            Questions? We&apos;d love to hear from you.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/contact" className="m-btn-primary m-gold">
              Get in Touch
              <ArrowIcon />
            </Link>
            <a href="mailto:info@kairologic.net" className="m-btn-outline">
              info@kairologic.net
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
