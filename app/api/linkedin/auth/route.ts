import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID || '86mkxkw2wt1ped';

  const redirectUri = encodeURIComponent('https://kairologic.net/api/auth/linkedin/callback');
  const scope = encodeURIComponent('openid profile email w_member_social');
  const state = crypto.randomUUID();

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

  const response = NextResponse.redirect(url);
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
