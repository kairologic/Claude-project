'use client';

import { useEffect } from 'react';
import { colors, typography, spacing, shadows, radii } from '@/lib/design-tokens';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.gray50,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          background: colors.white,
          borderRadius: radii.xl,
          padding: spacing['4xl'],
          boxShadow: shadows.lg,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: spacing.lg }}>⚠️</div>
        <h1
          style={{
            ...typography.h2,
            color: colors.navy,
            marginBottom: spacing.md,
          }}
        >
          Dashboard Error
        </h1>
        <p
          style={{
            ...typography.bodySmall,
            color: colors.gold,
            marginBottom: spacing.lg,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          KairoLogic
        </p>
        <p
          style={{
            ...typography.body,
            color: colors.gray600,
            marginBottom: spacing['2xl'],
            lineHeight: 1.6,
          }}
        >
          We encountered an issue in your dashboard. This has been logged and our team will
          investigate. Please try again, or return to the practice selector to continue.
        </p>
        {error.digest && (
          <p
            style={{
              ...typography.mono,
              color: colors.gray400,
              marginBottom: spacing.lg,
              wordBreak: 'break-all',
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: spacing.xl,
          }}
        >
          <button
            onClick={reset}
            style={{
              ...typography.body,
              fontWeight: 600,
              background: colors.navy,
              color: colors.white,
              border: 'none',
              borderRadius: radii.md,
              padding: `${spacing.sm}px ${spacing.xl}px`,
              cursor: 'pointer',
              transition: `opacity 0.2s`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              ...typography.body,
              fontWeight: 600,
              color: colors.navy,
              textDecoration: 'none',
              padding: `${spacing.sm}px ${spacing.xl}px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.gray200}`,
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: `border-color 0.2s`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = colors.navy;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = colors.gray200;
            }}
          >
            Practice selector
          </a>
        </div>
        <div
          style={{
            borderTop: `1px solid ${colors.gray200}`,
            paddingTop: spacing.lg,
          }}
        >
          <a
            href="https://support.kairologic.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...typography.body,
              color: colors.blue,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: `opacity 0.2s`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Report this issue
          </a>
        </div>
      </div>
    </div>
  );
}
