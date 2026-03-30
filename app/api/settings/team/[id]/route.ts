import { NextRequest, NextResponse } from 'next/server';
import {
  withAuth,
  API_ERRORS,
  isValidUUID,
} from '@/lib/api/with-auth';
import { checkPracticeAccess } from '@/lib/auth/auth-helpers';
import type { AuthContext } from '@/lib/api/with-auth';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/settings/team/[id]
 * Remove team member (delete from practice_team_members)
 * Uses withAuth + manual practice access check (fetches practice_id from team member record)
 */
const DELETE_HANDLER = withAuth(
  async (request: NextRequest, ctx: AuthContext, params?: any) => {
    try {
      const resolvedParams = params?.params instanceof Promise ? await params.params : params?.params;
      const { id } = resolvedParams || {};

      if (!id) {
        return API_ERRORS.badRequest('Missing team member ID');
      }

      // Fetch team member to get practice_id
      const { data: existing } = await ctx.supabase
        .from('practice_team_members')
        .select('id, practice_id')
        .eq('id', id)
        .single();

      if (!existing) {
        return API_ERRORS.notFound('Team member');
      }

      // Verify user has admin access to this practice
      const practiceId = existing.practice_id;
      const access = await checkPracticeAccess(ctx.user.id, practiceId);

      if (!access || access.role !== 'admin') {
        return API_ERRORS.forbidden('You do not have permission to delete this team member');
      }

      // Delete team member
      const { error } = await ctx.supabase
        .from('practice_team_members')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Team DELETE] Error deleting team member:', error);
        return API_ERRORS.internal('Failed to delete team member');
      }

      return NextResponse.json(
        { success: true, message: 'Team member removed' },
        { status: 200 }
      );
    } catch (error) {
      console.error('[Team DELETE] Error:', error);
      return API_ERRORS.internal();
    }
  }
);

/**
 * PATCH /api/settings/team/[id]
 * Update role
 * Body: { role }
 * Uses withAuth + manual practice access check (fetches practice_id from team member record)
 */
const PATCH_HANDLER = withAuth(
  async (request: NextRequest, ctx: AuthContext, params?: any) => {
    try {
      const resolvedParams = params?.params instanceof Promise ? await params.params : params?.params;
      const { id } = resolvedParams || {};
      const body = await request.json();
      const { role } = body;

      if (!id) {
        return API_ERRORS.badRequest('Missing team member ID');
      }

      if (!role) {
        return API_ERRORS.badRequest('Missing role in request body');
      }

      // Validate role
      if (!['admin', 'editor', 'viewer'].includes(role)) {
        return API_ERRORS.badRequest('Invalid role. Must be: admin, editor, or viewer');
      }

      // Fetch team member to get practice_id
      const { data: existing } = await ctx.supabase
        .from('practice_team_members')
        .select('id, practice_id')
        .eq('id', id)
        .single();

      if (!existing) {
        return API_ERRORS.notFound('Team member');
      }

      // Verify user has admin access to this practice
      const practiceId = existing.practice_id;
      const access = await checkPracticeAccess(ctx.user.id, practiceId);

      if (!access || access.role !== 'admin') {
        return API_ERRORS.forbidden('You do not have permission to update this team member');
      }

      // Update role
      const { data, error } = await ctx.supabase
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
        return API_ERRORS.internal('Failed to update role');
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('[Team PATCH] Error:', error);
      return API_ERRORS.internal();
    }
  }
);

export { DELETE_HANDLER as DELETE, PATCH_HANDLER as PATCH };
