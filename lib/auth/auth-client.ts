/**
 * lib/auth/auth-client.ts
 *
 * Browser-side auth utilities. Safe to import in 'use client' components.
 */

import { createBrowserClient } from '@supabase/ssr';

/** Browser-side Supabase client (for use in Client Components) */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
