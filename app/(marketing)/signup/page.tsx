'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLAN_CONFIG: Record<
  string,
  { name: string; price: string; interval: string; features: string[] }
> = {
  starter: {
    name: 'Starter',
    price: '$149',
    interval: '/mo',
    features: [
      'Up to 10 providers',
      'Daily payer directory scans',
      'Real-time mismatch alerts',
      'Workflow automation',
    ],
  },
  professional: {
    name: 'Professional',
    price: '$249',
    interval: '/mo',
    features: [
      'Up to 25 providers',
      'Everything in Starter',
      'NPPES correction workflows',
      'Compliance scanning (SB 1188, HB 149)',
      'Team access (5 seats)',
    ],
  },
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <section className="m-trial-page">
          <div className="m-trial-layout">
            <div
              className="m-trial-form-card"
              style={{ textAlign: 'center', padding: '80px 40px' }}
            >
              <p style={{ color: '#94a3b8' }}>Loading...</p>
            </div>
          </div>
        </section>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan'); // null = free, 'starter', 'professional'
  const planConfig = plan ? PLAN_CONFIG[plan] : null;
  const isFree = !planConfig;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    practiceName: '',
    npi: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create the trial/org via existing signup API
      const signupRes = await fetch('/api/trial/signup', {
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

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupData.error || 'Failed to create account');
      }

      if (signupData.message === 'existing_trial' || signupData.message === 'existing_account') {
        // Already has an account — show success (magic link resent)
        setSubmitted(true);
        return;
      }

      // Step 2: For paid plans, redirect to Stripe Checkout
      if (planConfig && signupData.practice_id) {
        const upgradeRes = await fetch('/api/trial/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            practice_website_id: signupData.practice_id,
            plan: plan,
            billing: 'monthly',
          }),
        });

        const upgradeData = await upgradeRes.json();

        if (upgradeData.checkout_url) {
          // Redirect to Stripe Checkout
          window.location.href = upgradeData.checkout_url;
          return;
        }
      }

      // Free flow: show success
      setSubmitted(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <section className="m-trial-page">
        <div className="m-trial-success">
          <div className="m-trial-success-icon">&#10003;</div>
          <h2>You&apos;re in!</h2>
          <p>
            Check your inbox at <strong>{formData.email}</strong> &mdash; we&apos;ve sent you a link
            to access your dashboard.
          </p>
          <p className="m-trial-success-note">
            Your 14-day free trial includes full access to all features &mdash; compliance
            monitoring, credentialing workflows, and payer directory tracking. We&apos;re running
            your first provider data scan now, so you&apos;ll see results within a few minutes.
          </p>
          {isFree && (
            <p className="m-trial-success-note" style={{ marginTop: '8px' }}>
              No credit card needed. After 14 days, your dashboard continues on the Free plan with
              up to 5 providers monitored.
            </p>
          )}
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
        {/* Left Column — Value prop */}
        <div className="m-trial-content">
          <h1>
            {isFree ? (
              <>
                Start monitoring your
                <br />
                <em>provider data today.</em>
              </>
            ) : (
              <>
                Start your {planConfig.name}
                <br />
                <em>14-day free trial.</em>
              </>
            )}
          </h1>
          <p className="m-trial-subtitle">
            {isFree
              ? 'Get instant visibility into your provider data integrity across NPPES, payer directories, and state boards. No credit card required.'
              : `Get full ${planConfig.name} access for 14 days. Your card will only be charged after the trial ends.`}
          </p>

          {/* Plan features or general features */}
          <div className="m-trial-features">
            {(planConfig
              ? planConfig.features
              : [
                  'Monitor up to 5 providers for free',
                  'Catch address drift, credential gaps, and compliance issues',
                  'Track payer directory listings across major insurers',
                  'Upgrade anytime for more providers and features',
                ]
            ).map((feature, idx) => (
              <div key={idx} className="m-trial-feature">
                <span className="m-trial-feature-check">&#10003;</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing highlight for paid plans */}
          {planConfig && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px 24px',
                marginTop: '24px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                After your 14-day trial:
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {planConfig.price}
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                  {planConfig.interval}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: 4 }}>
                Cancel anytime during your trial &mdash; no charge.
              </div>
            </div>
          )}

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
              {isFree ? (
                <>
                  <h2>Get started free</h2>
                  <p>No credit card required. Monitor up to 5 providers.</p>
                </>
              ) : (
                <>
                  <h2>{planConfig.name} &mdash; 14-day free trial</h2>
                  <p>Full access. You&apos;ll add payment after signup.</p>
                </>
              )}
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

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
                {loading
                  ? planConfig
                    ? 'Setting up your trial...'
                    : 'Creating your account...'
                  : planConfig
                    ? `Start 14-Day Free Trial`
                    : 'Get Started Free'}
              </button>
            </form>

            <div className="m-trial-trust-bar">
              <div className="m-trial-trust-item">
                <span className="m-trial-trust-check">&#10003;</span>
                {isFree ? 'No credit card required' : 'Card charged only after trial'}
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
              By clicking &ldquo;{planConfig ? 'Start 14-Day Free Trial' : 'Get Started Free'}
              &rdquo;, you agree to our <Link href="/terms">Terms of Service</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>

            {/* Plan switcher for paid plans */}
            {planConfig && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '16px',
                  fontSize: '13px',
                  color: '#64748b',
                }}
              >
                Just want to try it out?{' '}
                <Link href="/signup" style={{ color: '#d4a017', fontWeight: 600 }}>
                  Start free instead
                </Link>
              </div>
            )}
            {isFree && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '16px',
                  fontSize: '13px',
                  color: '#64748b',
                }}
              >
                Need more than 5 providers?{' '}
                <Link href="/pricing" style={{ color: '#d4a017', fontWeight: 600 }}>
                  View plans
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
