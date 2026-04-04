'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Supabase automatically restores the session from the URL token
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    checkSession();
  }, [supabase.auth]);

  const validatePassword = () => {
    setValidationError('');

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Password updated successfully! Redirecting to sign-in...');

      setTimeout(() => {
        router.push('/sign-in');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

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

          <h1 className="text-2xl font-bold text-[#0F1E2E] mb-2 text-center">Set New Password</h1>
          <p className="text-gray-600 text-center text-sm mb-6">Enter your new password below</p>

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
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F1E2E] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
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
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
