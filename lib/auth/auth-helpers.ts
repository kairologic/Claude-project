/**
 * lib/auth/auth-helpers.ts
 *
 * Server-side auth utilities. Only import in Server Components,
 * Route Handlers, and Middleware. NOT in 'use client' files.
 *
 * For client components, use: import { createBrowserSupabaseClient } from '@/lib/auth/auth-client'
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { PracticeRole } from '../types/dashboard-schema';

/** Server-side Supabase client */
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
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
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

export async function linkUserToPractice(
  userId: string, practiceId: string,
  role: PracticeRole = 'admin', isPrimary = false, invitedBy?: string
) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('practice_users')
    .upsert({
      user_id: userId, practice_id: practiceId, role, is_primary: isPrimary,
      invited_by: invitedBy || null,
      invited_at: invitedBy ? new Date().toISOString() : null,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'practice_id,user_id' })
    .select().single();
  if (error) throw new Error(`Failed to link user to practice: ${error.message}`);
  return data;
}

export async function getUserPractices(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('practice_users')
    .select(`practice_id, role, is_primary, joined_at,
      practice_websites!inner (id, practice_name, city, state, provider_count, mismatch_count)`)
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });
  if (error) throw new Error(`Failed to fetch user practices: ${error.message}`);
  return data;
}

export async function checkPracticeAccess(userId: string, practiceId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from('practice_users').select('id, role')
    .eq('user_id', userId).eq('practice_id', practiceId).single();
  return data || null;
}

export async function validatePreviewToken(token: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from('preview_tokens')
    .select(`*, practice_websites!inner (id, practice_name, npi, city, state, provider_count, mismatch_count)`)
    .eq('token', token).single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  await admin.from('preview_tokens').update({
    view_count: (data.view_count || 0) + 1,
    last_viewed_at: new Date().toISOString(),
    first_viewed_at: data.first_viewed_at || new Date().toISOString(),
  }).eq('id', data.id);
  return data;
}

export async function markTokenClaimed(tokenId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  await admin.from('preview_tokens').update({
    is_claimed: true, claimed_at: new Date().toISOString(),
    claimed_by: userId, is_used: true, used_at: new Date().toISOString(),
  }).eq('id', tokenId);
}

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const practices = await getUserPractices(user.id);
  return { user, practices, primaryPractice: practices?.[0] || null };
}
