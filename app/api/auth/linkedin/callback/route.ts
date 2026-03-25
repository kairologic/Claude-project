import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Verify state matches cookie (CSRF protection)
  const storedState = req.cookies.get('linkedin_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=invalid_state', req.url));
  }

  if (error || !code) {
    return NextResponse.redirect(new URL(`/admin/content-studio?linkedin_error=${error || 'no_code'}`, req.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://kairologic.net/api/auth/linkedin/callback',
        client_id: process.env.LINKEDIN_CLIENT_ID || '86mkxkw2wt1ped',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('LinkedIn token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=token_failed', req.url));
    }

    // Get LinkedIn profile via OpenID userinfo endpoint
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.sub) {
      console.error('LinkedIn profile fetch failed:', profile);
      return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=profile_failed', req.url));
    }

    // Store in database
    const supabase = createAdminSupabaseClient();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const refreshExpiresAt = tokenData.refresh_token_expires_in
      ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000)
      : null;

    // Use a fixed admin user ID for now
    const userId = '2c2dc7ff-5fd5-4b20-9715-b051275e3e22';

    const { error: upsertError } = await supabase.from('linkedin_connections').upsert(
      {
        user_id: userId,
        linkedin_person_id: profile.sub,
        linkedin_name: profile.name,
        linkedin_email: profile.email,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
        refresh_token: tokenData.refresh_token || null,
        refresh_token_expires_at: refreshExpiresAt?.toISOString() || null,
        scopes: tokenData.scope?.split(' ') || [],
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      console.error('LinkedIn connection save failed:', upsertError);
      return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=save_failed', req.url));
    }

    // Clear state cookie and redirect back to Content Studio
    const response = NextResponse.redirect(
      new URL('/admin/content-studio?linkedin=connected', req.url)
    );
    response.cookies.delete('linkedin_oauth_state');
    return response;
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err);
    return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=unexpected', req.url));
  }
}
