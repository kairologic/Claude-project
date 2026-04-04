/**
 * emails/welcome.tsx
 *
 * Sent when: A practice successfully claims their profile.
 * Trigger:   Practice claim confirmation flow (organization_id is set).
 *
 * Content: Welcome message, quick stats snapshot, dashboard CTA.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  brand,
  CtaButton,
  DASHBOARD_URL,
  EmailLayout,
  InfoCard,
  StatPill,
} from './components/layout';

export interface WelcomeEmailProps {
  practiceName: string;
  city: string;
  state: string;
  providerCount: number;
  issuesFound: number;
  claimedByName?: string;
}

export function WelcomeEmail({
  practiceName = 'Your Practice',
  city = '',
  state = 'TX',
  providerCount = 0,
  issuesFound = 0,
  claimedByName = 'Practice Manager',
}: WelcomeEmailProps) {
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <EmailLayout previewText={`Welcome to KairoLogic — ${practiceName} is now live`}>
      <Text style={headingStyle}>Welcome to KairoLogic</Text>

      <Text style={bodyText}>Hi {claimedByName},</Text>

      <Text style={bodyText}>
        Great news — <strong>{practiceName}</strong>
        {location ? ` (${location})` : ''} has been claimed and your dashboard is now active. You
        have full access to provider data monitoring, compliance tracking, and payer directory sync.
      </Text>

      {/* Stats snapshot */}
      <Section style={statsContainer}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
          <tr>
            <StatPill value={providerCount} label="Providers" />
            <StatPill
              value={issuesFound}
              label="Issues Found"
              color={issuesFound > 0 ? brand.gold : brand.green}
            />
          </tr>
        </table>
      </Section>

      <InfoCard accentColor={brand.green} bgColor={brand.greenPale}>
        <Text style={{ margin: 0, fontSize: 14, color: brand.navy }}>
          <strong>What happens next:</strong> We&apos;ll monitor your provider records across NPPES,
          payer directories, and your website. You&apos;ll get alerts when discrepancies appear so
          you can fix them before they cause claim denials or patient confusion.
        </Text>
      </InfoCard>

      <CtaButton href={`${DASHBOARD_URL}/dashboard`}>Go to Your Dashboard</CtaButton>

      <Text style={mutedText}>
        Questions? Reply to this email or reach us at <strong>support@kairologic.net</strong>.
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
  margin: '0 0 16px',
};

const mutedText: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  lineHeight: '1.5',
  margin: '16px 0 0',
};

const statsContainer: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '20px 16px',
  margin: '20px 0',
  textAlign: 'center',
};

export default WelcomeEmail;
