/**
 * app/auth/callback/route.ts
 *
 * Handles the redirect from Supabase auth emails (magic links, invites).
 * Exchanges the auth code for a session, then redirects to the appropriate page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/practice';
  const practiceId = requestUrl.searchParams.get('practice_id');
  const tokenId = requestUrl.searchParams.get('token_id');

  if (code) {
    const response = NextResponse.redirect(new URL(buildRedirect(next, practiceId, tokenId), requestUrl.origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  // If no code or exchange failed, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=auth_failed', requestUrl.origin)
  );
}

function buildRedirect(next: string, practiceId: string | null, tokenId: string | null): string {
  const params = new URLSearchParams();
  if (practiceId) params.set('practice_id', practiceId);
  if (tokenId) params.set('token_id', tokenId);
  const qs = params.toString();
  return qs ? `${next}?${qs}` : next;
}
