'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Mail, ArrowRight, CheckCircle } from 'lucide-react';

export default function DashboardLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-display font-extrabold">
              <span className="text-white">KAIRO</span>
              <span className="text-gold">LOGIC</span>
            </h1>
          </Link>
          <p className="text-gold text-xs font-bold uppercase tracking-widest mt-1">
            Sentry Shield Dashboard
          </p>
        </div>

        {!sent ? (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <h2 className="text-xl font-bold text-white">Sign in to your dashboard</h2>
              <p className="text-slate-400 text-sm mt-2">
                Enter the email address associated with your KairoLogic account. We&apos;ll send you a secure login link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@practice-email.com"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Login Link
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-600 mt-6">
              No password needed. We&apos;ll email you a secure one-time link.
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm mb-4">
              We sent a login link to <strong className="text-white">{email}</strong>. Click the link to access your Sentry Shield dashboard.
            </p>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-xs text-slate-500 space-y-1">
              <p>• The link expires in 30 minutes</p>
              <p>• Check your spam folder if you don&apos;t see it</p>
              <p>• The email comes from compliance@kairologic.com</p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-gold text-sm font-semibold mt-6 hover:underline"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-6">
          Don&apos;t have an account? <Link href="/scan" className="text-gold hover:underline">Run a free scan</Link> to get started.
        </p>
      </div>
    </div>
  );
}
