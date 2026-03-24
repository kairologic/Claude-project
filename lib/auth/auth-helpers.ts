/**
 * lib/auth/auth-helpers.ts
 *
 * Supabase client factories for server-side and client-side usage.
 * - createAdminSupabaseClient(): Service-role client for server-side operations
 * - createBrowserSupabaseClient(): Anon-key client for browser-side auth
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminInstance: SupabaseClient | null = null;

/**
 * Server-side admin client using service role key.
 * Bypasses RLS — use only in API routes and server components.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  if (adminInstance) return adminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  adminInstance = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminInstance;
}

/**
 * Browser-side client using anon key.
 * Respects RLS. Use in client components for auth operations.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, key);
}
