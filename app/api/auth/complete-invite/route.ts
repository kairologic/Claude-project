import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * POST /api/auth/complete-invite
 * Accept invite — updates practice_team_members: status='active', accepted_at=now(), user_id, display_name
 * Body: { token, user_id, display_name }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, user_id, display_name } = body;

    if (!token || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: token, user_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify the token (optional - depends on your invite token structure)
    // For now, we'll just verify the user exists in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);

    if (authError || !authUser) {
      console.error('[Complete Invite POST] Error fetching user:', authError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find team member by email and update status
    const userEmail = authUser.user.email;

    const { data: teamMember, error: findError } = await supabase
      .from('practice_team_members')
      .select('*')
      .eq('email', userEmail)
      .eq('status', 'pending')
      .single();

    if (findError) {
      console.error('[Complete Invite POST] Error finding team member:', findError);
      return NextResponse.json(
        { error: 'Invite not found or already accepted' },
        { status: 404 }
      );
    }

    // Update team member to active
    const { data: updated, error: updateError } = await supabase
      .from('practice_team_members')
      .update({
        status: 'active',
        user_id,
        display_name: display_name || userEmail,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', teamMember.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Complete Invite POST] Error updating team member:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept invite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite accepted successfully',
      team_member: updated,
    });
  } catch (error) {
    console.error('[Complete Invite POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
