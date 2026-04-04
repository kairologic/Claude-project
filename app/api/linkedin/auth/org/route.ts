import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINKEDIN_ORG_CLIENT_ID || '86e4trpqib1zjv';

  const redirectUri = encodeURIComponent('https://kairologic.net/api/auth/linkedin/org/callback');
  const scope = encodeURIComponent('w_organization_social r_organization_social');
  const state = crypto.randomUUID();

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

  const response = NextResponse.redirect(url);
  response.cookies.set('linkedin_org_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
