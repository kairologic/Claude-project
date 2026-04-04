/**
 * emails/subscription-confirmed.tsx
 *
 * Sent when: Stripe subscription.created / checkout.session.completed
 * Trigger:   Stripe webhook after successful subscription purchase.
 *
 * Content: Confirmation with order details, what's included,
 *          dashboard access CTA. All product/pricing fields are
 *          flexible placeholders — fill in once product variants
 *          and pricing are finalized.
 */

import { Hr, Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, CtaButton, DASHBOARD_URL, EmailLayout, InfoCard } from './components/layout';

export interface SubscriptionConfirmedEmailProps {
  recipientName: string;
  practiceName: string;
  // ── Product details (placeholders — fill in when finalized) ──
  productName: string; // e.g. "Provider Intelligence Pro"
  planInterval: string; // e.g. "monthly", "annual"
  price: string; // e.g. "$99/mo", "$899/yr"
  nextBillingDate: string; // e.g. "April 30, 2026"
  // ── What's included (array of feature bullets) ──
  features: string[];
  // ── Receipt / reference ──
  transactionId?: string;
  receiptUrl?: string;
  // ── Dashboard access ──
  dashboardToken?: string;
  practiceId?: string;
}

export function SubscriptionConfirmedEmail({
  recipientName = 'there',
  practiceName = 'Your Practice',
  productName = 'KairoLogic Subscription',
  planInterval = 'monthly',
  price = '$—/mo',
  nextBillingDate = '—',
  features = [],
  transactionId = '',
  receiptUrl = '',
  dashboardToken = '',
  practiceId = '',
}: SubscriptionConfirmedEmailProps) {
  const dashboardUrl = practiceId
    ? `${DASHBOARD_URL}/dashboard?practice=${practiceId}${dashboardToken ? `&token=${dashboardToken}` : ''}`
    : `${DASHBOARD_URL}/dashboard`;

  return (
    <EmailLayout previewText={`Subscription confirmed — ${productName} for ${practiceName}`}>
      {/* Confirmation banner */}
      <Section
        style={{
          backgroundColor: brand.greenPale,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: brand.green,
          }}
        >
          Subscription Confirmed
        </Text>
      </Section>

      <Text style={headingStyle}>Welcome to {productName}</Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        Thank you for subscribing! Your <strong>{productName}</strong> {planInterval} plan for{' '}
        <strong>{practiceName}</strong> is now active.
      </Text>

      {/* Order summary */}
      <Section style={orderBox}>
        <Text style={orderTitle}>Subscription Details</Text>
        <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
          <tr>
            <td style={orderLabel}>Plan</td>
            <td style={orderValue}>{productName}</td>
          </tr>
          <tr>
            <td style={orderLabel}>Billing</td>
            <td style={orderValue}>
              {price} ({planInterval})
            </td>
          </tr>
          <tr>
            <td style={orderLabel}>Next billing date</td>
            <td style={orderValue}>{nextBillingDate}</td>
          </tr>
          {transactionId && (
            <tr>
              <td style={orderLabel}>Transaction ID</td>
              <td style={{ ...orderValue, fontFamily: 'monospace', fontSize: 12 }}>
                {transactionId}
              </td>
            </tr>
          )}
        </table>
      </Section>

      {/* What's included */}
      {features.length > 0 && (
        <Section style={{ margin: '24px 0' }}>
          <Text style={sectionTitle}>What&apos;s Included</Text>
          {features.map((feature, i) => (
            <Text key={i} style={featureItem}>
              ✓&nbsp;&nbsp;{feature}
            </Text>
          ))}
        </Section>
      )}

      <CtaButton href={dashboardUrl}>Go to Your Dashboard</CtaButton>

      {receiptUrl && (
        <Text style={{ textAlign: 'center', fontSize: 13, margin: '0 0 16px' }}>
          <a href={receiptUrl} style={{ color: brand.blue, textDecoration: 'none' }}>
            View your receipt
          </a>
        </Text>
      )}

      <Hr style={{ borderColor: brand.gray200, margin: '24px 0 16px' }} />

      <InfoCard>
        <Text style={{ margin: 0, fontSize: 13, color: brand.navy }}>
          <strong>Need to make changes?</strong> You can manage your subscription, update your
          payment method, or cancel anytime from your{' '}
          <a
            href={`${DASHBOARD_URL}/settings/billing`}
            style={{ color: brand.blue, textDecoration: 'none' }}
          >
            billing settings
          </a>
          .
        </Text>
      </InfoCard>

      <Text style={mutedText}>
        Questions about your subscription? Reply to this email or contact us at{' '}
        <strong>support@kairologic.net</strong>.
      </Text>
    </EmailLayout>
  );
}

// ── Styles ──

const headingStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: brand.navy,
  margin: '0 0 20px',
  lineHeight: '1.2',
};

const bodyText: React.CSSProperties = {
  fontSize: 15,
  lineHeight: '1.65',
  color: '#2D3748',
  margin: '0 0 14px',
};

const orderBox: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '20px 24px',
  margin: '20px 0',
};

const orderTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 14px',
};

const orderLabel: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  padding: '6px 0',
  borderBottom: `1px solid ${brand.gray200}`,
  width: '40%',
};

const orderValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: brand.navy,
  padding: '6px 0',
  borderBottom: `1px solid ${brand.gray200}`,
  textAlign: 'right',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 10px',
};

const featureItem: React.CSSProperties = {
  fontSize: 14,
  color: '#2D3748',
  lineHeight: '1.6',
  margin: '4px 0',
  paddingLeft: 4,
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
  marginTop: 16,
};

export default SubscriptionConfirmedEmail;
