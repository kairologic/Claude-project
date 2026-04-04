'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { Mail, Lock } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError('Sign in failed');
        setIsLoading(false);
        return;
      }

      // Look up practice_team_members to get practice_id
      const { data: teamMembers, error: lookupError } = await supabase
        .from('practice_team_members')
        .select('practice_id')
        .eq('user_id', data.user.id)
        .single();

      if (lookupError || !teamMembers) {
        setError('Could not find associated practice');
        setIsLoading(false);
        return;
      }

      // Redirect to practice dashboard
      router.push(`/practice/${teamMembers.practice_id}`);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://kairologic.net/auth/reset-password',
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
        return;
      }

      setResetMessage('Password reset email sent! Check your inbox.');
      setResetEmail('');
    } catch (err) {
      setError('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1E2E] flex items-center justify-center px-4 py-12">
      {/* Header spacing */}
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block text-3xl font-bold tracking-tight">
              <span className="text-[#0F1E2E]">Kairo</span>
              <span className="text-[#D4A017]">Logic</span>
            </div>
          </div>

          {!showResetForm ? (
            <>
              {/* Sign In Form */}
              <h1 className="text-2xl font-bold text-[#0F1E2E] mb-6 text-center">Sign In</h1>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F1E2E] mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F1E2E] mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#D4A017] hover:bg-[#C49013] text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowResetForm(true)}
                  className="text-[#D4A017] hover:text-[#C49013] text-sm font-medium transition"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Password Reset Form */}
              <h1 className="text-2xl font-bold text-[#0F1E2E] mb-6 text-center">Reset Password</h1>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F1E2E] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D4A017] hover:bg-[#C49013] text-white font-semibold py-2 px-4 rounded-md transition"
                >
                  Send Reset Email
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowResetForm(false);
                    setError('');
                    setResetMessage('');
                  }}
                  className="text-[#D4A017] hover:text-[#C49013] text-sm font-medium transition"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
