/**
 * app/api/corrections/export-packet/route.ts
 *
 * POST endpoint to generate and download correction packet PDF.
 * Requires authenticated user with access to the practice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, API_ERRORS } from '@/lib/api/with-auth';
import { generateCorrectionPacket } from '@/lib/corrections/export-packet';
import type { PracticeContext } from '@/lib/api/with-auth';

interface ExportPacketRequest {
  practiceId: string;
  dateRange?: { start: string; end: string };
  filter?: 'all' | 'outstanding' | 'completed';
}

/**
 * POST /api/corrections/export-packet
 *
 * Generate and return a PDF containing correction packet for a practice.
 *
 * Request body:
 * {
 *   practiceId: string (required),
 *   dateRange?: { start: string; end: string },
 *   filter?: 'all' | 'outstanding' | 'completed'
 * }
 *
 * Response:
 *   - PDF file with content-type: application/pdf
 *   - Headers include content-disposition with filename
 *
 * Requires: authenticated user with access to the practice
 */
const POST_HANDLER = withPracticeAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    const body = (await request.json()) as ExportPacketRequest;
    const { dateRange, filter = 'all' } = body;

    // Validate practice ID matches context
    if (body.practiceId !== ctx.practiceId) {
      return API_ERRORS.forbidden('Cannot export packet for a practice you do not have access to');
    }

    // Validate filter
    if (filter && !['all', 'outstanding', 'completed'].includes(filter)) {
      return API_ERRORS.badRequest('Invalid filter. Must be one of: all, outstanding, completed');
    }

    // Validate date range if provided
    if (dateRange) {
      if (!dateRange.start || !dateRange.end) {
        return API_ERRORS.badRequest('Date range must include both start and end dates');
      }

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return API_ERRORS.badRequest('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
      }

      if (startDate > endDate) {
        return API_ERRORS.badRequest('Start date must be before end date');
      }
    }

    // Generate packet
    const result = await generateCorrectionPacket({
      practiceId: ctx.practiceId,
      dateRange,
      filter,
    });

    // Return PDF with appropriate headers
    return new NextResponse(result.pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('[POST /api/corrections/export-packet] Error:', error);

    if (error instanceof Error && error.message.includes('Failed to query correction data')) {
      return API_ERRORS.badRequest('Unable to generate packet. Please try again.');
    }

    return API_ERRORS.badRequest(
      error instanceof Error ? error.message : 'An unexpected error occurred',
    );
  }
});

export { POST_HANDLER as POST };
