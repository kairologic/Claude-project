'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { User, Lock, CheckCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Supabase automatically creates auth.users record from invite token
    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session?.user) {
          setError('Invalid or expired invite link. Please request a new invitation.');
          setIsInitializing(false);
          return;
        }

        // Get team_member_id from user metadata
        const tmId = data.session.user.user_metadata?.team_member_id;
        if (!tmId) {
          setError('Team member information not found in invitation.');
          setIsInitializing(false);
          return;
        }

        setTeamMemberId(tmId);
        setIsInitializing(false);
      } catch (err) {
        setError('Failed to process invitation');
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [supabase.auth]);

  const validateForm = () => {
    setValidationError('');

    if (!displayName.trim()) {
      setValidationError('Display name is required');
      return false;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleCompleteInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        setError(passwordError.message || 'Failed to set password');
        setIsLoading(false);
        return;
      }

      // Call API to complete invite and set display name
      const response = await fetch('/api/auth/complete-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName,
          team_member_id: teamMemberId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to complete invitation');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Welcome to KairoLogic! Redirecting to dashboard...');

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0F1E2E] flex items-center justify-center px-4">
        <div className="text-white text-center">
          <p className="mb-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1E2E] flex items-center justify-center px-4 py-12">
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

          <h1 className="text-2xl font-bold text-[#0F1E2E] mb-2 text-center">
            Welcome to KairoLogic
          </h1>
          <p className="text-gray-600 text-center text-sm mb-6">
            Complete your account setup
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm flex items-center gap-2">
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleCompleteInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F1E2E] mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F1E2E] mb-2">
                  Password
                </label>
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
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F1E2E] mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              {validationError && (
                <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                  {validationError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#D4A017] hover:bg-[#C49013] text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
