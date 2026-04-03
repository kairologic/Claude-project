'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ── Page types based on query param ─────────────────────────────────────────
type ContactType = 'trial' | 'free' | 'enterprise';

function ContactPageContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type');
  const contactType: ContactType =
    rawType === 'free' ? 'free' :
    rawType === 'enterprise' ? 'enterprise' :
    'trial';

  // ── Shared form state ────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    practiceName: '',
    npi: '',
    // Enterprise-only fields
    providerCount: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Free tier signup ─────────────────────────────────────────────────────
  const handleFreeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/trial/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          practiceName: formData.practiceName,
          npi: formData.npi,
          tier: 'free',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create account');
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  // ── Paid trial signup (existing flow) ────────────────────────────────────
  const handleTrialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/trial/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          practiceName: formData.practiceName,
          npi: formData.npi,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create trial');
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  // ── Enterprise inquiry ───────────────────────────────────────────────────
  const handleEnterpriseInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/contact/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          practiceName: formData.practiceName,
          providerCount: formData.providerCount,
          message: formData.message,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send inquiry');
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  // ── Success states ───────────────────────────────────────────────────────
  if (submitted) {
    if (contactType === 'enterprise') {
      return (
        <section className="m-trial-page">
          <div className="m-trial-success">
            <div className="m-trial-success-icon">&#10003;</div>
            <h2>We&apos;ll be in touch!</h2>
            <p>
              Thanks for your interest. Our team will reach out to{' '}
              <strong>{formData.email}</strong> within 1 business day to discuss
              your organization&apos;s needs.
            </p>
            <p className="m-trial-success-note">
              In the meantime, feel free to explore our platform overview or
              check out our compliance resources.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/platform" className="m-btn-primary m-gold" style={{ display: 'inline-flex' }}>
                Explore Platform
              </Link>
              <Link href="/resources" className="m-btn-outline" style={{ display: 'inline-flex' }}>
                View Resources
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (contactType === 'free') {
      return (
        <section className="m-trial-page">
          <div className="m-trial-success">
            <div className="m-trial-success-icon">&#10003;</div>
            <h2>Welcome to KairoLogic!</h2>
            <p>
              Check your inbox at{' '}
              <strong>{formData.email}</strong> — we&apos;ve sent you a link to access your dashboard.
            </p>
            <p className="m-trial-success-note">
              Your free plan includes monitoring for up to 5 providers with weekly payer scans,
              compliance status tracking, and 1 PDF report per month. We&apos;re running your first
              provider data scan now, so you&apos;ll see results within a few minutes of logging in.
            </p>
            <p className="m-trial-success-note" style={{ marginTop: '8px' }}>
              Need more providers or daily scans? You can upgrade anytime from your dashboard.
            </p>
            <Link href="/" className="m-btn-primary m-gold" style={{ marginTop: '24px', display: 'inline-flex' }}>
              Back to Homepage
            </Link>
          </div>
        </section>
      );
    }

    // Default: trial signup success
    return (
      <section className="m-trial-page">
        <div className="m-trial-success">
          <div className="m-trial-success-icon">&#10003;</div>
          <h2>You&apos;re in!</h2>
          <p>
            Check your inbox at{' '}
            <strong>{formData.email}</strong> — we&apos;ve sent you a link to access your dashboard.
          </p>
          <p className="m-trial-success-note">
            Your 14-day free trial includes full access to all features — compliance monitoring,
            credentialing workflows, and payer directory tracking. We&apos;re running your first
            provider data scan now, so you&apos;ll see results within a few minutes of logging in.
          </p>
          <p className="m-trial-success-note" style={{ marginTop: '8px' }}>
            After 14 days, your dashboard switches to read-only mode for 7 additional days.
          </p>
          <Link href="/" className="m-btn-primary m-gold" style={{ marginTop: '24px', display: 'inline-flex' }}>
            Back to Homepage
          </Link>
        </div>
      </section>
    );
  }

  // ── Page config per type ─────────────────────────────────────────────────
  const pageConfig = {
    free: {
      headline: <>Free provider monitoring<br /><em>for your practice.</em></>,
      subtitle: 'Get started with KairoLogic — monitor up to 5 providers with weekly payer scans, compliance tracking, and mismatch alerts. Free forever.',
      formTitle: 'Create your free account',
      formSubtitle: 'No credit card required. No trial period. Free forever.',
      submitLabel: 'Create Free Account',
      loadingLabel: 'Creating your account...',
      onSubmit: handleFreeSignup,
      showNpi: true,
      showProviderCount: false,
      showMessage: false,
      trustItems: ['Free forever — no credit card', 'HIPAA-aligned infrastructure', 'Upgrade anytime'],
      features: [
        'Monitor up to 5 providers across payer directories',
        'Weekly scans for Medicare + 2 payers',
        'SB 1188 / HB 149 compliance status tracking',
        'Weekly mismatch digest emails',
      ],
    },
    trial: {
      headline: <>Provider data intelligence<br /><em>for your practice.</em></>,
      subtitle: 'Join healthcare organizations using KairoLogic to monitor provider data integrity, track compliance, and automate credentialing workflows.',
      formTitle: '14-day free trial',
      formSubtitle: 'Full platform access. Read-only for 7 more days after.',
      submitLabel: 'Get Free Trial',
      loadingLabel: 'Setting up your trial...',
      onSubmit: handleTrialSignup,
      showNpi: true,
      showProviderCount: false,
      showMessage: false,
      trustItems: ['No credit card required', 'HIPAA-aligned infrastructure', 'Cancel anytime'],
      features: [
        'Monitor your entire provider roster in real time',
        'Catch address drift, credential gaps, and compliance issues',
        'Track payer directory listings across UHC, Aetna, Cigna, and more',
        'Automate credentialing from assessment to enrollment',
      ],
    },
    enterprise: {
      headline: <>Enterprise-grade<br /><em>compliance at scale.</em></>,
      subtitle: 'For large practices, MSOs, and health systems managing 25+ providers. Get a dedicated account manager, custom compliance frameworks, API access, and more.',
      formTitle: 'Talk to our team',
      formSubtitle: 'Tell us about your organization and we\'ll reach out within 1 business day.',
      submitLabel: 'Request a Consultation',
      loadingLabel: 'Sending your inquiry...',
      onSubmit: handleEnterpriseInquiry,
      showNpi: false,
      showProviderCount: true,
      showMessage: true,
      trustItems: ['Dedicated account manager', 'SOC 2 Type II & BAA', 'Custom SLA'],
      features: [
        'Unlimited providers and locations',
        'Custom compliance frameworks beyond SB 1188 / HB 149',
        'API access with REST and webhooks for system integration',
        'EHR/PM system integrations and white-label reporting',
      ],
    },
  };

  const config = pageConfig[contactType];

  return (
    <section className="m-trial-page">
      <div className="m-trial-layout">
        {/* Left Column — Value prop content */}
        <div className="m-trial-content">
          <h1>{config.headline}</h1>
          <p className="m-trial-subtitle">{config.subtitle}</p>

          <div className="m-trial-features">
            {config.features.map((feature, idx) => (
              <div key={idx} className="m-trial-feature">
                <span className="m-trial-feature-check">&#10003;</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {contactType !== 'enterprise' && (
            <div className="m-trial-quote">
              <div className="m-trial-quote-text">
                &ldquo;KairoLogic caught an address mismatch that had been failing PECOS verification for three months. Fixed in 24 hours.&rdquo;
              </div>
              <div className="m-trial-quote-author">
                <div className="m-trial-quote-avatar">MR</div>
                <div>
                  <div className="m-trial-quote-name">Michael Rodriguez, CVO</div>
                  <div className="m-trial-quote-role">North Texas Regional Health Network</div>
                </div>
              </div>
            </div>
          )}

          {contactType === 'enterprise' && (
            <div className="m-trial-quote">
              <div className="m-trial-quote-text">
                &ldquo;Managing compliance across 40+ providers used to take our team days. KairoLogic gives us real-time visibility into every directory listing.&rdquo;
              </div>
              <div className="m-trial-quote-author">
                <div className="m-trial-quote-avatar">SL</div>
                <div>
                  <div className="m-trial-quote-name">Sarah Lennox, VP Operations</div>
                  <div className="m-trial-quote-role">Southwest Health Partners MSO</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Form */}
        <div className="m-trial-form-wrap">
          <div className="m-trial-form-card">
            <div className="m-trial-form-header">
              <h2>{config.formTitle}</h2>
              <p>{config.formSubtitle}</p>
            </div>

            <form onSubmit={config.onSubmit} className="m-trial-form">
              <div className="m-form-row">
                <div className="m-form-group">
                  <label>First name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Jane"
                  />
                </div>
                <div className="m-form-group">
                  <label>Last name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: Smith"
                  />
                </div>
              </div>

              <div className="m-form-group">
                <label>Email address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={contactType === 'enterprise' ? 'Ex: jane@healthsystem.org' : 'Ex: jane@practice.com'}
                />
              </div>

              <div className="m-form-group">
                <label>{contactType === 'enterprise' ? 'Organization name *' : 'Practice name *'}</label>
                <input
                  type="text"
                  required
                  value={formData.practiceName}
                  onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                  placeholder={contactType === 'enterprise' ? 'Ex: Southwest Health Partners' : 'Ex: Austin Regional Medical Group'}
                />
              </div>

              {config.showNpi && (
                <div className="m-form-group">
                  <label>NPI *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{10}"
                    title="NPI must be a 10-digit number"
                    value={formData.npi}
                    onChange={(e) => setFormData({ ...formData, npi: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="Ex: 1234567890"
                  />
                  <span className="m-form-hint">10-digit National Provider Identifier</span>
                </div>
              )}

              {config.showProviderCount && (
                <div className="m-form-group">
                  <label>Number of providers *</label>
                  <select
                    required
                    value={formData.providerCount}
                    onChange={(e) => setFormData({ ...formData, providerCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 14,
                      background: 'white',
                      color: formData.providerCount ? '#1A1F2B' : '#9CA3AF',
                    }}
                  >
                    <option value="" disabled>Select range</option>
                    <option value="25-50">25 – 50 providers</option>
                    <option value="50-100">50 – 100 providers</option>
                    <option value="100-250">100 – 250 providers</option>
                    <option value="250-500">250 – 500 providers</option>
                    <option value="500+">500+ providers</option>
                  </select>
                </div>
              )}

              {config.showMessage && (
                <div className="m-form-group">
                  <label>Tell us about your needs</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Ex: We need to monitor compliance across 3 states for our MSO network..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                className="m-btn-primary m-gold m-trial-submit"
                disabled={loading}
              >
                {loading ? config.loadingLabel : config.submitLabel}
              </button>
            </form>

            <div className="m-trial-trust-bar">
              {config.trustItems.map((item, idx) => (
                <div key={idx} className="m-trial-trust-item">
                  <span className="m-trial-trust-check">&#10003;</span>
                  {item}
                </div>
              ))}
            </div>

            <p className="m-trial-terms">
              By clicking &ldquo;{config.submitLabel}&rdquo;, you agree to our{' '}
              <Link href="/terms">Terms of Service</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={
      <section className="m-trial-page">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5A6472' }}>
          Loading...
        </div>
      </section>
    }>
      <ContactPageContent />
    </Suspense>
  );
}
