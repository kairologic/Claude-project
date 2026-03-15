/**
 * app/api/claim/route.ts
 *
 * POST: Practice manager enters email on preview page.
 * Sends magic link, stores claim intent in preview_tokens.
 *
 * Body: { email: string, token: string }
 * - token: the preview token from the URL
 * - email: practice manager's email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, validatePreviewToken } from '@/lib/auth/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Validate the preview token
    const tokenData = await validatePreviewToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired preview link' },
        { status: 400 }
      );
    }

    // Check if already claimed
    if (tokenData.is_claimed) {
      return NextResponse.json(
        { error: 'This practice has already been claimed. Please log in instead.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const practiceId = tokenData.practice_website_id;
    const practiceName = tokenData.practice_websites?.practice_name || 'your practice';

    // Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User exists — check if already linked to this practice
      const { data: existingLink } = await admin
        .from('practice_users')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('practice_id', practiceId)
        .single();

      if (existingLink) {
        return NextResponse.json(
          { error: 'This email is already associated with this practice. Please log in.' },
          { status: 400 }
        );
      }

      // Existing user, new practice — send magic link
      const { error: otpError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/set-password&practice_id=${practiceId}&token_id=${tokenData.id}`,
        },
      });

      if (otpError) {
        console.error('Magic link error:', otpError);
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // New user — invite via email
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/set-password&practice_id=${practiceId}&token_id=${tokenData.id}`,
        data: {
          practice_id: practiceId,
          practice_name: practiceName,
          claim_token_id: tokenData.id,
        },
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Update token with email
    await admin
      .from('preview_tokens')
      .update({ email })
      .eq('id', tokenData.id);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      practice_name: practiceName,
    });
  } catch (err: any) {
    console.error('Claim error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
