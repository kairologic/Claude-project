/**
 * emails/components/layout.tsx
 *
 * Shared KairoLogic email layout — branded header, footer, and container.
 * Matches the visual identity from the printed mailer (navy header,
 * gold accent, professional footer with tagline).
 *
 * Usage:
 *   import { EmailLayout } from './components/layout';
 *   <EmailLayout previewText="...">{ body }</EmailLayout>
 */

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// ── Brand tokens (mirrored from lib/design-tokens.ts for email isolation) ──

export const brand = {
  navy: '#0F1E2E',
  navyMid: '#1A3249',
  gold: '#D4A017',
  goldLight: '#D4A574',
  goldPale: '#FDF6E3',
  gray100: '#F4F5F7',
  gray200: '#E8EAED',
  gray400: '#9AA3AE',
  gray600: '#5A6472',
  green: '#1A9E6D',
  greenPale: '#E6F7F2',
  red: '#D64545',
  redPale: '#FDEEEE',
  blue: '#185FA5',
  bluePale: '#EEF4FF',
  white: '#FFFFFF',
} as const;

export const DASHBOARD_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kairologic.net';

// ── Reusable sub-components ────────────────────────────────

/** Primary CTA button — gold background, navy text */
export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', margin: '28px 0' }}>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          backgroundColor: brand.goldLight,
          color: brand.navy,
          fontWeight: 700,
          fontSize: 14,
          padding: '14px 36px',
          borderRadius: 8,
          textDecoration: 'none',
          lineHeight: '1',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

/** Secondary CTA — navy background, white text */
export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', margin: '28px 0' }}>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          backgroundColor: brand.navy,
          color: brand.white,
          fontWeight: 600,
          fontSize: 14,
          padding: '12px 28px',
          borderRadius: 8,
          textDecoration: 'none',
          lineHeight: '1',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

/** Info card with colored left border */
export function InfoCard({
  accentColor = brand.gold,
  bgColor = brand.goldPale,
  children,
}: {
  accentColor?: string;
  bgColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Section
      style={{
        backgroundColor: bgColor,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 8,
        padding: '16px 20px',
        margin: '16px 0',
      }}
    >
      {children}
    </Section>
  );
}

/** Stat pill — large number + label */
export function StatPill({
  value,
  label,
  color = brand.navy,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <td style={{ textAlign: 'center', padding: '0 12px' }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          margin: 0,
          lineHeight: '1.2',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: brand.gray600,
          margin: 0,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </Text>
    </td>
  );
}

// ── Main layout ────────────────────────────────────────────

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* ── Header ── */}
          <Section style={headerStyle}>
            <table cellPadding="0" cellSpacing="0" role="presentation" width="100%">
              <tr>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={logoTextStyle}>KairoLogic</Text>
                </td>
                <td
                  style={{
                    verticalAlign: 'middle',
                    textAlign: 'right',
                  }}
                >
                  <Text style={headerContactStyle}>
                    kairologic.net&nbsp;&nbsp;|&nbsp;&nbsp;512.402.2237
                  </Text>
                  <Text style={headerTaglineStyle}>Provider Data Intelligence</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ── Gold accent line ── */}
          <Section
            style={{
              height: 3,
              backgroundColor: brand.goldLight,
              margin: 0,
            }}
          />

          {/* ── Body content ── */}
          <Section style={contentStyle}>{children}</Section>

          {/* ── Footer ── */}
          <Hr style={footerDividerStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              KairoLogic&nbsp;&nbsp;|&nbsp;&nbsp;
              <Link href={DASHBOARD_URL} style={footerLinkStyle}>
                kairologic.net
              </Link>
              &nbsp;&nbsp;|&nbsp;&nbsp;Provider Data Intelligence
            </Text>
            <Text style={footerMutedStyle}>
              You received this email because you are associated with a practice on KairoLogic. If
              you believe this was sent in error, please{' '}
              <Link href="mailto:support@kairologic.net" style={footerLinkStyle}>
                contact&nbsp;us
              </Link>
              .
            </Text>
            <Text style={footerMutedStyle}>
              © {new Date().getFullYear()} KairoLogic. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ─────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: '#F0F2F5',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 580,
  margin: '40px auto',
  backgroundColor: brand.white,
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: brand.navy,
  padding: '20px 28px',
};

const logoTextStyle: React.CSSProperties = {
  color: brand.goldLight,
  fontWeight: 800,
  fontSize: 20,
  letterSpacing: '0.5px',
  margin: 0,
  fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
};

const headerContactStyle: React.CSSProperties = {
  color: '#8BA3B8',
  fontSize: 11,
  fontWeight: 500,
  margin: 0,
  lineHeight: '1.4',
};

const headerTaglineStyle: React.CSSProperties = {
  color: '#8BA3B8',
  fontSize: 10,
  fontWeight: 400,
  margin: 0,
  lineHeight: '1.4',
};

const contentStyle: React.CSSProperties = {
  padding: '32px 28px 24px',
};

const footerDividerStyle: React.CSSProperties = {
  borderColor: brand.gray200,
  borderWidth: '1px 0 0 0',
  margin: '0 28px',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 28px 24px',
  textAlign: 'center',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: brand.gray600,
  margin: '0 0 8px',
};

const footerLinkStyle: React.CSSProperties = {
  color: brand.blue,
  textDecoration: 'none',
};

const footerMutedStyle: React.CSSProperties = {
  fontSize: 11,
  color: brand.gray400,
  margin: '4px 0 0',
  lineHeight: '1.5',
};

export default EmailLayout;
