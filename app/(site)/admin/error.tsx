'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Unhandled error:', error);
  }, [error]);

  const isConfigError =
    error.message?.includes('SUPABASE') ||
    error.message?.includes('Missing') ||
    error.message?.includes('credentials');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F1E2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#1a2940',
          border: '1px solid #3a4a5c',
          borderRadius: 12,
          padding: 32,
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {isConfigError ? 'Configuration Error' : 'Something went wrong'}
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          {isConfigError
            ? 'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your Vercel environment variables.'
            : error.message || 'An unexpected error occurred in the admin panel.'}
        </p>
        {error.digest && (
          <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 16 }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: '#D4A017',
              color: '#0F1E2E',
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
            href="/admin/dashboard"
            style={{
              background: 'transparent',
              color: '#D4A017',
              border: '1px solid #D4A017',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
