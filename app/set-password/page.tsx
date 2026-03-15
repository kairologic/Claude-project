/**
 * app/set-password/page.tsx
 *
 * After clicking the verification email link, user sets their password.
 * This page:
 *   1. Shows "Email verified" confirmation
 *   2. Shows practice name for context
 *   3. Password + confirm password form
 *   4. On submit: sets password, links user to practice, redirects to dashboard
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practiceId = searchParams.get('practice_id');
  const tokenId = searchParams.get('token_id');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [practiceName, setPracticeName] = useState('');

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Get current user (should be authenticated via magic link)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?error=session_expired');
        return;
      }
      setUserEmail(user.email || '');

      // Fetch practice name for context
      if (practiceId) {
        const { data } = await supabase
          .from('practice_websites')
          .select('practice_name')
          .eq('id', practiceId)
          .single();
        if (data) setPracticeName(data.practice_name);
      }
    }
    init();
  }, []);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');

    try {
      // 1. Set the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // 2. Link user to practice
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session lost');

      if (practiceId) {
        const response = await fetch('/api/finalize-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            practice_id: practiceId,
            token_id: tokenId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to link practice');
        }
      }

      // 3. Redirect to dashboard
      router.push(practiceId ? `/practice/${practiceId}` : '/practice');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={{ color: '#0F1E2E' }}>Kairo</span>
          <span style={{ color: '#D4A017' }}>Logic</span>
        </div>

        {/* Verified badge */}
        <div style={styles.verified}>
          <span style={styles.verifiedIcon}>✓</span>
          <span>Email verified — {userEmail}</span>
        </div>

        {/* Context */}
        {practiceName && (
          <p style={styles.context}>
            This secures your dashboard for <strong>{practiceName}</strong>
          </p>
        )}

        <h1 style={styles.title}>Set your password</h1>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Min 8 characters"
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Re-enter password"
            />
          </div>

          {/* Requirements */}
          <div style={styles.requirements}>
            <Requirement met={hasMinLength} text="At least 8 characters" />
            <Requirement met={hasUppercase} text="One uppercase letter" />
            <Requirement met={hasNumber} text="One number" />
            <Requirement met={passwordsMatch} text="Passwords match" />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              ...styles.button,
              opacity: isValid && !loading ? 1 : 0.5,
              cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Setting up...' : 'Launch your dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: met ? '#1A9E6D' : '#9AA3AE' }}>
      <span style={{ fontSize: 10 }}>{met ? '✓' : '○'}</span>
      {text}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#FAFAFA', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 420,
    border: '1px solid #E8EAED', boxShadow: '0 4px 24px rgba(0,0,0,.06)',
  },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 },
  verified: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
    background: '#E6F7F2', color: '#1A9E6D', fontSize: 13, fontWeight: 600, marginBottom: 16,
  },
  verifiedIcon: {
    width: 20, height: 20, borderRadius: '50%', background: '#1A9E6D', color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
  },
  context: { fontSize: 13, color: '#5A6472', marginBottom: 20, lineHeight: 1.5 },
  title: { fontSize: 18, fontWeight: 800, color: '#0F1E2E', marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6472', marginBottom: 4 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8EAED',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#0F1E2E',
    boxSizing: 'border-box' as const,
  },
  requirements: {
    display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 16, padding: '8px 0',
  },
  error: {
    padding: '10px 14px', borderRadius: 8, background: '#FDEEEE', color: '#D64545',
    fontSize: 12, fontWeight: 600, marginBottom: 14,
  },
  button: {
    width: '100%', padding: '12px', background: '#0F1E2E', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
    transition: 'all .15s',
  },
};
