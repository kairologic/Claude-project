import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

const KAIROLOGIC_ORG_ID = '112393033';
const KAIROLOGIC_ORG_NAME = 'KairoLogic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Verify state matches cookie (CSRF protection)
  const storedState = req.cookies.get('linkedin_org_oauth_state')?.value;
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
        redirect_uri: 'https://kairologic.net/api/auth/linkedin/org/callback',
        client_id: process.env.LINKEDIN_ORG_CLIENT_ID || '86e4trpqib1zjv',
        client_secret: process.env.LINKEDIN_ORG_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('LinkedIn org token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=token_failed', req.url));
    }

    // Get the authorizing user's profile for reference
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    // Store in database as organization connection
    const supabase = createAdminSupabaseClient();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const refreshExpiresAt = tokenData.refresh_token_expires_in
      ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000)
      : null;

    // Use the same fixed admin user ID
    const userId = '2c2dc7ff-5fd5-4b20-9715-b051275e3e22';

    const { error: upsertError } = await supabase.from('linkedin_connections').upsert(
      {
        user_id: userId,
        account_type: 'organization',
        organization_id: KAIROLOGIC_ORG_ID,
        organization_name: KAIROLOGIC_ORG_NAME,
        linkedin_person_id: profile.sub || 'org_admin',
        linkedin_name: KAIROLOGIC_ORG_NAME,
        linkedin_email: profile.email || null,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
        refresh_token: tokenData.refresh_token || null,
        refresh_token_expires_at: refreshExpiresAt?.toISOString() || null,
        scopes: tokenData.scope?.split(' ') || [],
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,account_type' }
    );

    if (upsertError) {
      console.error('LinkedIn org connection save failed:', upsertError);
      return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=save_failed', req.url));
    }

    // Clear state cookie and redirect back
    const response = NextResponse.redirect(
      new URL('/admin/content-studio?linkedin=org_connected', req.url)
    );
    response.cookies.delete('linkedin_org_oauth_state');
    return response;
  } catch (err) {
    console.error('LinkedIn org OAuth callback error:', err);
    return NextResponse.redirect(new URL('/admin/content-studio?linkedin_error=unexpected', req.url));
  }
}
