/**
 * app/api/invite/route.ts
 *
 * POST: Admin invites a team member to their practice.
 *
 * Body: { email: string, role: 'admin' | 'viewer' | 'editor', practice_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withAdminAccess,
  API_ERRORS,
  parseBody,
} from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';
import {
  createAdminSupabaseClient,
} from '@/lib/auth/auth-helpers';
import { inviteSchema } from '@/lib/api/validation-schemas';
import type { PracticeRole } from '@/lib/types/dashboard-schema';

const POST_HANDLER = withAdminAccess(
  async (request: NextRequest, ctx: PracticeContext) => {
    try {
      // Validate request body
      const parsed = await parseBody(request, inviteSchema);
      if ('error' in parsed) return parsed.error;
      const { email, role, practice_id } = parsed.data;

      // Verify practice_id matches the context practice
      if (practice_id !== ctx.practiceId) {
        return API_ERRORS.forbidden('Cannot invite to a different practice');
      }

      const admin = createAdminSupabaseClient();

      // Get practice name for the invite email
      const { data: practice } = await admin
        .from('practice_websites')
        .select('name')
        .eq('id', ctx.practiceId)
        .single();

      const practiceName = practice?.name || 'a practice';
      const inviterName = (ctx.user as any).user_metadata?.name || ctx.user.email || 'A team member';

      // Send invite
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/set-password&practice_id=${ctx.practiceId}`,
          data: {
            practice_id: ctx.practiceId,
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
            // Check if user already has access to this practice
            const { data: existingPracticeUser } = await admin
              .from('practice_users')
              .select('id')
              .eq('user_id', existingUser.id)
              .eq('practice_id', ctx.practiceId)
              .single();

            if (existingPracticeUser) {
              return API_ERRORS.badRequest('This user already has access to this practice');
            }

            // Link existing user with invited role
            await admin.from('practice_users').insert({
              user_id: existingUser.id,
              practice_id: ctx.practiceId,
              role: role as PracticeRole,
              invited_by: ctx.user.id,
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
        return API_ERRORS.internal('Failed to send invite. Please try again.');
      }

      // Store the invite intent so finalize-claim knows the role
      if (inviteData?.user) {
        await admin.from('practice_users').insert({
          user_id: inviteData.user.id,
          practice_id: ctx.practiceId,
          role: role as PracticeRole,
          invited_by: ctx.user.id,
          invited_at: new Date().toISOString(),
          is_primary: false,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Invitation sent to ${email}`,
      });
    } catch (err: any) {
      console.error('[Invite] Error:', err);
      return API_ERRORS.internal(err.message || 'Failed to send invite');
    }
  }
);

export { POST_HANDLER as POST };
