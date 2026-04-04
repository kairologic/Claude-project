'use client';

import { useEffect } from 'react';

export default function PracticeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Practice] Unhandled error:', error);
  }, [error]);

  const isConfigError =
    error.message?.includes('SUPABASE') ||
    error.message?.includes('Missing') ||
    error.message?.includes('credentials');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 32,
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#0F1E2E', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {isConfigError ? 'Configuration Error' : 'Something went wrong'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          {isConfigError
            ? 'A server configuration issue prevented this page from loading. Please contact support.'
            : error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 16 }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: '#0F1E2E',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
