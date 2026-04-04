/**
 * app/api/extensions/corrections/route.ts
 *
 * GET endpoint for the Chrome extension.
 * Fetches pending corrections for a provider NPI.
 *
 * Query params:
 *   - npi (required): Provider NPI
 *   - practice_id (optional): Filter to specific practice
 *
 * Auth: Bearer token in Authorization header (validates against Supabase auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

interface PendingCorrection {
  field: string;
  incorrect_value: string;
  correct_value: string;
  workflow_id: string;
  system: string;
  correction_type: string;
}

interface ExtensionCorrectionsResponse {
  provider_name: string;
  npi: string;
  pending_corrections: PendingCorrection[];
  total_pending: number;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Helper to extract and validate bearer token
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Helper to validate JWT token against Supabase
 */
async function validateToken(token: string): Promise<{ userId: string } | null> {
  try {
    const admin = createAdminSupabaseClient();

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { userId: user.id };
  } catch (err) {
    console.error('[validateToken] Error:', err);
    return null;
  }
}

/**
 * GET /api/extensions/corrections
 *
 * Fetch pending corrections for a provider NPI.
 *
 * Query params:
 *   - npi (required): Provider NPI
 *   - practice_id (optional): Limit to specific practice
 *
 * Headers:
 *   - Authorization: Bearer <JWT token>
 *
 * Response: ExtensionCorrectionsResponse | ErrorResponse
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract and validate auth token
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          },
        } as ErrorResponse,
        { status: 401 },
      );
    }

    // Validate token
    const userResult = await validateToken(token);
    if (!userResult) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        } as ErrorResponse,
        { status: 401 },
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const npi = searchParams.get('npi');
    const practiceId = searchParams.get('practice_id');

    // Validate required parameters
    if (!npi) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Missing required query parameter: npi',
          },
        } as ErrorResponse,
        { status: 400 },
      );
    }

    // Query corrections from database
    const admin = createAdminSupabaseClient();

    let query = admin
      .from('workflow_instances')
      .select(
        `
        id,
        provider_name,
        provider_npi,
        workflow_tasks!inner (
          id,
          field_label,
          finding_details,
          system_name,
          correction_type
        )
      `,
      )
      .eq('provider_npi', npi)
      .in('verification_status', ['pending', 'submitted', 'still_mismatched']);

    // Filter by practice if provided
    if (practiceId) {
      query = query.eq('practice_id', practiceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/extensions/corrections] Query error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch corrections',
          },
        } as ErrorResponse,
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          provider_name: 'Unknown',
          npi,
          pending_corrections: [],
          total_pending: 0,
        } as ExtensionCorrectionsResponse,
        { status: 200 },
      );
    }

    // Get provider info from first result
    const providerName = data[0].provider_name || 'Unknown';

    // Transform data to flat structure
    const pendingCorrections: PendingCorrection[] = [];

    for (const instance of data) {
      const tasks = (instance.workflow_tasks as any[]) || [];
      for (const task of tasks) {
        const findingDetails = task.finding_details || {};

        pendingCorrections.push({
          field: task.field_label,
          incorrect_value: findingDetails.incorrect_value || 'N/A',
          correct_value: findingDetails.correct_value || 'N/A',
          workflow_id: instance.id,
          system: task.system_name,
          correction_type: task.correction_type,
        });
      }
    }

    // Return response
    return NextResponse.json(
      {
        provider_name: providerName,
        npi,
        pending_corrections: pendingCorrections,
        total_pending: pendingCorrections.length,
      } as ExtensionCorrectionsResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=300, must-revalidate', // Cache for 5 minutes
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/extensions/corrections] Error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      } as ErrorResponse,
      { status: 500 },
    );
  }
}
