/**
 * emails/renewal-reminder.tsx
 *
 * Sent when: 7 days before subscription renewal date.
 * Trigger:   Scheduled cron checks upcoming invoices.
 *
 * Content: Upcoming charge notice, current plan summary,
 *          value recap of what they got this billing period,
 *          manage subscription CTA.
 */

import { Hr, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  brand,
  DASHBOARD_URL,
  EmailLayout,
  InfoCard,
  SecondaryButton,
  StatPill,
} from './components/layout';

export interface RenewalReminderEmailProps {
  recipientName: string;
  practiceName: string;
  productName: string;
  price: string;
  planInterval: string;
  renewalDate: string; // e.g. "April 30, 2026"
  // Value recap — what they got this period
  issuesDetected?: number;
  issuesResolved?: number;
  scansCompleted?: number;
  alertsSent?: number;
  // Payment method on file
  lastFourDigits?: string;
  cardBrand?: string;
  practiceId?: string;
}

export function RenewalReminderEmail({
  recipientName = 'there',
  practiceName = 'Your Practice',
  productName = 'KairoLogic Subscription',
  price = '$—/mo',
  planInterval = 'monthly',
  renewalDate = '—',
  issuesDetected = 0,
  issuesResolved = 0,
  scansCompleted = 0,
  alertsSent = 0,
  lastFourDigits = '',
  cardBrand = '',
  practiceId = '',
}: RenewalReminderEmailProps) {
  const billingUrl = `${DASHBOARD_URL}/settings/billing${practiceId ? `?practice=${practiceId}` : ''}`;
  const cardDisplay =
    cardBrand && lastFourDigits
      ? `${cardBrand} ending in ${lastFourDigits}`
      : 'your payment method on file';
  const hasValueStats =
    issuesDetected > 0 || issuesResolved > 0 || scansCompleted > 0 || alertsSent > 0;

  return (
    <EmailLayout
      previewText={`Upcoming renewal: ${productName} for ${practiceName} on ${renewalDate}`}
    >
      <Text style={headingStyle}>Upcoming Renewal</Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        This is a friendly heads-up that your <strong>{productName}</strong> subscription for{' '}
        <strong>{practiceName}</strong> will automatically renew on <strong>{renewalDate}</strong>.
      </Text>

      {/* Renewal details */}
      <InfoCard>
        <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
          <tr>
            <td style={detailLabel}>Plan</td>
            <td style={detailValue}>{productName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Amount</td>
            <td style={detailValue}>
              {price} ({planInterval})
            </td>
          </tr>
          <tr>
            <td style={detailLabel}>Renewal date</td>
            <td style={detailValue}>{renewalDate}</td>
          </tr>
          <tr>
            <td style={{ ...detailLabel, borderBottom: 'none' }}>Payment method</td>
            <td style={{ ...detailValue, borderBottom: 'none' }}>{cardDisplay}</td>
          </tr>
        </table>
      </InfoCard>

      {/* Value recap */}
      {hasValueStats && (
        <Section style={{ margin: '24px 0' }}>
          <Text style={sectionTitle}>
            This {planInterval === 'annual' ? 'Year' : 'Month'} with KairoLogic
          </Text>
          <Section style={statsContainer}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
              <tr>
                {scansCompleted > 0 && (
                  <StatPill value={scansCompleted} label="Scans Run" color={brand.navy} />
                )}
                {issuesDetected > 0 && (
                  <StatPill value={issuesDetected} label="Issues Found" color={brand.gold} />
                )}
                {issuesResolved > 0 && (
                  <StatPill value={issuesResolved} label="Resolved" color={brand.green} />
                )}
                {alertsSent > 0 && (
                  <StatPill value={alertsSent} label="Alerts Sent" color={brand.blue} />
                )}
              </tr>
            </table>
          </Section>
        </Section>
      )}

      <Text style={bodyText}>
        No action is needed — your subscription will renew automatically. If you&apos;d like to
        update your payment method, change your plan, or cancel, you can do so from your billing
        settings.
      </Text>

      <SecondaryButton href={billingUrl}>Manage Subscription</SecondaryButton>

      <Hr style={{ borderColor: brand.gray200, margin: '24px 0 16px' }} />

      <Text style={mutedText}>
        This is an automated renewal reminder sent 7 days before your billing date. If you have
        questions, reply to this email or contact <strong>support@kairologic.net</strong>.
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

const detailLabel: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  padding: '6px 0',
  borderBottom: `1px solid ${brand.gray200}`,
};

const detailValue: React.CSSProperties = {
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
  margin: '0 0 12px',
};

const statsContainer: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '16px',
  textAlign: 'center',
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
};

export default RenewalReminderEmail;
