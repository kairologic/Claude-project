'use client';

import { useEffect } from 'react';
import { colors, typography, spacing, shadows, radii } from '@/lib/design-tokens';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
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
            marginBottom: spacing.sm,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            ...typography.body,
            color: colors.gray600,
            marginBottom: spacing['2xl'],
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Our team has been notified. Please try again or contact
          support if the issue persists.
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
            href="/"
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
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
