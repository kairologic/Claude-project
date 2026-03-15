/**
 * app/login/page.tsx
 *
 * Returning user login with email + password.
 * Redirects to dashboard on success.
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-helpers';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/practice';
  const authError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    authError === 'auth_failed' ? 'Your verification link has expired. Please try again.' :
    authError === 'session_expired' ? 'Your session has expired. Please log in again.' : ''
  );
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createBrowserSupabaseClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address first');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/set-password`,
    });

    if (resetError) {
      setError('Failed to send reset email');
    } else {
      setResetSent(true);
      setError('');
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={{ color: '#0F1E2E' }}>Kairo</span>
          <span style={{ color: '#D4A017' }}>Logic</span>
        </div>

        <h1 style={styles.title}>
          {showReset ? 'Reset your password' : 'Sign in to your dashboard'}
        </h1>

        {resetSent ? (
          <div style={styles.success}>
            <span style={{ fontWeight: 700 }}>Check your email</span>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={showReset ? handleReset : handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.input}
                placeholder="you@practice.com"
                autoFocus
                required
              />
            </div>

            {!showReset && (
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Your password"
                  required
                />
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Please wait...' : showReset ? 'Send reset link' : 'Sign in'}
            </button>
          </form>
        )}

        {/* Toggle between login and reset */}
        <div style={styles.footer}>
          {showReset ? (
            <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} style={styles.link}>
              ← Back to sign in
            </button>
          ) : (
            <button onClick={() => { setShowReset(true); setError(''); }} style={styles.link}>
              Forgot your password?
            </button>
          )}
        </div>

        <div style={styles.divider} />

        <p style={styles.helpText}>
          Don't have an account? Check your email for a KairoLogic invitation, or contact your practice administrator.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#FAFAFA', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 400,
    border: '1px solid #E8EAED', boxShadow: '0 4px 24px rgba(0,0,0,.06)',
  },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 800, color: '#0F1E2E', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6472', marginBottom: 4 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8EAED',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#0F1E2E',
    boxSizing: 'border-box' as const,
  },
  error: {
    padding: '10px 14px', borderRadius: 8, background: '#FDEEEE', color: '#D64545',
    fontSize: 12, fontWeight: 600, marginBottom: 14,
  },
  success: {
    padding: '14px', borderRadius: 8, background: '#E6F7F2', color: '#1A9E6D',
    fontSize: 13, marginBottom: 14,
  },
  button: {
    width: '100%', padding: '12px', background: '#0F1E2E', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all .15s',
  },
  footer: { textAlign: 'center' as const, marginTop: 14 },
  link: {
    background: 'none', border: 'none', color: '#185FA5', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  divider: { height: 1, background: '#E8EAED', margin: '20px 0' },
  helpText: { fontSize: 12, color: '#9AA3AE', textAlign: 'center' as const, lineHeight: 1.5 },
};
