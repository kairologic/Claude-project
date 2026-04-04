/**
 * emails/contact-received.tsx
 *
 * Sent when: Someone submits the public contact form.
 * Trigger:   Contact form submission API route.
 *
 * Content: Acknowledgment, what to expect, support info.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { brand, DASHBOARD_URL, EmailLayout, InfoCard, SecondaryButton } from './components/layout';

export interface ContactReceivedEmailProps {
  contactName: string;
  contactEmail: string;
  practiceName?: string;
  subject?: string;
  messagePreview?: string; // first ~100 chars of their message
}

export function ContactReceivedEmail({
  contactName = 'there',
  contactEmail = '',
  practiceName = '',
  subject = 'your inquiry',
  messagePreview = '',
}: ContactReceivedEmailProps) {
  return (
    <EmailLayout previewText={`We received your message — KairoLogic`}>
      <Text style={headingStyle}>We Got Your Message</Text>

      <Text style={bodyText}>Hi {contactName},</Text>

      <Text style={bodyText}>
        Thank you for reaching out
        {practiceName ? ` on behalf of ${practiceName}` : ''}. We received your message regarding{' '}
        <strong>{subject}</strong> and a member of our team will follow up within one business day.
      </Text>

      {messagePreview && (
        <InfoCard>
          <Text
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              fontWeight: 700,
              color: brand.gray400,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            Your Message
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: 14,
              color: brand.gray600,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{messagePreview}
            {messagePreview.length >= 100 ? '...' : ''}&rdquo;
          </Text>
        </InfoCard>
      )}

      <Section style={{ margin: '24px 0' }}>
        <Text style={sectionTitle}>What Happens Next</Text>
        <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
          <tr>
            <td style={stepNumber}>1</td>
            <td style={stepText}>
              <Text style={{ margin: 0, fontSize: 14, color: '#2D3748' }}>
                Our team reviews your message and matches you with the right person.
              </Text>
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>2</td>
            <td style={stepText}>
              <Text style={{ margin: 0, fontSize: 14, color: '#2D3748' }}>
                We&apos;ll respond to <strong>{contactEmail}</strong> within one business day.
              </Text>
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>3</td>
            <td style={stepText}>
              <Text style={{ margin: 0, fontSize: 14, color: '#2D3748' }}>
                If your practice is on KairoLogic, we can jump right into a screen-share of your
                data.
              </Text>
            </td>
          </tr>
        </table>
      </Section>

      <SecondaryButton href={DASHBOARD_URL}>Visit KairoLogic</SecondaryButton>

      <Text style={mutedText}>
        Need urgent help? Call us at <strong>512.402.2237</strong> or reply directly to this email.
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
  margin: '0 0 16px',
};

const stepNumber: React.CSSProperties = {
  width: 28,
  height: 28,
  backgroundColor: brand.gray100,
  borderRadius: 14,
  textAlign: 'center',
  verticalAlign: 'top',
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  paddingTop: 5,
};

const stepText: React.CSSProperties = {
  paddingLeft: 12,
  paddingBottom: 14,
  verticalAlign: 'top',
};

const mutedText: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  lineHeight: '1.5',
  marginTop: 16,
};

export default ContactReceivedEmail;
