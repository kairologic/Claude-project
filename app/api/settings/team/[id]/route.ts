import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/settings/team/[id]
 * Remove team member (delete from practice_team_members)
 */
export async function DELETE(
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

    // Verify team member exists
    const { data: existing } = await supabase
      .from('practice_team_members')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Delete team member
    const { error } = await supabase
      .from('practice_team_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Team DELETE] Error deleting team member:', error);
      return NextResponse.json(
        { error: 'Failed to delete team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Team member removed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Team DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/team/[id]
 * Update role
 * Body: { role }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing team member ID' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Missing role in request body' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, editor, or viewer' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify team member exists
    const { data: existing } = await supabase
      .from('practice_team_members')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Update role
    const { data, error } = await supabase
      .from('practice_team_members')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Team PATCH] Error updating role:', error);
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Team PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
