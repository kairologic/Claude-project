/**
 * emails/alert-notification.tsx
 *
 * Sent when: A high-severity alert is detected (address mismatch,
 *            compliance flag, payer gap, provider departure).
 * Trigger:   Alert inserted into alerts table with severity = 'action'.
 *
 * Content: What was detected, severity, impact, action CTA.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, CtaButton, DASHBOARD_URL, EmailLayout, InfoCard } from './components/layout';

export interface AlertNotificationEmailProps {
  recipientName: string;
  practiceName: string;
  // Alert details
  alertTitle: string;
  alertDescription: string;
  severity: 'action' | 'warning' | 'info';
  providerName?: string;
  providerNpi?: string;
  // What to do
  recommendedAction: string;
  alertId?: string;
  practiceId?: string;
}

const severityConfig = {
  action: {
    label: 'Action Required',
    icon: '🚨',
    headerColor: brand.red,
    bgColor: brand.redPale,
    borderColor: brand.red,
  },
  warning: {
    label: 'Warning',
    icon: '⚠️',
    headerColor: brand.gold,
    bgColor: brand.goldPale,
    borderColor: brand.gold,
  },
  info: {
    label: 'For Your Information',
    icon: 'ℹ️',
    headerColor: brand.blue,
    bgColor: brand.bluePale,
    borderColor: brand.blue,
  },
};

export function AlertNotificationEmail({
  recipientName = 'Practice Manager',
  practiceName = 'Your Practice',
  alertTitle = 'Alert',
  alertDescription = '',
  severity = 'warning',
  providerName,
  providerNpi,
  recommendedAction = '',
  alertId = '',
  practiceId = '',
}: AlertNotificationEmailProps) {
  const config = severityConfig[severity];
  const dashboardUrl = practiceId
    ? `${DASHBOARD_URL}/dashboard?practice=${practiceId}&alert=${alertId}`
    : `${DASHBOARD_URL}/dashboard`;

  return (
    <EmailLayout previewText={`${config.icon} ${alertTitle} — ${practiceName}`}>
      {/* Severity badge */}
      <Section
        style={{
          backgroundColor: config.bgColor,
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: config.headerColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          {config.icon}&nbsp;&nbsp;{config.label}
        </Text>
      </Section>

      <Text style={headingStyle}>{alertTitle}</Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        We detected an issue at <strong>{practiceName}</strong> that needs your attention.
      </Text>

      {/* Alert detail card */}
      <InfoCard accentColor={config.borderColor} bgColor={config.bgColor}>
        <Text
          style={{
            margin: '0 0 8px',
            fontSize: 14,
            fontWeight: 600,
            color: brand.navy,
          }}
        >
          {alertTitle}
        </Text>
        <Text style={{ margin: 0, fontSize: 14, color: '#2D3748' }}>{alertDescription}</Text>
        {providerName && (
          <Text
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: brand.gray600,
            }}
          >
            Provider: {providerName}
            {providerNpi ? ` (NPI: ${providerNpi})` : ''}
          </Text>
        )}
      </InfoCard>

      {/* Recommended action */}
      {recommendedAction && (
        <Section style={{ margin: '20px 0' }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: brand.navy,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.04em',
              margin: '0 0 8px',
            }}
          >
            Recommended Action
          </Text>
          <Text style={{ fontSize: 14, lineHeight: '1.6', color: '#2D3748', margin: 0 }}>
            {recommendedAction}
          </Text>
        </Section>
      )}

      <CtaButton href={dashboardUrl}>
        {severity === 'action' ? 'Take Action Now' : 'View Details'}
      </CtaButton>

      <Text style={mutedText}>
        This alert was generated automatically by KairoLogic&apos;s monitoring system. If this issue
        has already been resolved, you can dismiss it from your dashboard.
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

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
  marginTop: 16,
};

export default AlertNotificationEmail;
