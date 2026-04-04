import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * POST /api/settings/team/invite
 * Create practice_team_members record (status='pending'), then invite via auth
 * Body: { practice_id, email, role, invited_by }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { practice_id, email, role, invited_by } = body;

    if (!practice_id || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, email, role' },
        { status: 400 },
      );
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, editor, or viewer' },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();

    // Check if team member already exists
    const { data: existing } = await supabase
      .from('practice_team_members')
      .select('id')
      .eq('practice_id', practice_id)
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Team member already exists for this practice' },
        { status: 409 },
      );
    }

    // Create team member record with pending status
    const { data: teamMember, error: teamError } = await supabase
      .from('practice_team_members')
      .insert({
        practice_id,
        email,
        role,
        status: 'pending',
        invited_by: invited_by || null,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (teamError) {
      console.error('[Team Invite POST] Error creating team member:', teamError);
      return NextResponse.json({ error: 'Failed to create team member record' }, { status: 500 });
    }

    // Send invitation email via Supabase Auth
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/complete-invite?token={token}`;

      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          practice_id,
          role,
          team_member_id: teamMember.id,
        },
      });
    } catch (inviteError) {
      console.error('[Team Invite POST] Error sending invite:', inviteError);
      // Continue anyway - team member record is created
    }

    return NextResponse.json(
      {
        success: true,
        team_member: teamMember,
        message: 'Invitation sent successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Team Invite POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
