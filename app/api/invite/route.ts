/**
 * app/api/invite/route.ts
 *
 * POST: Admin invites a team member to their practice.
 *
 * Body: { email: string, role: 'admin' | 'viewer', practice_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  checkPracticeAccess,
} from '@/lib/auth/auth-helpers';
import type { PracticeRole } from '@/lib/types/dashboard-schema';

export async function POST(request: NextRequest) {
  try {
    const { email, role, practice_id } = await request.json();

    if (!email || !role || !practice_id) {
      return NextResponse.json(
        { error: 'email, role, and practice_id are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be admin or viewer' },
        { status: 400 }
      );
    }

    // Verify the requesting user is an admin of this practice
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const access = await checkPracticeAccess(user.id, practice_id);
    if (!access || access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only practice admins can invite team members' },
        { status: 403 }
      );
    }

    const admin = createAdminSupabaseClient();

    // Get practice name for the invite email
    const { data: practice } = await admin
      .from('practice_websites')
      .select('practice_name')
      .eq('id', practice_id)
      .single();

    const practiceName = practice?.practice_name || 'a practice';
    const inviterName = user.user_metadata?.name || user.email || 'A team member';

    // Send invite
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/set-password&practice_id=${practice_id}`,
        data: {
          practice_id,
          practice_name: practiceName,
          invited_by_name: inviterName,
          assigned_role: role,
        },
      }
    );

    if (inviteError) {
      // User might already exist
      if (inviteError.message.includes('already been registered')) {
        // Check if already linked
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          u => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          const existingAccess = await checkPracticeAccess(existingUser.id, practice_id);
          if (existingAccess) {
            return NextResponse.json(
              { error: 'This user already has access to this practice' },
              { status: 400 }
            );
          }

          // Link existing user with invited role
          await admin.from('practice_users').insert({
            user_id: existingUser.id,
            practice_id,
            role: role as PracticeRole,
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
            is_primary: false,
          });

          return NextResponse.json({
            success: true,
            message: `${email} has been added to ${practiceName} as ${role}`,
            already_registered: true,
          });
        }
      }

      console.error('Invite error:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send invite. Please try again.' },
        { status: 500 }
      );
    }

    // Store the invite intent so finalize-claim knows the role
    if (inviteData?.user) {
      await admin.from('practice_users').insert({
        user_id: inviteData.user.id,
        practice_id,
        role: role as PracticeRole,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        is_primary: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
    });
  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
