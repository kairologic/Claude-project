'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function GetStartedPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    practiceName: '',
    npi: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Support form state
  const [supportData, setSupportData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          practiceName: formData.practiceName,
          npi: formData.npi,
          subject: 'Free Trial Signup',
          message: `NPI: ${formData.npi}\nPractice: ${formData.practiceName}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to send');
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: supportData.name,
          email: supportData.email,
          subject: 'Support Request',
          message: supportData.message,
        }),
      });

      if (!response.ok) throw new Error('Failed to send');
      setSupportSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setSupportLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="m-trial-page">
        <div className="m-trial-success">
          <div className="m-trial-success-icon">&#10003;</div>
          <h2>You&apos;re in!</h2>
          <p>
            We&apos;re setting up your dashboard now. You&apos;ll receive an email at{' '}
            <strong>{formData.email}</strong> with your login details within the next few minutes.
          </p>
          <p className="m-trial-success-note">
            Your 14-day free trial includes full access to all features — compliance monitoring,
            credentialing workflows, and payer directory tracking. After 14 days, your dashboard
            switches to read-only mode for 7 additional days.
          </p>
          <Link href="/" className="m-btn-primary m-gold" style={{ marginTop: '24px', display: 'inline-flex' }}>
            Back to Homepage
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
    <section className="m-trial-page">
      <div className="m-trial-layout">
        {/* Left Column — Value prop content */}
        <div className="m-trial-content">
          <h1>
            Provider data intelligence<br />
            <em>for your practice.</em>
          </h1>
          <p className="m-trial-subtitle">
            Join healthcare organizations using KairoLogic to monitor provider data integrity,
            track compliance, and automate credentialing workflows.
          </p>

          <div className="m-trial-features">
            <div className="m-trial-feature">
              <span className="m-trial-feature-check">&#10003;</span>
              <span>Monitor your entire provider roster in real time</span>
            </div>
            <div className="m-trial-feature">
              <span className="m-trial-feature-check">&#10003;</span>
              <span>Catch address drift, credential gaps, and compliance issues</span>
            </div>
            <div className="m-trial-feature">
              <span className="m-trial-feature-check">&#10003;</span>
              <span>Track payer directory listings across UHC, Aetna, Cigna, and more</span>
            </div>
            <div className="m-trial-feature">
              <span className="m-trial-feature-check">&#10003;</span>
              <span>Automate credentialing from assessment to enrollment</span>
            </div>
          </div>

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
        </div>

        {/* Right Column — Signup form */}
        <div className="m-trial-form-wrap">
          <div className="m-trial-form-card">
            <div className="m-trial-form-header">
              <h2>14-day free trial</h2>
              <p>Full platform access. Read-only for 7 more days after.</p>
            </div>

            <form onSubmit={handleSubmit} className="m-trial-form">
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
                  placeholder="Ex: jane@practice.com"
                />
              </div>

              <div className="m-form-group">
                <label>Practice name *</label>
                <input
                  type="text"
                  required
                  value={formData.practiceName}
                  onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                  placeholder="Ex: Austin Regional Medical Group"
                />
              </div>

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

              <button
                type="submit"
                className="m-btn-primary m-gold m-trial-submit"
                disabled={loading}
              >
                {loading ? 'Setting up your trial...' : 'Get Free Trial'}
              </button>
            </form>

            <div className="m-trial-trust-bar">
              <div className="m-trial-trust-item">
                <span className="m-trial-trust-check">&#10003;</span>
                No credit card required
              </div>
              <div className="m-trial-trust-item">
                <span className="m-trial-trust-check">&#10003;</span>
                HIPAA-aligned infrastructure
              </div>
              <div className="m-trial-trust-item">
                <span className="m-trial-trust-check">&#10003;</span>
                Cancel anytime
              </div>
            </div>

            <p className="m-trial-terms">
              By clicking &ldquo;Get Free Trial&rdquo;, you agree to our{' '}
              <Link href="/terms">Terms of Service</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* ═══ DIVIDER ═══ */}
    <div className="m-contact-divider">
      <span>or</span>
    </div>

    {/* ═══ NEED SUPPORT? ═══ */}
    <section className="m-contact-support" id="support">
      <div className="m-container">
        <div className="m-contact-support-inner">
          <span className="m-tag">Need Support?</span>
          <h2>Get in touch with our team</h2>
          <p className="m-subtitle">
            Our friendly team is here to help. Send us a message and we&apos;ll get back to you within 24 hours.
          </p>

          {supportSubmitted ? (
            <div style={{
              background: 'var(--m-white)',
              border: '1px solid var(--m-gray-200)',
              borderRadius: '14px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#10003;</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--m-navy)', marginBottom: '8px' }}>
                Message sent!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--m-gray-600)', lineHeight: 1.6 }}>
                Thanks for reaching out. We&apos;ll get back to you at <strong>{supportData.email}</strong> within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSupportSubmit} className="m-contact-form">
              <div className="m-form-row">
                <div>
                  <label>Your name *</label>
                  <input
                    type="text"
                    required
                    value={supportData.name}
                    onChange={(e) => setSupportData({ ...supportData, name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label>Email address *</label>
                  <input
                    type="email"
                    required
                    value={supportData.email}
                    onChange={(e) => setSupportData({ ...supportData, email: e.target.value })}
                    placeholder="jane@practice.com"
                  />
                </div>
              </div>

              <div>
                <label>How can we help? *</label>
                <textarea
                  required
                  value={supportData.message}
                  onChange={(e) => setSupportData({ ...supportData, message: e.target.value })}
                  placeholder="Describe your issue or question and we'll get back to you as soon as possible..."
                />
              </div>

              <button
                type="submit"
                className="m-contact-submit"
                disabled={supportLoading}
              >
                {supportLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

          <p style={{ fontSize: '13px', color: 'var(--m-gray-400)', marginTop: '20px', lineHeight: 1.6 }}>
            You can also email us directly at{' '}
            <a href="mailto:info@kairologic.net" style={{ color: 'var(--m-gold)' }}>info@kairologic.net</a>{' '}
            or call <a href="tel:+15124022237" style={{ color: 'var(--m-gold)' }}>(512) 402-2237</a>.
          </p>
        </div>
      </div>
    </section>
    </>
  );
}
