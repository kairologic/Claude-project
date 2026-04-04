/**
 * emails/preview-report.tsx
 *
 * Sent when: An unclaimed practice's report is generated (outreach).
 * Trigger:   Admin triggers from practices page, or scheduled outreach.
 *
 * Content: Teaser of data health issues found, sample findings,
 *          CTA to view full report / claim practice.
 *
 * This mirrors the printed mailer's content in email form.
 */

import { Hr, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  brand,
  CtaButton,
  DASHBOARD_URL,
  EmailLayout,
  InfoCard,
  StatPill,
} from './components/layout';

export interface PreviewReportEmailProps {
  recipientName: string;
  practiceName: string;
  city: string;
  state: string;
  providerCount: number;
  totalIssues: number;
  // Severity breakdown
  highCount: number;
  mediumCount: number;
  lowCount: number;
  // Sample findings (max 2)
  sampleFindings: Array<{
    type: string; // e.g. "Address Mismatch", "Phone Mismatch"
    severity: 'high' | 'medium' | 'low';
    registryValue: string;
    websiteValue: string;
  }>;
  // Preview token or slug for the report page
  previewSlug: string;
}

const severityLabel: Record<string, { color: string; bg: string }> = {
  high: { color: brand.red, bg: brand.redPale },
  medium: { color: brand.gold, bg: brand.goldPale },
  low: { color: brand.blue, bg: brand.bluePale },
};

export function PreviewReportEmail({
  recipientName = 'Practice Manager',
  practiceName = 'Your Practice',
  city = '',
  state = 'TX',
  providerCount = 0,
  totalIssues = 0,
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
  sampleFindings = [],
  previewSlug = '',
}: PreviewReportEmailProps) {
  const location = [city, state].filter(Boolean).join(', ');
  const reportUrl = `${DASHBOARD_URL}/report/${previewSlug}`;

  return (
    <EmailLayout previewText={`${totalIssues} data discrepancies found for ${practiceName}`}>
      <Text style={headingStyle}>Practice Data Overview: {practiceName}</Text>
      <Text style={subheadingStyle}>
        {location}&nbsp;&nbsp;|&nbsp;&nbsp;{providerCount} Providers
      </Text>

      <Text style={bodyText}>Dear {recipientName},</Text>

      <Text style={bodyText}>
        While monitoring provider data accuracy in the {city || state} area, we found{' '}
        <strong>{totalIssues} data discrepancies</strong> across your {providerCount} provider
        records. These are mismatches between what federal registries, insurance directories, and
        your website show about your providers.
      </Text>

      {/* Big stat callout — matches the mailer */}
      <Section style={heroStatContainer}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
          <tr>
            <StatPill value={totalIssues} label="At Risk" color={brand.gold} />
          </tr>
        </table>
        <Text style={heroStatCaption}>
          Total data discrepancies found across {providerCount} provider records
        </Text>
      </Section>

      {/* Severity breakdown */}
      <Section style={{ margin: '20px 0' }}>
        <Text style={sectionTitle}>Issues by Severity</Text>
        <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
          {[
            {
              label: 'High',
              count: highCount,
              desc: 'Address or identity mismatches',
              color: brand.red,
            },
            {
              label: 'Medium',
              count: mediumCount,
              desc: 'Phone, fax, or contact discrepancies',
              color: brand.gold,
            },
            {
              label: 'Low',
              count: lowCount,
              desc: 'Minor listing inconsistencies',
              color: brand.blue,
            },
          ].map((row, i) => (
            <tr key={i}>
              <td
                style={{ padding: '8px 0', borderBottom: `1px solid ${brand.gray200}`, width: 70 }}
              >
                <Text style={{ margin: 0, fontSize: 14, fontWeight: 700, color: row.color }}>
                  {row.label}
                </Text>
              </td>
              <td
                style={{
                  padding: '8px 0',
                  borderBottom: `1px solid ${brand.gray200}`,
                  width: 40,
                  textAlign: 'center',
                }}
              >
                <Text style={{ margin: 0, fontSize: 16, fontWeight: 800, color: brand.navy }}>
                  {row.count}
                </Text>
              </td>
              <td style={{ padding: '8px 0', borderBottom: `1px solid ${brand.gray200}` }}>
                <Text style={{ margin: 0, fontSize: 13, color: brand.gray600 }}>{row.desc}</Text>
              </td>
            </tr>
          ))}
        </table>
      </Section>

      {/* Sample findings */}
      {sampleFindings.length > 0 && (
        <Section style={{ margin: '24px 0' }}>
          <Text style={sectionTitle}>Sample Findings</Text>
          {sampleFindings.slice(0, 2).map((finding, i) => {
            const sev = severityLabel[finding.severity] || severityLabel.low;
            return (
              <Section key={i} style={{ marginBottom: 12 }}>
                <InfoCard accentColor={sev.color} bgColor={sev.bg}>
                  <Text
                    style={{
                      margin: '0 0 8px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: brand.navy,
                    }}
                  >
                    {finding.type}{' '}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: sev.color,
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      ({finding.severity})
                    </span>
                  </Text>
                  <Text style={findingLine}>
                    <strong>Registry:</strong> {finding.registryValue}
                  </Text>
                  <Text style={findingLine}>
                    <strong>Website:</strong> {finding.websiteValue}
                  </Text>
                </InfoCard>
              </Section>
            );
          })}
        </Section>
      )}

      <Text style={bodyText}>
        These kinds of mismatches can cause claim denials, misdirected referrals, and patient
        confusion. They can also trigger compliance flags under state regulations.
      </Text>

      <CtaButton href={reportUrl}>See Your Full Practice Report</CtaButton>

      <Text
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: brand.green,
          fontWeight: 600,
          margin: '0 0 20px',
        }}
      >
        No account or credit card required
      </Text>

      <Hr style={{ borderColor: brand.gray200, margin: '16px 0' }} />

      <Text style={mutedText}>
        This report was generated by KairoLogic&apos;s automated provider data monitoring system. To
        stop receiving these emails, reply with &ldquo;unsubscribe&rdquo;.
      </Text>
    </EmailLayout>
  );
}

// ── Styles ──

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: brand.navy,
  margin: '0 0 4px',
  lineHeight: '1.3',
};

const subheadingStyle: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  margin: '0 0 20px',
};

const bodyText: React.CSSProperties = {
  fontSize: 15,
  lineHeight: '1.65',
  color: '#2D3748',
  margin: '0 0 14px',
};

const heroStatContainer: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '24px 16px 16px',
  margin: '20px 0',
  textAlign: 'center',
};

const heroStatCaption: React.CSSProperties = {
  fontSize: 13,
  color: brand.gray600,
  margin: '8px 0 0',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 12px',
};

const findingLine: React.CSSProperties = {
  margin: '2px 0',
  fontSize: 13,
  color: '#2D3748',
  lineHeight: '1.5',
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
};

export default PreviewReportEmail;
