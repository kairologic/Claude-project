import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/settings/team/[id]/resend
 * Resend invite by calling supabase.auth.admin.inviteUserByEmail again
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing team member ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Fetch team member
    const { data: teamMember, error: fetchError } = await supabase
      .from('practice_team_members')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !teamMember) {
      console.error('[Team Resend POST] Error fetching team member:', fetchError);
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Only resend if still pending
    if (teamMember.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only resend invites for pending team members' },
        { status: 400 }
      );
    }

    // Resend invitation email via Supabase Auth
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/complete-invite?token={token}`;

      await supabase.auth.admin.inviteUserByEmail(teamMember.email, {
        redirectTo,
        data: {
          practice_id: teamMember.practice_id,
          role: teamMember.role,
          team_member_id: teamMember.id,
        },
      });
    } catch (inviteError) {
      console.error('[Team Resend POST] Error sending invite:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send invitation' },
        { status: 500 }
      );
    }

    // Update invited_at timestamp
    const { error: updateError } = await supabase
      .from('practice_team_members')
      .update({
        invited_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Team Resend POST] Error updating invited_at:', updateError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation resent successfully'
      }
    );
  } catch (error) {
    console.error('[Team Resend POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
