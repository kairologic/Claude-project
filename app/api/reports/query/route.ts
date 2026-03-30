/**
 * POST /api/reports/query
 *
 * Self-service report query endpoint.
 *
 * Request body:
 * {
 *   report_type: string,        // e.g., 'workflow_status', 'audit_trail'
 *   practice_id: string,
 *   fields?: string[],          // selected field keys (defaults to definition defaults)
 *   filters?: Record<string, any>,
 *   sort?: string,              // field key to sort by
 *   sort_direction?: 'asc' | 'desc',
 *   page?: number,              // 1-indexed (default 1)
 *   page_size?: number,         // default 50, max 1000
 *   format?: 'json' | 'csv' | 'pdf',  // default 'json'
 * }
 *
 * GET /api/reports/query/catalog
 * Returns all available report types with their field catalogs and filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { REPORT_REGISTRY, getReportCatalog } from '@/lib/reports/report-definitions';
import {
  executeReportQuery,
  reportToCSV,
  reportToPDFData,
  type ReportQueryRequest,
} from '@/lib/reports/query-engine';

// ─── POST: Execute report query ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      report_type,
      practice_id,
      fields,
      filters,
      sort,
      sort_direction,
      page,
      page_size,
      format = 'json',
    } = body;

    // Validate required params
    if (!report_type || !practice_id) {
      return NextResponse.json(
        { error: 'Missing required fields: report_type, practice_id' },
        { status: 400 },
      );
    }

    if (!REPORT_REGISTRY[report_type]) {
      return NextResponse.json(
        { error: `Unknown report_type: ${report_type}. Use GET to see available types.` },
        { status: 400 },
      );
    }

    if (!['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be one of: json, csv, pdf' },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('id, name')
      .eq('id', practice_id)
      .single();

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // For CSV/PDF exports, fetch all rows (up to 5000 limit)
    const queryRequest: ReportQueryRequest = {
      report_type,
      practice_id,
      fields,
      filters,
      sort,
      sort_direction,
      page: format === 'json' ? page : 1,
      page_size: format === 'json' ? page_size : 5000,
    };

    const result = await executeReportQuery(supabase, queryRequest);

    // ── JSON response ──────────────────────────────────────────────────────
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // ── CSV export ─────────────────────────────────────────────────────────
    if (format === 'csv') {
      const csv = reportToCSV(result);
      const filename = `${report_type}_${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── PDF export ─────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const pdfData = reportToPDFData(result);

      // Dynamic import to avoid loading jsPDF on every request
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

      // ── Header ──
      doc.setFontSize(18);
      doc.setTextColor(20, 31, 51); // Navy
      doc.text(pdfData.title, 40, 40);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(pdfData.subtitle, 40, 58);

      if (practice.name) {
        doc.text(`Practice: ${practice.name}`, 40, 72);
      }

      // ── Table ──
      autoTable(doc, {
        startY: 90,
        head: [pdfData.columns],
        body: pdfData.rows,
        styles: {
          fontSize: 7,
          cellPadding: 4,
          lineColor: [220, 220, 220],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [20, 31, 51],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        margin: { left: 40, right: 40 },
        didDrawPage: (data: any) => {
          // Footer on every page
          const pageCount = doc.getNumberOfPages();
          const pageNum = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `KairoLogic · ${pdfData.title} · Page ${pageNum} of ${pageCount}`,
            40,
            doc.internal.pageSize.getHeight() - 20,
          );
          doc.text(
            `Generated ${new Date().toISOString().slice(0, 10)}`,
            doc.internal.pageSize.getWidth() - 140,
            doc.internal.pageSize.getHeight() - 20,
          );
        },
      });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      const filename = `${report_type}_${new Date().toISOString().slice(0, 10)}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(pdfBuffer.length),
        },
      });
    }

    // Should never reach here
    return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
  } catch (error: any) {
    console.error('[Reports Query POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─── GET: Report catalog (field definitions for the UI) ─────────────────────

export async function GET() {
  try {
    const catalog = getReportCatalog();

    return NextResponse.json({
      success: true,
      report_types: catalog,
    });
  } catch (error: any) {
    console.error('[Reports Query GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
