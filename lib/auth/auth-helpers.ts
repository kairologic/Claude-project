/**
 * lib/auth/auth-helpers.ts
 *
 * Shared auth utilities for the KairoLogic dashboard.
 * Handles Supabase client creation, user-practice association,
 * and auth state management.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { PracticeRole } from '../types/dashboard-schema';

// ─── Client Creation ──────────────────────────────────────────────────────────

/** Browser-side Supabase client (for use in Client Components) */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Server-side Supabase client (for use in Server Components, Route Handlers, Middleware) */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/** Admin Supabase client (service role, bypasses RLS) */
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── User-Practice Association ────────────────────────────────────────────────

/**
 * Link a user to a practice with a role.
 * Uses admin client to bypass RLS (needed during claim/invite flow).
 */
export async function linkUserToPractice(
  userId: string,
  practiceId: string,
  role: PracticeRole = 'admin',
  isPrimary: boolean = false,
  invitedBy?: string
) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from('practice_users')
    .upsert(
      {
        user_id: userId,
        practice_id: practiceId,
        role,
        is_primary: isPrimary,
        invited_by: invitedBy || null,
        invited_at: invitedBy ? new Date().toISOString() : null,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'practice_id,user_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to link user to practice: ${error.message}`);
  return data;
}

/**
 * Get all practices a user has access to.
 */
export async function getUserPractices(userId: string) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from('practice_users')
    .select(`
      practice_id,
      role,
      is_primary,
      joined_at,
      practice_websites!inner (
        id,
        practice_name,
        city,
        state,
        provider_count,
        mismatch_count
      )
    `)
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });

  if (error) throw new Error(`Failed to fetch user practices: ${error.message}`);
  return data;
}

/**
 * Check if a user has access to a specific practice.
 */
export async function checkPracticeAccess(userId: string, practiceId: string) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from('practice_users')
    .select('id, role')
    .eq('user_id', userId)
    .eq('practice_id', practiceId)
    .single();

  if (error || !data) return null;
  return data;
}

// ─── Preview Token Helpers ────────────────────────────────────────────────────

/**
 * Validate a preview token and return practice data.
 */
export async function validatePreviewToken(token: string) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from('preview_tokens')
    .select(`
      *,
      practice_websites!inner (
        id,
        practice_name,
        npi,
        city,
        state,
        provider_count,
        mismatch_count
      )
    `)
    .eq('token', token)
    .single();

  if (error || !data) return null;

  // Check expiry
  if (new Date(data.expires_at) < new Date()) return null;

  // Update view tracking
  await admin
    .from('preview_tokens')
    .update({
      view_count: (data.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
      first_viewed_at: data.first_viewed_at || new Date().toISOString(),
    })
    .eq('id', data.id);

  return data;
}

/**
 * Mark a preview token as claimed.
 */
export async function markTokenClaimed(tokenId: string, userId: string) {
  const admin = createAdminSupabaseClient();

  await admin
    .from('preview_tokens')
    .update({
      is_claimed: true,
      claimed_at: new Date().toISOString(),
      claimed_by: userId,
      is_used: true,
      used_at: new Date().toISOString(),
    })
    .eq('id', tokenId);
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

/**
 * Get the current authenticated user and their primary practice.
 * For use in server components / route handlers.
 */
export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Get their practices
  const practices = await getUserPractices(user.id);

  return {
    user,
    practices,
    primaryPractice: practices?.[0] || null,
  };
}
