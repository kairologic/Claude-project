'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SessionData {
  id: string;
  customer_email: string;
  subscription: string;
  payment_status: string;
  status: string;
  metadata: {
    planName?: string;
    billingInterval?: string;
  };
  trial_end: string | null;
}

function LoadingFallback() {
  return (
    <section style={{
      padding: '80px 24px',
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="m-container">
        <p style={{ fontSize: 16, color: '#5A6472', margin: 0 }}>
          Loading your confirmation...
        </p>
      </div>
    </section>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch session details
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/session?session_id=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load session');
        return res.json();
      })
      .then((data) => {
        setSession(data);
        setLoading(false);

        // Automatically trigger trial signup if payment was successful
        if (data.payment_status === 'paid' || data.status === 'complete') {
          triggerTrialSignup(data);
        }
      })
      .catch((err) => {
        console.error('Session fetch error:', err);
        setError(err.message || 'Failed to load session details');
        setLoading(false);
      });
  }, [sessionId]);

  const triggerTrialSignup = async (sessionData: SessionData) => {
    try {
      setSubmitting(true);

      // Call /api/trial/signup to create the practice and start the trial
      const res = await fetch('/api/trial/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sessionData.customer_email,
          // Note: We don't have firstName, lastName, practiceName here
          // These would ideally be collected in a pre-checkout form
          // For now, we'll use placeholder values or require the user to complete setup
          firstName: 'User',
          lastName: 'Account',
          practiceName: `${sessionData.metadata.planName || 'Practice'} (Trial)`,
          npi: '0000000000', // Placeholder — should be collected from user
          subscriptionId: sessionData.subscription,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Trial signup failed');
      }

      const result = await res.json();
      console.log('Trial signup result:', result);
    } catch (err) {
      console.error('Trial signup error:', err);
      // Don't fail the page — the subscription is already created
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="m-container">
          <p style={{
            fontSize: 16,
            color: '#5A6472',
            margin: 0,
          }}>
            Loading your confirmation...
          </p>
        </div>
      </section>
    );
  }

  if (error || !session) {
    return (
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="m-container">
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#D64545',
            margin: '0 0 16px',
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: 16,
            color: '#5A6472',
            margin: '0 0 24px',
          }}>
            {error || 'Failed to load session details'}
          </p>
          <Link
            href="/pricing"
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
            Back to Pricing
          </Link>
        </div>
      </section>
    );
  }

  const trialEndDate = session.trial_end
    ? new Date(session.trial_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const planName = session.metadata?.planName || 'Subscription';
  const interval = session.metadata?.billingInterval || 'month';

  return (
    <>
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="m-container" style={{ maxWidth: 560 }}>
          {/* Success Icon */}
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 24px',
            background: '#E6F7F2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}>
            ✓
          </div>

          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#0F1E2E',
            margin: '0 0 8px',
          }}>
            Welcome to KairoLogic!
          </h1>

          <p style={{
            fontSize: 16,
            color: '#5A6472',
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}>
            Your {planName} plan is ready. Your 21-day free trial starts now.
          </p>

          {/* Trial Info Box */}
          <div style={{
            background: '#FDF6E3',
            border: '1px solid #F0C040',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            textAlign: 'left',
          }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0F1E2E',
              margin: '0 0 16px',
              textAlign: 'center',
            }}>
              Your Trial Details
            </h3>

            <div style={{
              display: 'grid',
              gap: 12,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F0C040',
                paddingBottom: 12,
              }}>
                <span style={{ color: '#5A6472', fontSize: 14 }}>Plan</span>
                <span style={{ fontWeight: 600, color: '#0F1E2E', fontSize: 14 }}>
                  {planName}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F0C040',
                paddingBottom: 12,
              }}>
                <span style={{ color: '#5A6472', fontSize: 14 }}>Billing Interval</span>
                <span style={{ fontWeight: 600, color: '#0F1E2E', fontSize: 14 }}>
                  {interval === 'month' ? 'Monthly' : 'Annual'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: 0,
              }}>
                <span style={{ color: '#5A6472', fontSize: 14 }}>Trial Ends</span>
                <span style={{ fontWeight: 600, color: '#1A9E6D', fontSize: 14 }}>
                  {trialEndDate || 'In 21 days'}
                </span>
              </div>
            </div>

            <p style={{
              fontSize: 12,
              color: '#5A6472',
              margin: '16px 0 0',
              paddingTop: '16px',
              borderTop: '1px solid #F0C040',
            }}>
              After your trial, your subscription will automatically renew at the plan price. You can cancel anytime
              before the trial ends to avoid charges.
            </p>
          </div>

          {/* What's Next */}
          <div style={{
            background: '#F4F5F7',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            textAlign: 'left',
          }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0F1E2E',
              margin: '0 0 16px',
            }}>
              What Happens Next
            </h3>

            <ol style={{
              margin: 0,
              paddingLeft: 20,
              color: '#5A6472',
              fontSize: 14,
              lineHeight: 1.8,
            }}>
              <li style={{ marginBottom: 8 }}>
                A welcome email has been sent to <strong>{session.customer_email}</strong>
              </li>
              <li style={{ marginBottom: 8 }}>
                Complete your practice profile in the dashboard
              </li>
              <li style={{ marginBottom: 8 }}>
                We'll scan your provider data across NPPES, payer directories, and state boards
              </li>
              <li>
                Check your compliance status and start using the platform
              </li>
            </ol>
          </div>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <button
              disabled={submitting}
              style={{
                background: '#D4A017',
                color: '#0F1E2E',
                padding: '14px 32px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                textDecoration: 'none',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Setting up your account...' : 'Go to Dashboard'}
            </button>

            <Link
              href="/pricing"
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#FFFFFF',
                color: '#0F1E2E',
                padding: '14px 32px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                border: '1px solid #E8EAED',
                textDecoration: 'none',
              }}
            >
              Back to Pricing
            </Link>
          </div>

          {/* Support Info */}
          <p style={{
            fontSize: 12,
            color: '#9AA3AE',
            marginTop: 32,
            marginBottom: 0,
          }}>
            Questions? Contact us at{' '}
            <a
              href="mailto:info@kairologic.net"
              style={{
                color: '#D4A017',
                textDecoration: 'none',
              }}
            >
              info@kairologic.net
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
