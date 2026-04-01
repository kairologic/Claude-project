/**
 * lib/corrections/export-packet.ts
 *
 * PDF generation logic for correction reports.
 * Queries workflow instances and generates branded PDF with corrections grouped by provider.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { getResolvedDeepLink } from '@/lib/corrections/deep-links';
import { colors } from '@/lib/design-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface CorrectionPacketOptions {
  practiceId: string;
  dateRange?: { start: string; end: string };
  filter?: 'all' | 'outstanding' | 'completed';
}

export interface CorrectionPacketResult {
  pdf: Buffer;
  filename: string;
  stats: {
    total: number;
    outstanding: number;
    completed: number;
    verified: number;
    avgResolutionDays: number | null;
  };
}

interface CorrectionItem {
  id: string;
  provider_npi: string;
  provider_name: string;
  field_label: string;
  incorrect_value: string;
  correct_value: string;
  system_name: string;
  correction_type: string;
  verification_status: 'pending' | 'submitted' | 'verified' | 'still_mismatched' | 'escalated';
  resolved_at: string | null;
  created_at: string;
}

interface ProviderGroup {
  npi: string;
  name: string;
  corrections: CorrectionItem[];
}

interface PacketStats {
  total: number;
  outstanding: number;
  completed: number;
  verified: number;
  avgResolutionDays: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'verified':
      return colors.green;
    case 'submitted':
      return colors.goldLight;
    case 'pending':
      return colors.blue;
    case 'still_mismatched':
      return colors.red;
    case 'escalated':
      return colors.red;
    default:
      return colors.gray400;
  }
}

/**
 * Format date string for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Query corrections from the database
 */
async function queryCorrectionData(
  practiceId: string,
  dateRange?: { start: string; end: string },
  filter?: 'all' | 'outstanding' | 'completed',
): Promise<CorrectionItem[]> {
  const admin = createAdminSupabaseClient();

  let query = admin
    .from('workflow_instances')
    .select(
      `
      id,
      provider_npi,
      provider_name,
      verification_status,
      resolved_at,
      created_at,
      workflow_tasks!inner (
        id,
        field_label,
        finding_details,
        system_name,
        correction_type
      )
    `,
    )
    .eq('practice_id', practiceId);

  // Apply date range filter if provided
  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end);
  }

  // Apply verification status filter
  if (filter === 'outstanding') {
    query = query.in('verification_status', ['pending', 'submitted', 'still_mismatched']);
  } else if (filter === 'completed') {
    query = query.in('verification_status', ['verified']);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[queryCorrectionData] Error:', error);
    throw new Error(`Failed to query correction data: ${error.message}`);
  }

  if (!data) return [];

  // Transform the nested data structure into flat correction items
  const corrections: CorrectionItem[] = [];

  for (const instance of data) {
    const tasks = (instance.workflow_tasks as any[]) || [];
    for (const task of tasks) {
      const findingDetails = task.finding_details || {};
      corrections.push({
        id: task.id,
        provider_npi: instance.provider_npi,
        provider_name: instance.provider_name,
        field_label: task.field_label,
        incorrect_value: findingDetails.incorrect_value || 'N/A',
        correct_value: findingDetails.correct_value || 'N/A',
        system_name: task.system_name,
        correction_type: task.correction_type,
        verification_status: instance.verification_status,
        resolved_at: instance.resolved_at,
        created_at: instance.created_at,
      });
    }
  }

  return corrections;
}

/**
 * Group corrections by provider
 */
function groupByProvider(corrections: CorrectionItem[]): ProviderGroup[] {
  const grouped: Record<string, ProviderGroup> = {};

  for (const correction of corrections) {
    const key = `${correction.provider_npi}|${correction.provider_name}`;
    if (!grouped[key]) {
      grouped[key] = {
        npi: correction.provider_npi,
        name: correction.provider_name,
        corrections: [],
      };
    }
    grouped[key].corrections.push(correction);
  }

  return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculate packet statistics
 */
function calculateStats(corrections: CorrectionItem[]): PacketStats {
  const outstanding = corrections.filter((c) =>
    ['pending', 'submitted', 'still_mismatched'].includes(c.verification_status),
  ).length;

  const verified = corrections.filter((c) => c.verification_status === 'verified').length;

  // Calculate average resolution time for completed items
  const resolutionTimes: number[] = [];
  for (const correction of corrections) {
    if (correction.resolved_at && correction.verification_status === 'verified') {
      const resolutionDays = daysBetween(
        new Date(correction.created_at),
        new Date(correction.resolved_at),
      );
      resolutionTimes.push(resolutionDays);
    }
  }

  const avgResolutionDays =
    resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : null;

  return {
    total: corrections.length,
    outstanding,
    completed: verified,
    verified,
    avgResolutionDays,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate branded correction packet PDF
 */
export async function generateCorrectionPacket(
  options: CorrectionPacketOptions,
): Promise<CorrectionPacketResult> {
  const { practiceId, dateRange, filter = 'all' } = options;

  // Query correction data
  const corrections = await queryCorrectionData(practiceId, dateRange, filter);

  // Group by provider
  const providerGroups = groupByProvider(corrections);

  // Calculate stats
  const stats = calculateStats(corrections);

  // Create PDF
  const doc = new jsPDF();
  let yPosition = 15;

  // ─────────────────────────────────────────────────────────────────────────
  // Header with branding
  // ─────────────────────────────────────────────────────────────────────────

  // Background rectangle with navy
  doc.setFillColor(15, 30, 46); // navy
  doc.rect(0, 0, 210, 30, 'F');

  // KairoLogic branding (gold text)
  doc.setTextColor(212, 160, 23); // gold
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('KairoLogic', 15, 12);

  // "Guided Correction Engine" subtitle (white, smaller)
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Guided Correction Engine', 15, 20);

  // Practice info and date range (right-aligned, white)
  doc.setFontSize(9);
  const headerRight = 'Practice: ' + (options.practiceId || 'All');
  doc.text(headerRight, 140, 12, { align: 'right' });

  if (dateRange) {
    const dateRangeStr = `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`;
    doc.text(dateRangeStr, 140, 20, { align: 'right' });
  } else {
    doc.text('Date: ' + formatDate(new Date().toISOString()), 140, 20, { align: 'right' });
  }

  yPosition = 35;

  // ─────────────────────────────────────────────────────────────────────────
  // Summary statistics
  // ─────────────────────────────────────────────────────────────────────────

  doc.setTextColor(15, 30, 46); // navy
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary Statistics', 15, yPosition);
  yPosition += 8;

  const summaryData = [
    [`Total Corrections`, stats.total.toString()],
    [`Outstanding`, stats.outstanding.toString()],
    [`Verified/Completed`, stats.completed.toString()],
    [`Avg Resolution Time`, stats.avgResolutionDays ? `${stats.avgResolutionDays} days` : 'N/A'],
  ];

  const summaryHeight = summaryData.length * 6 + 4;
  doc.setDrawColor(212, 160, 23); // gold border
  doc.rect(15, yPosition - 1, 85, summaryHeight, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  let summaryY = yPosition + 2;
  for (const [label, value] of summaryData) {
    doc.text(label + ':', 18, summaryY);
    doc.setFont('Helvetica', 'bold');
    doc.text(value, 65, summaryY, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    summaryY += 6;
  }

  yPosition += summaryHeight + 8;

  // ─────────────────────────────────────────────────────────────────────────
  // Per-provider sections
  // ─────────────────────────────────────────────────────────────────────────

  for (const provider of providerGroups) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 15;
    }

    // Provider header
    doc.setTextColor(15, 30, 46);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${provider.name}`, 15, yPosition);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `NPI: ${provider.npi} | ${provider.corrections.length} corrections`,
      15,
      yPosition + 5,
    );

    yPosition += 10;

    // Corrections table for this provider
    const tableData = provider.corrections.map((correction) => [
      correction.field_label.substring(0, 20),
      correction.incorrect_value.substring(0, 25),
      correction.correct_value.substring(0, 25),
      correction.system_name.substring(0, 15),
      correction.verification_status === 'verified' ? 'Verified' : 'Outstanding',
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [['Field', 'Incorrect', 'Correct', 'System', 'Status']],
      body: tableData,
      headStyles: {
        fillColor: [15, 30, 46],
        textColor: [212, 160, 23],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
      },
      margin: 15,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Footer with monthly summary
  // ─────────────────────────────────────────────────────────────────────────

  // Add a new page for footer
  if (yPosition > 240) {
    doc.addPage();
  }

  yPosition = Math.max(yPosition, 200);

  doc.setFillColor(15, 30, 46);
  doc.rect(0, yPosition, 210, 50, 'F');

  doc.setTextColor(212, 160, 23);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Monthly Summary', 15, yPosition + 8);

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  const footerLines = [
    `Mismatches Detected: ${stats.total}`,
    `Corrections Completed: ${stats.completed}`,
    `Auto-Verified: ${stats.verified}`,
    `Outstanding: ${stats.outstanding}`,
    stats.avgResolutionDays
      ? `Avg Resolution Time: ${stats.avgResolutionDays} days`
      : 'Avg Resolution Time: N/A',
  ];

  let footerY = yPosition + 12;
  for (const line of footerLines) {
    doc.text(line, 20, footerY);
    footerY += 6;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Finalize and return
  // ─────────────────────────────────────────────────────────────────────────

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
  }

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filterStr = filter !== 'all' ? `-${filter}` : '';
  const filename = `KairoLogic-Corrections-${dateStr}${filterStr}.pdf`;

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return {
    pdf: pdfBuffer,
    filename,
    stats,
  };
}
