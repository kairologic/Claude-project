/**
 * emails/invite-team.tsx
 *
 * Sent when: A practice admin invites a team member.
 * Trigger:   Invitation created in practice_users table.
 *
 * Content: Who invited them, which practice, role, accept CTA.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, CtaButton, DASHBOARD_URL, EmailLayout, InfoCard } from './components/layout';

export interface InviteTeamEmailProps {
  inviteeName: string;
  inviterName: string;
  practiceName: string;
  role: string;
  inviteToken: string;
}

export function InviteTeamEmail({
  inviteeName = 'there',
  inviterName = 'Your colleague',
  practiceName = 'the practice',
  role = 'member',
  inviteToken = '',
}: InviteTeamEmailProps) {
  const acceptUrl = `${DASHBOARD_URL}/accept-invite?token=${inviteToken}`;

  return (
    <EmailLayout previewText={`${inviterName} invited you to join ${practiceName} on KairoLogic`}>
      <Text style={headingStyle}>You&apos;re Invited</Text>

      <Text style={bodyText}>Hi {inviteeName},</Text>

      <Text style={bodyText}>
        <strong>{inviterName}</strong> has invited you to join <strong>{practiceName}</strong> on
        KairoLogic as a <strong>{role}</strong>.
      </Text>

      <InfoCard>
        <Text style={{ margin: 0, fontSize: 14, color: brand.navy }}>
          KairoLogic monitors your provider data across federal registries, insurance directories,
          and your practice website — catching discrepancies before they cause claim denials or
          compliance issues.
        </Text>
      </InfoCard>

      <CtaButton href={acceptUrl}>Accept Invitation</CtaButton>

      <Text style={mutedText}>
        This invitation was sent to you by {inviterName} at {practiceName}. If you don&apos;t
        recognize this practice, you can safely ignore this email.
      </Text>

      <Section style={{ marginTop: 16 }}>
        <Text style={{ ...mutedText, fontSize: 11 }}>
          Link not working? Copy and paste this URL into your browser:
          <br />
          {acceptUrl}
        </Text>
      </Section>
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
};

export default InviteTeamEmail;
