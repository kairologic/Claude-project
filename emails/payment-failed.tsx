/**
 * emails/payment-failed.tsx
 *
 * Sent when: Stripe invoice.payment_failed webhook fires.
 * Trigger:   Card declined, expired, or insufficient funds.
 *
 * Content: What failed, why it matters, update payment CTA.
 * This is the single most important email for subscription
 * revenue recovery — involuntary churn prevention.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, CtaButton, DASHBOARD_URL, EmailLayout, InfoCard } from './components/layout';

export interface PaymentFailedEmailProps {
  recipientName: string;
  practiceName: string;
  productName: string;
  price: string;
  // Failure details
  failureReason: string; // e.g. "Card declined", "Card expired", "Insufficient funds"
  lastFourDigits?: string; // e.g. "4242"
  cardBrand?: string; // e.g. "Visa", "Mastercard"
  // Retry info
  nextRetryDate?: string; // e.g. "April 3, 2026"
  retryAttempt: number; // 1, 2, or 3
  maxRetries: number; // typically 3
  // Urgency — what happens if not fixed
  gracePeriodEnds?: string; // e.g. "April 10, 2026"
  practiceId?: string;
}

export function PaymentFailedEmail({
  recipientName = 'there',
  practiceName = 'Your Practice',
  productName = 'KairoLogic Subscription',
  price = '$—/mo',
  failureReason = 'Payment could not be processed',
  lastFourDigits = '',
  cardBrand = '',
  nextRetryDate = '',
  retryAttempt = 1,
  maxRetries = 3,
  gracePeriodEnds = '',
  practiceId = '',
}: PaymentFailedEmailProps) {
  const billingUrl = `${DASHBOARD_URL}/settings/billing${practiceId ? `?practice=${practiceId}` : ''}`;
  const isLastAttempt = retryAttempt >= maxRetries;
  const cardDisplay =
    cardBrand && lastFourDigits
      ? `${cardBrand} ending in ${lastFourDigits}`
      : 'your payment method';

  return (
    <EmailLayout previewText={`Payment failed for ${practiceName} — update your payment method`}>
      {/* Urgency banner */}
      <Section
        style={{
          backgroundColor: isLastAttempt ? brand.redPale : brand.goldPale,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: isLastAttempt ? brand.red : brand.gold,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          {isLastAttempt ? 'Final Notice — Action Required' : 'Payment Failed — Action Needed'}
        </Text>
      </Section>

      <Text style={headingStyle}>
        {isLastAttempt ? 'Your Subscription Is At Risk' : 'We Couldn\u2019t Process Your Payment'}
      </Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        We attempted to charge {cardDisplay} for your <strong>{productName}</strong> subscription (
        {price}) for <strong>{practiceName}</strong>, but the payment didn&apos;t go through.
      </Text>

      {/* Failure detail card */}
      <InfoCard
        accentColor={isLastAttempt ? brand.red : brand.gold}
        bgColor={isLastAttempt ? brand.redPale : brand.goldPale}
      >
        <Text
          style={{
            margin: '0 0 6px',
            fontSize: 14,
            fontWeight: 600,
            color: brand.navy,
          }}
        >
          Reason: {failureReason}
        </Text>
        <Text style={{ margin: 0, fontSize: 13, color: brand.gray600 }}>
          Attempt {retryAttempt} of {maxRetries}
          {nextRetryDate && !isLastAttempt ? ` — we\u2019ll retry on ${nextRetryDate}` : ''}
        </Text>
      </InfoCard>

      <CtaButton href={billingUrl}>Update Payment Method</CtaButton>

      {/* What's at stake */}
      <Section style={{ margin: '20px 0' }}>
        <Text style={sectionTitle}>Why This Matters</Text>
        <Text style={{ fontSize: 14, lineHeight: '1.6', color: '#2D3748', margin: 0 }}>
          {isLastAttempt ? (
            <>
              This was our final automatic retry. If your payment method isn&apos;t updated
              {gracePeriodEnds ? ` by ${gracePeriodEnds}` : ' soon'}, your subscription will be
              paused and you&apos;ll lose access to:
            </>
          ) : (
            <>
              If the payment continues to fail, your subscription will eventually be paused
              {gracePeriodEnds ? ` after ${gracePeriodEnds}` : ''}. This means you&apos;d lose
              access to:
            </>
          )}
        </Text>
        <Text style={lossItem}>&bull;&nbsp;&nbsp;Real-time provider data monitoring</Text>
        <Text style={lossItem}>&bull;&nbsp;&nbsp;Payer directory sync and mismatch alerts</Text>
        <Text style={lossItem}>&bull;&nbsp;&nbsp;Compliance tracking and automated workflows</Text>
        <Text style={lossItem}>&bull;&nbsp;&nbsp;Weekly data health digests</Text>
      </Section>

      <Text style={bodyText}>
        Updating your payment method takes less than a minute and will keep everything running
        smoothly.
      </Text>

      <Text style={mutedText}>
        If you&apos;ve already updated your payment details, you can disregard this email —
        we&apos;ll process the charge automatically. Questions? Reach us at{' '}
        <strong>support@kairologic.net</strong>.
      </Text>
    </EmailLayout>
  );
}

// ── Styles ──

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: brand.navy,
  margin: '0 0 16px',
  lineHeight: '1.3',
};

const bodyText: React.CSSProperties = {
  fontSize: 15,
  lineHeight: '1.65',
  color: '#2D3748',
  margin: '0 0 14px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 10px',
};

const lossItem: React.CSSProperties = {
  fontSize: 14,
  color: '#2D3748',
  lineHeight: '1.6',
  margin: '3px 0',
  paddingLeft: 4,
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
  marginTop: 20,
};

export default PaymentFailedEmail;
