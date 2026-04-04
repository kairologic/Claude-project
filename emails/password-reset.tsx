/**
 * emails/password-reset.tsx
 *
 * Sent when: User requests a password reset.
 * Trigger:   Auth flow / set-password API.
 *
 * Content: Reset link, security note, expiry warning.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, CtaButton, EmailLayout, InfoCard } from './components/layout';

export interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordResetEmail({
  recipientName = 'there',
  resetUrl = '#',
  expiresInMinutes = 60,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout previewText="Reset your KairoLogic password">
      <Text style={headingStyle}>Reset Your Password</Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        We received a request to reset the password for your KairoLogic account. Click the button
        below to choose a new password.
      </Text>

      <CtaButton href={resetUrl}>Reset Password</CtaButton>

      <InfoCard accentColor={brand.gold} bgColor={brand.goldPale}>
        <Text style={{ margin: 0, fontSize: 13, color: brand.navy }}>
          This link will expire in <strong>{expiresInMinutes} minutes</strong>. If you didn&apos;t
          request a password reset, you can safely ignore this email — your password will remain
          unchanged.
        </Text>
      </InfoCard>

      <Section style={{ margin: '24px 0' }}>
        <Text style={sectionTitle}>Security Tips</Text>
        <Text style={tipText}>• Choose a password that&apos;s at least 12 characters long</Text>
        <Text style={tipText}>• Don&apos;t reuse passwords from other services</Text>
        <Text style={tipText}>• KairoLogic will never ask for your password by email or phone</Text>
      </Section>

      <Section style={{ marginTop: 16 }}>
        <Text style={mutedText}>
          Link not working? Copy and paste this URL into your browser:
          <br />
          <span style={{ fontSize: 11, wordBreak: 'break-all' as const }}>{resetUrl}</span>
        </Text>
      </Section>

      <Text style={mutedText}>
        If you did not request this reset, please contact us immediately at{' '}
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

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 10px',
};

const tipText: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  lineHeight: '1.6',
  margin: '2px 0',
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
  marginTop: 16,
};

export default PasswordResetEmail;
