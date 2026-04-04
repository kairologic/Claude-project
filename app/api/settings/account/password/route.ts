import { NextRequest, NextResponse } from 'next/server';
import { withAuth, API_ERRORS } from '@/lib/api/with-auth';
import type { AuthContext } from '@/lib/api/with-auth';

/**
 * PUT /api/settings/account/password
 * Change password using Supabase auth
 * Body: { user_id, new_password }
 * Uses withAuth (user-scoped, not practice-scoped)
 */
const PUT_HANDLER = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  try {
    const body = await request.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return API_ERRORS.badRequest('Missing required fields: user_id, new_password');
    }

    if (new_password.length < 8) {
      return API_ERRORS.badRequest('Password must be at least 8 characters');
    }

    // Update password via admin API
    const { data, error } = await ctx.supabase.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      console.error('[Password PUT] Error updating password:', error);
      return API_ERRORS.internal('Failed to update password');
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('[Password PUT] Error:', error);
    return API_ERRORS.internal();
  }
});

export { PUT_HANDLER as PUT };
