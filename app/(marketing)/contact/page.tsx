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

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create trial');
      }

      if (data.message === 'existing_trial') {
        // User already has an active trial — we resent the magic link
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="m-trial-page">
        <div className="m-trial-success">
          <div className="m-trial-success-icon">&#10003;</div>
          <h2>You&apos;re in!</h2>
          <p>
            Check your inbox at <strong>{formData.email}</strong> — we&apos;ve sent you a link to
            access your dashboard.
          </p>
          <p className="m-trial-success-note">
            Your 21-day free trial includes full access to all features — compliance monitoring,
            credentialing workflows, and payer directory tracking. We&apos;re running your first
            provider data scan now, so you&apos;ll see results within a few minutes of logging in.
          </p>
          <p className="m-trial-success-note" style={{ marginTop: '8px' }}>
            After 21 days, your dashboard switches to read-only mode for 7 additional days.
          </p>
          <Link
            href="/"
            className="m-btn-primary m-gold"
            style={{ marginTop: '24px', display: 'inline-flex' }}
          >
            Back to Homepage
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="m-trial-page">
      <div className="m-trial-layout">
        {/* Left Column — Value prop content */}
        <div className="m-trial-content">
          <h1>
            Provider data intelligence
            <br />
            <em>for your practice.</em>
          </h1>
          <p className="m-trial-subtitle">
            Join healthcare organizations using KairoLogic to monitor provider data integrity, track
            compliance, and automate credentialing workflows.
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
              &ldquo;KairoLogic caught an address mismatch that had been failing PECOS verification
              for three months. Fixed in 24 hours.&rdquo;
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
              <h2>21-day free trial</h2>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      npi: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
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
  );
}
