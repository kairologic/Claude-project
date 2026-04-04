/**
 * emails/weekly-digest.tsx
 *
 * Sent when: Every Monday morning (scheduled cron).
 * Trigger:   Scheduled task / edge function.
 *
 * Content: Practice health score, new vs resolved issues,
 *          delta events this week, payer sync status.
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  brand,
  CtaButton,
  DASHBOARD_URL,
  EmailLayout,
  InfoCard,
  StatPill,
} from './components/layout';

export interface WeeklyDigestEmailProps {
  practiceName: string;
  recipientName: string;
  weekOf: string; // e.g. "Mar 24 – 30, 2026"
  // Stats
  totalProviders: number;
  activeAlerts: number;
  newIssuesThisWeek: number;
  resolvedThisWeek: number;
  // Deltas
  deltaEvents: number;
  unresolvedDeltas: number;
  // Payer
  payerSyncStatus: 'healthy' | 'issues' | 'stale';
  payerMismatches: number;
  // Top issues (max 3)
  topIssues: Array<{
    title: string;
    severity: 'action' | 'warning' | 'info';
    providerName: string;
  }>;
}

const severityColors: Record<string, { text: string; bg: string }> = {
  action: { text: brand.red, bg: brand.redPale },
  warning: { text: brand.gold, bg: brand.goldPale },
  info: { text: brand.blue, bg: brand.bluePale },
};

export function WeeklyDigestEmail({
  practiceName = 'Your Practice',
  recipientName = 'Practice Manager',
  weekOf = 'This Week',
  totalProviders = 0,
  activeAlerts = 0,
  newIssuesThisWeek = 0,
  resolvedThisWeek = 0,
  deltaEvents = 0,
  unresolvedDeltas = 0,
  payerSyncStatus = 'healthy',
  payerMismatches = 0,
  topIssues = [],
}: WeeklyDigestEmailProps) {
  const payerStatusLabel =
    payerSyncStatus === 'healthy'
      ? 'All Clear'
      : payerSyncStatus === 'issues'
        ? `${payerMismatches} Mismatches`
        : 'Needs Sync';

  const payerColor = payerSyncStatus === 'healthy' ? brand.green : brand.gold;

  return (
    <EmailLayout
      previewText={`Weekly digest for ${practiceName}: ${activeAlerts} active alerts, ${deltaEvents} changes`}
    >
      {/* Title */}
      <Text style={headingStyle}>Weekly Data Digest</Text>
      <Text style={subheadingStyle}>
        {practiceName}&nbsp;&nbsp;·&nbsp;&nbsp;{weekOf}
      </Text>

      <Text style={bodyText}>Hi {recipientName},</Text>
      <Text style={bodyText}>
        Here&apos;s your weekly summary of provider data health for <strong>{practiceName}</strong>.
      </Text>

      {/* Stats row */}
      <Section style={statsContainer}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
          <tr>
            <StatPill value={totalProviders} label="Providers" />
            <StatPill
              value={activeAlerts}
              label="Active Alerts"
              color={activeAlerts > 0 ? brand.red : brand.green}
            />
            <StatPill
              value={deltaEvents}
              label="Changes"
              color={deltaEvents > 0 ? brand.gold : brand.navy}
            />
          </tr>
        </table>
      </Section>

      {/* This week's changes */}
      <Section style={sectionBlock}>
        <Text style={sectionTitle}>This Week</Text>
        <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
          <tr>
            <td style={metricRow}>
              <Text style={metricLabel}>New issues found</Text>
            </td>
            <td style={{ ...metricRow, textAlign: 'right' }}>
              <Text
                style={{
                  ...metricValue,
                  color: newIssuesThisWeek > 0 ? brand.red : brand.green,
                }}
              >
                {newIssuesThisWeek > 0 ? `+${newIssuesThisWeek}` : '0'}
              </Text>
            </td>
          </tr>
          <tr>
            <td style={metricRow}>
              <Text style={metricLabel}>Issues resolved</Text>
            </td>
            <td style={{ ...metricRow, textAlign: 'right' }}>
              <Text style={{ ...metricValue, color: brand.green }}>
                {resolvedThisWeek > 0 ? `${resolvedThisWeek}` : '0'}
              </Text>
            </td>
          </tr>
          <tr>
            <td style={metricRow}>
              <Text style={metricLabel}>Registry changes (deltas)</Text>
            </td>
            <td style={{ ...metricRow, textAlign: 'right' }}>
              <Text style={{ ...metricValue, color: brand.navy }}>
                {unresolvedDeltas} unresolved
              </Text>
            </td>
          </tr>
          <tr>
            <td style={metricRow}>
              <Text style={metricLabel}>Payer directory sync</Text>
            </td>
            <td style={{ ...metricRow, textAlign: 'right' }}>
              <Text style={{ ...metricValue, color: payerColor }}>{payerStatusLabel}</Text>
            </td>
          </tr>
        </table>
      </Section>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <Section style={sectionBlock}>
          <Text style={sectionTitle}>Top Issues Needing Attention</Text>
          {topIssues.slice(0, 3).map((issue, i) => {
            const sev = severityColors[issue.severity] || severityColors.info;
            return (
              <Section
                key={i}
                style={{
                  backgroundColor: sev.bg,
                  borderLeft: `3px solid ${sev.text}`,
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 8,
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
                  {issue.title}
                </Text>
                <Text
                  style={{
                    margin: '2px 0 0',
                    fontSize: 12,
                    color: brand.gray600,
                  }}
                >
                  {issue.providerName}
                </Text>
              </Section>
            );
          })}
        </Section>
      )}

      <CtaButton href={`${DASHBOARD_URL}/dashboard`}>View Full Dashboard</CtaButton>

      <Hr style={{ borderColor: brand.gray200, margin: '24px 0 16px' }} />

      <Text style={mutedText}>
        You receive this digest weekly. To adjust your notification preferences, visit{' '}
        <Link href={`${DASHBOARD_URL}/settings`} style={linkStyle}>
          Settings
        </Link>
        .
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
  margin: '0 0 12px',
};

const statsContainer: React.CSSProperties = {
  backgroundColor: brand.gray100,
  borderRadius: 10,
  padding: '20px 16px',
  margin: '20px 0',
  textAlign: 'center',
};

const sectionBlock: React.CSSProperties = {
  margin: '24px 0',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 12px',
};

const metricRow: React.CSSProperties = {
  padding: '6px 0',
  borderBottom: `1px solid ${brand.gray200}`,
};

const metricLabel: React.CSSProperties = {
  fontSize: 14,
  color: '#2D3748',
  margin: 0,
};

const metricValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  margin: 0,
};

const mutedText: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray400,
  lineHeight: '1.5',
};

const linkStyle: React.CSSProperties = {
  color: brand.blue,
  textDecoration: 'none',
};

export default WeeklyDigestEmail;
