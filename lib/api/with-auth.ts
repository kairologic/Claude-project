/**
 * lib/api/with-auth.ts
 *
 * Reusable API route middleware for authentication and authorization.
 *
 * withAuth(handler)           — requires authenticated user
 * withPracticeAccess(handler) — requires auth + user belongs to practice
 * withAdminAccess(handler)    — requires auth + admin role on practice
 *
 * Each wrapper provides the handler with an enriched context object
 * containing the user, practice access, and admin Supabase client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  checkPracticeAccess,
} from '@/lib/auth/auth-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PracticeRole } from '@/lib/types/dashboard-schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContext {
  user: { id: string; email?: string };
  supabase: SupabaseClient; // admin client (bypasses RLS)
}

export interface PracticeContext extends AuthContext {
  practiceId: string;
  role: PracticeRole;
}

/** Next.js App Router dynamic route params — kept flexible for diverse route signatures */
interface RouteParams {
  params?: Record<string, string> | Promise<Record<string, string>>;
  [key: string]: unknown;
}

type AuthHandler = (
  request: NextRequest,
  ctx: AuthContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- route handlers destructure params differently
  routeParams?: any,
) => Promise<NextResponse>;

type PracticeHandler = (
  request: NextRequest,
  ctx: PracticeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeParams?: any,
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Standardized error responses
// ---------------------------------------------------------------------------

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export const API_ERRORS = {
  unauthorized: () => apiError('UNAUTHORIZED', 'Authentication required', 401),
  forbidden: (msg = 'Insufficient permissions') => apiError('FORBIDDEN', msg, 403),
  notFound: (resource = 'Resource') => apiError('NOT_FOUND', `${resource} not found`, 404),
  badRequest: (msg: string, details?: unknown) => apiError('BAD_REQUEST', msg, 400, details),
  internal: (msg = 'Internal server error') => apiError('INTERNAL_ERROR', msg, 500),
  validationError: (issues: z.ZodIssue[]) =>
    apiError(
      'VALIDATION_ERROR',
      'Request validation failed',
      400,
      issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    ),
};

// ---------------------------------------------------------------------------
// UUID validator
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ---------------------------------------------------------------------------
// withAuth — requires authenticated user
// ---------------------------------------------------------------------------

export function withAuth(handler: AuthHandler) {
  return async (request: NextRequest, routeParams?: RouteParams): Promise<NextResponse> => {
    try {
      const supabaseServer = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabaseServer.auth.getUser();

      if (authError || !user) {
        return API_ERRORS.unauthorized();
      }

      const supabase = createAdminSupabaseClient();
      return await handler(request, { user, supabase }, routeParams);
    } catch (err) {
      console.error('[withAuth] Unhandled error:', err);
      return API_ERRORS.internal();
    }
  };
}

// ---------------------------------------------------------------------------
// withPracticeAccess — requires auth + practice membership
// ---------------------------------------------------------------------------

/**
 * Extracts practice_id from:
 *  1. Query param  ?practice_id=...
 *  2. JSON body    { practice_id: "..." }
 *  3. URL path     /api/.../[practiceId]/...  (via routeParams)
 */
export function withPracticeAccess(
  handler: PracticeHandler,
  options?: { requiredRole?: PracticeRole },
) {
  return async (request: NextRequest, routeParams?: RouteParams): Promise<NextResponse> => {
    try {
      // 1. Authenticate
      const supabaseServer = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabaseServer.auth.getUser();

      if (authError || !user) {
        return API_ERRORS.unauthorized();
      }

      // 2. Extract practice_id
      let practiceId: string | null = null;

      // From query params
      const url = new URL(request.url);
      practiceId = url.searchParams.get('practice_id');

      // From route params (dynamic segments)
      if (!practiceId && routeParams?.params) {
        const resolvedParams =
          routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
        practiceId = resolvedParams?.practiceId || resolvedParams?.id || null;
      }

      // From request body (for POST/PUT/PATCH)
      if (!practiceId && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          practiceId = body?.practice_id || null;
        } catch {
          // Body might not be JSON — that's OK
        }
      }

      if (!practiceId) {
        return API_ERRORS.badRequest('practice_id is required');
      }

      if (!isValidUUID(practiceId)) {
        return API_ERRORS.badRequest('practice_id must be a valid UUID');
      }

      // 3. Check practice access
      const access = await checkPracticeAccess(user.id, practiceId);
      if (!access) {
        return API_ERRORS.forbidden('You do not have access to this practice');
      }

      // 4. Check required role
      const requiredRole = options?.requiredRole;
      if (requiredRole) {
        const roleHierarchy: Record<PracticeRole, number> = {
          viewer: 0,
          editor: 1,
          admin: 2,
        };
        if (
          (roleHierarchy[access.role as PracticeRole] ?? 0) < (roleHierarchy[requiredRole] ?? 0)
        ) {
          return API_ERRORS.forbidden(`This action requires ${requiredRole} role`);
        }
      }

      const supabase = createAdminSupabaseClient();
      return await handler(
        request,
        { user, supabase, practiceId, role: access.role as PracticeRole },
        routeParams,
      );
    } catch (err) {
      console.error('[withPracticeAccess] Unhandled error:', err);
      return API_ERRORS.internal();
    }
  };
}

// ---------------------------------------------------------------------------
// withAdminAccess — convenience for admin-only routes
// ---------------------------------------------------------------------------

export function withAdminAccess(handler: PracticeHandler) {
  return withPracticeAccess(handler, { requiredRole: 'admin' });
}

// ---------------------------------------------------------------------------
// Zod validation helper
// ---------------------------------------------------------------------------

export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { error: API_ERRORS.validationError(result.error.issues) };
    }
    return { data: result.data };
  } catch {
    return {
      error: API_ERRORS.badRequest('Invalid or missing JSON request body'),
    };
  }
}

// ---------------------------------------------------------------------------
// HTML sanitizer for email templates
// ---------------------------------------------------------------------------

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
