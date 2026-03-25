import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = encodeURIComponent('https://kairologic.net/api/linkedin/callback');
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
