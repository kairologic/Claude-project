'use client';

import { useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutModalProps {
  tier: {
    id: string;
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    monthlyPriceId: string;
    annualPriceId: string;
  };
  billingInterval: 'month' | 'year';
  onClose: () => void;
}

export default function CheckoutModal({ tier, billingInterval, onClose }: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch checkout session on mount
  if (!clientSecret && !error) {
    const priceId = billingInterval === 'month' ? tier.monthlyPriceId : tier.annualPriceId;

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        planName: tier.name,
        billingInterval,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create checkout session');
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Checkout error:', err);
        setError(err.message || 'Failed to load checkout');
        setLoading(false);
      });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 30, 46, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(15, 30, 46, 0.2)',
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#E8EAED',
            border: 'none',
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            fontSize: 20,
            color: '#0F1E2E',
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          borderBottom: '1px solid #E8EAED',
        }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#0F1E2E',
            margin: '0 0 4px',
          }}>
            {tier.name} Plan
          </h2>
          <p style={{
            fontSize: 14,
            color: '#5A6472',
            margin: 0,
          }}>
            21-day free trial. Credit card required.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#5A6472',
            }}>
              <p style={{ margin: 0 }}>Loading checkout...</p>
            </div>
          )}

          {error && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#D64545',
            }}>
              <p style={{ margin: '0 0 16px' }}>{error}</p>
              <button
                onClick={onClose}
                style={{
                  background: '#0F1E2E',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Close
              </button>
            </div>
          )}

          {clientSecret && !error && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: () => {
                  // Success will be handled by redirect to /pricing/success
                },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
}
