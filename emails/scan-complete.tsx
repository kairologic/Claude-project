/**
 * emails/scan-complete.tsx
 *
 * Sent when: A scheduled or manual scan completes with new findings.
 * Trigger:   Scan job completion (practice_websites.last_scanned updated).
 *
 * Content: Scan summary, new deltas found, comparison to previous scan.
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

export interface ScanCompleteEmailProps {
  recipientName: string;
  practiceName: string;
  scanDate: string; // e.g. "March 30, 2026"
  scanType: 'weekly' | 'monthly' | 'manual';
  // Results
  totalProviders: number;
  newDeltaEvents: number;
  resolvedSinceLastScan: number;
  totalUnresolved: number;
  // Notable changes (max 4)
  notableChanges: Array<{
    type: string; // e.g. "Address Change", "Phone Update", "New Provider"
    providerName: string;
    detail: string;
  }>;
  practiceId?: string;
}

export function ScanCompleteEmail({
  recipientName = 'Practice Manager',
  practiceName = 'Your Practice',
  scanDate = 'today',
  scanType = 'weekly',
  totalProviders = 0,
  newDeltaEvents = 0,
  resolvedSinceLastScan = 0,
  totalUnresolved = 0,
  notableChanges = [],
  practiceId = '',
}: ScanCompleteEmailProps) {
  const scanLabel =
    scanType === 'manual' ? 'Manual Scan' : scanType === 'weekly' ? 'Weekly Scan' : 'Monthly Scan';

  const hasChanges = newDeltaEvents > 0 || resolvedSinceLastScan > 0;
  const dashboardUrl = practiceId
    ? `${DASHBOARD_URL}/dashboard?practice=${practiceId}`
    : `${DASHBOARD_URL}/dashboard`;

  return (
    <EmailLayout
      previewText={`${scanLabel} complete for ${practiceName}: ${newDeltaEvents} new changes detected`}
    >
      <Text style={headingStyle}>Scan Complete</Text>
      <Text style={subheadingStyle}>
        {practiceName}&nbsp;&nbsp;·&nbsp;&nbsp;{scanLabel}
        &nbsp;&nbsp;·&nbsp;&nbsp;{scanDate}
      </Text>

      <Text style={bodyText}>Hi {recipientName},</Text>

      <Text style={bodyText}>
        {hasChanges
          ? `Your ${scanLabel.toLowerCase()} for ${practiceName} found ${newDeltaEvents} new change${newDeltaEvents !== 1 ? 's' : ''} across ${totalProviders} provider records.`
          : `Good news — your ${scanLabel.toLowerCase()} for ${practiceName} found no new issues across ${totalProviders} provider records.`}
      </Text>

      {/* Stats row */}
      <Section style={statsContainer}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
          <tr>
            <StatPill
              value={newDeltaEvents > 0 ? `+${newDeltaEvents}` : '0'}
              label="New Changes"
              color={newDeltaEvents > 0 ? brand.gold : brand.green}
            />
            <StatPill value={resolvedSinceLastScan} label="Resolved" color={brand.green} />
            <StatPill
              value={totalUnresolved}
              label="Unresolved"
              color={totalUnresolved > 0 ? brand.red : brand.green}
            />
          </tr>
        </table>
      </Section>

      {/* Notable changes */}
      {notableChanges.length > 0 && (
        <Section style={{ margin: '24px 0' }}>
          <Text style={sectionTitle}>Notable Changes Detected</Text>
          {notableChanges.slice(0, 4).map((change, i) => (
            <Section
              key={i}
              style={{
                padding: '10px 0',
                borderBottom: i < notableChanges.length - 1 ? `1px solid ${brand.gray200}` : 'none',
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.navy,
                }}
              >
                {change.type}
              </Text>
              <Text
                style={{
                  margin: '2px 0 0',
                  fontSize: 13,
                  color: brand.gray600,
                }}
              >
                {change.providerName} — {change.detail}
              </Text>
            </Section>
          ))}
        </Section>
      )}

      {!hasChanges && (
        <InfoCard accentColor={brand.green} bgColor={brand.greenPale}>
          <Text style={{ margin: 0, fontSize: 14, color: brand.navy }}>
            All provider records are consistent across NPPES, payer directories, and your website.
            No action needed.
          </Text>
        </InfoCard>
      )}

      <CtaButton href={dashboardUrl}>{hasChanges ? 'Review Changes' : 'View Dashboard'}</CtaButton>

      <Hr style={{ borderColor: brand.gray200, margin: '24px 0 16px' }} />

      <Text style={mutedText}>
        Next scan scheduled based on your {scanType} cadence. You can trigger a manual scan anytime
        from your dashboard.
      </Text>
    </EmailLayout>
  );
}

// ── Styles ──

const headingStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: brand.navy,
  margin: '0 0 4px',
  lineHeight: '1.2',
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

const statsContainer: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '20px 16px',
  margin: '20px 0',
  textAlign: 'center',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 12px',
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
};

export default ScanCompleteEmail;
