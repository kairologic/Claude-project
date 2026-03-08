import { NextRequest, NextResponse } from 'next/server';
import {
  generateFormData,
  generateFormPDF,
  generateBulkForms,
  generateBulkPDF,
  createUpdateRequests,
} from '@/lib/forms/nppes-form-generator';

/**
 * NPPES Form Generation API — Tasks 2.5 + 3.3
 * POST /api/forms/generate
 *
 * Single form: { npi, practice_website_id }
 * Bulk forms:  { practice_website_id, bulk: true }
 *
 * Returns: PDF buffer as downloadable file, or JSON form data for preview.
 *
 * Query params:
 *   ?format=pdf    — returns PDF download
 *   ?format=json   — returns form data JSON (for UI preview)
 *   ?track=true    — creates update_requests records for workflow tracking
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { npi, practice_website_id, bulk, organization_id } = body;

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const track = url.searchParams.get('track') === 'true';

    if (!practice_website_id) {
      return NextResponse.json({ error: 'practice_website_id required' }, { status: 400 });
    }

    // ── Bulk generation ────────────────────────────────

    if (bulk) {
      const bulkResult = await generateBulkForms(practice_website_id);

      if (bulkResult.forms.length === 0) {
        return NextResponse.json({ error: 'No mismatches found for this practice' }, { status: 404 });
      }

      // Track all forms if requested
      if (track) {
        for (const form of bulkResult.forms) {
          await createUpdateRequests(form, organization_id);
        }
      }

      if (format === 'pdf') {
        const pdf = await generateBulkPDF(bulkResult);
        return new NextResponse(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="NPPES-Updates-${bulkResult.practice_name?.replace(/[^a-zA-Z0-9]/g, '-') || 'practice'}-${Date.now()}.pdf"`,
          },
        });
      }

      return NextResponse.json(bulkResult);
    }

    // ── Single form ────────────────────────────────────

    if (!npi) {
      return NextResponse.json({ error: 'npi required for single form generation' }, { status: 400 });
    }

    const formData = await generateFormData(npi, practice_website_id);

    if (!formData) {
      return NextResponse.json({ error: 'No mismatches found for this provider' }, { status: 404 });
    }

    // Track if requested
    if (track) {
      await createUpdateRequests(formData, organization_id);
    }

    if (format === 'pdf') {
      const pdf = await generateFormPDF(formData);
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="NPPES-Update-${npi}-${Date.now()}.pdf"`,
        },
      });
    }

    return NextResponse.json(formData);

  } catch (err) {
    console.error('[Form Generate API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Form generation failed' },
      { status: 500 },
    );
  }
}
