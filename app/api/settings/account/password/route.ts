import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * PUT /api/settings/account/password
 * Change password using Supabase auth
 * Body: { user_id, new_password }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, new_password' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Update password via admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (error) {
      console.error('[Password PUT] Error updating password:', error);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('[Password PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
