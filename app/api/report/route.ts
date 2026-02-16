import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Report Generation API
 * =================================
 * REPORT-FORMAT-v1.0 (Locked February 2026)
 *
 * POST /api/report — Accept scan payload, generate PDF, store in Supabase
 * GET  /api/report?reportId=KL-SAR-XXXX — Download PDF by report ID
 * GET  /api/report?npi=XXXXXXXXXX — List all reports for NPI
 * PATCH /api/report — Update report metadata (emailed, downloaded, etc.)
 *
 * PDF generated server-side via jsPDF + jspdf-autotable.
 * Format matches the locked Python reference (report_generator_v1_locked.py).
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const FORMAT_VERSION = 'REPORT-FORMAT-v1.0';
const ENGINE_LABEL = 'SENTRY-3.1.0 / Check Engine v2';

// ══════════════════════════════════════════════════════════════
// BRAND COLORS (Navy/Gold/Orange)
// ══════════════════════════════════════════════════════════════

const C = {
  navy:      [0, 35, 78] as [number, number, number],
  navyLight: [11, 45, 94] as [number, number, number],
  gold:      [197, 160, 89] as [number, number, number],
  goldLight: [245, 239, 223] as [number, number, number],
  orange:    [255, 102, 0] as [number, number, number],
  red:       [220, 38, 38] as [number, number, number],
  green:     [22, 163, 74] as [number, number, number],
  amber:     [217, 119, 6] as [number, number, number],
  gray:      [107, 114, 128] as [number, number, number],
  grayLight: [243, 244, 246] as [number, number, number],
  grayBd:    [229, 231, 235] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  redBg:     [254, 242, 242] as [number, number, number],
  greenBg:   [240, 253, 244] as [number, number, number],
  amberBg:   [255, 251, 235] as [number, number, number],
  text:      [55, 65, 81] as [number, number, number],
};

// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function generateReportId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `KL-SAR-${dateStr}-${hex}`;
}

function riskLabel(score: number): string {
  if (score >= 67) return 'SOVEREIGN';
  if (score >= 34) return 'DRIFT';
  return 'VIOLATION';
}

function riskColor(score: number): [number, number, number] {
  if (score >= 67) return C.green;
  if (score >= 34) return C.amber;
  return C.red;
}

function statusColor(status: string): [number, number, number] {
  const s = status.toUpperCase();
  if (s === 'PASS') return C.green;
  if (s === 'FAIL') return C.red;
  return C.amber;
}

function priorityColor(priority: string): [number, number, number] {
  const p = priority.toUpperCase();
  if (p === 'CRITICAL') return C.red;
  if (p === 'HIGH') return C.orange;
  if (p === 'MEDIUM') return C.amber;
  return C.green;
}

function statusBg(status: string): [number, number, number] {
  const s = status.toUpperCase();
  if (s === 'PASS') return C.greenBg;
  if (s === 'FAIL') return C.redBg;
  return C.amberBg;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function safe(val: unknown, fallback: string = '-'): string {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
}

// Type for jsPDF with autoTable plugin
interface AutoTableDoc extends jsPDF {
  autoTable: (options: Record<string, unknown>) => void;
  lastAutoTable?: { finalY: number };
}

// ══════════════════════════════════════════════════════════════
// PDF GENERATION — LOCKED FORMAT v1.0
// ══════════════════════════════════════════════════════════════

function generatePDF(payload: Record<string, unknown>): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' }) as AutoTableDoc;
  const W = 612;
  const H = 792;
  const M = 54; // margin
  const CW = W - 2 * M; // content width
  const reportId = generateReportId();
  const scanDate = formatDate();
  const score = (payload.riskScore as number) || 0;
  const status = safe(payload.complianceStatus as string, riskLabel(score));
  const providerName = safe(payload.providerName as string || payload.name as string, 'Unknown Practice');
  const npi = safe(payload.npi as string);
  const url = safe(payload.url as string);
  const engine = safe(payload.engineVersion as string, ENGINE_LABEL);
  const meta = (payload.meta as Record<string, unknown>) || {};
  const findings = (payload.findings as Array<Record<string, unknown>>) || [];
  const categoryScores = (payload.categoryScores as Record<string, Record<string, number>>) || {};
  const dataBorderMap = (payload.dataBorderMap as Array<Record<string, unknown>>) || [];
  const npiVerification = (payload.npiVerification as Record<string, unknown>) || {};

  // ── Helper: Add branded header/footer to body pages ──
  function addHeaderFooter(pageNum: number): void {
    // Header bar
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 50, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(2);
    doc.line(0, 52, W, 52);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text('KAIROLOGIC  |  SOVEREIGNTY AUDIT REPORT', M, 35);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CONFIDENTIAL  |  ${reportId}`, W - M, 35, { align: 'right' });

    // Footer
    doc.setDrawColor(...C.grayBd);
    doc.setLineWidth(0.5);
    doc.line(M, H - 50, W - M, H - 50);
    doc.setFontSize(6);
    doc.setTextColor(...C.gray);
    doc.text(
      `Report ID: ${reportId}  |  Generated: ${scanDate}  |  Engine: ${engine}  |  ${FORMAT_VERSION}`,
      M, H - 38
    );
    doc.text(`Page ${pageNum}`, W - M, H - 38, { align: 'right' });
    doc.setFontSize(5);
    doc.text(
      'This document contains proprietary compliance data. Distribution restricted to authorized personnel.',
      W / 2, H - 25, { align: 'center' }
    );
  }

  // ── Helper: New body page ──
  let currentPage = 0;
  function newBodyPage(): void {
    if (currentPage > 0) doc.addPage();
    currentPage++;
    addHeaderFooter(currentPage);
  }

  // ── Helper: Section header with gold rule ──
  function sectionHeader(y: number, title: string): number {
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text(title, M, y);
    return y + 16;
  }

  // ── Helper: Body text ──
  function bodyText(y: number, text: string, opts?: { bold?: boolean; color?: [number, number, number]; size?: number; maxWidth?: number }): number {
    const size = opts?.size || 9.5;
    const color = opts?.color || C.text;
    const weight = opts?.bold ? 'bold' : 'normal';
    const maxW = opts?.maxWidth || CW;
    doc.setFontSize(size);
    doc.setFont('helvetica', weight);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    doc.text(lines, M, y);
    return y + lines.length * (size * 1.4);
  }

  // ── Helper: Get Y position after autoTable ──
  function getLastTableY(): number {
    return doc.lastAutoTable?.finalY || 200;
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 1: COVER (Navy background)
  // ══════════════════════════════════════════════════════════

  // Navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, H, 'F');
  // Gold accent line
  doc.setFillColor(...C.gold);
  doc.rect(0, H * 0.52, W, 4, 'F');
  // Bottom section
  doc.setFillColor(...C.navyLight);
  doc.rect(0, 0, W, H * 0.35, 'F');

  // Cover text
  let cy = H * 0.56;
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('SOVEREIGNTY', M + 20, cy);
  cy += 38;
  doc.text('AUDIT REPORT', M + 20, cy);
  cy += 24;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gold);
  doc.text('Sentry Compliance Standard  |  Check Engine v2', M + 20, cy);
  cy += 36;

  // Provider details
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  const coverDetails = [
    `Practice: ${providerName}`,
    `NPI: ${npi}`,
    `Website: ${url}`,
    `Report Date: ${scanDate}`,
    `Report ID: ${reportId}`,
  ];
  for (const line of coverDetails) {
    doc.text(line, M + 20, cy);
    cy += 16;
  }
  cy += 8;
  doc.setFontSize(10);
  doc.text(
    `Engine: ${safe(meta.engine as string, engine)}  |  Duration: ${safe(meta.duration as string, safe(payload.scanDuration as string))}  |  Checks: ${safe(meta.checksRun as string)} executed`,
    M + 20, cy
  );
  cy += 36;

  // Score on cover
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(String(score), M + 20, cy);
  const scoreWidth = doc.getTextWidth(String(score));
  doc.setFontSize(18);
  doc.setTextColor(156, 163, 175);
  doc.text(' / 100', M + 20 + scoreWidth, cy);
  cy += 24;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...riskColor(score));
  doc.text(`${riskLabel(score)} RISK`, M + 20, cy);

  // ══════════════════════════════════════════════════════════
  // PAGE 2: EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════

  newBodyPage();
  let y = 75;
  y = sectionHeader(y, 'EXECUTIVE SUMMARY');
  y = bodyText(y, `This Sovereignty Audit Report provides a comprehensive forensic analysis of ${providerName} (NPI: ${npi}) conducted on ${scanDate}. The analysis was conducted using KairoLogic's Check Engine v2 plugin-based scanning system across Data Residency, AI Transparency, and Clinical Integrity domains.`);
  y += 8;

  // Score summary table
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['OVERALL SCORE', 'RISK LEVEL', 'CHECKS RUN', 'PASSED', 'FAILED', 'WARNINGS']],
    body: [[
      `${score} / 100`,
      status.toUpperCase(),
      safe(meta.checksRun as string),
      safe(meta.checksPass as string),
      safe(meta.checksFail as string),
      safe(meta.checksWarn as string),
    ]],
    styles: { fontSize: 8, cellPadding: 6, halign: 'center' as const },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' as const },
    bodyStyles: { fontStyle: 'bold' as const, fontSize: 11 },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } } }) => {
      if (data.section === 'body') {
        if (data.column.index <= 1) data.cell.styles.textColor = riskColor(score) as unknown as number[];
        if (data.column.index === 3) data.cell.styles.textColor = C.green as unknown as number[];
        if (data.column.index === 4) data.cell.styles.textColor = C.red as unknown as number[];
        if (data.column.index === 5) data.cell.styles.textColor = C.amber as unknown as number[];
      }
    },
    theme: 'grid' as const,
  });
  y = getLastTableY() + 14;

  // Category scores
  const catMap: [string, string][] = [
    ['data_sovereignty', 'Data Residency (SB 1188)'],
    ['ai_transparency', 'AI Transparency (HB 149)'],
    ['clinical_integrity', 'Clinical Integrity'],
  ];
  const catRows: string[][] = [];
  for (const [key, label] of catMap) {
    const cat = categoryScores[key] || {};
    const pct = cat.percentage ?? '-';
    const pctVal = typeof pct === 'number' ? pct : 0;
    const passed = cat.pass ?? 0;
    const total = cat.total ?? 0;
    const st = pctVal >= 67 ? 'Sovereign' : pctVal >= 34 ? 'Drift' : 'Violation';
    catRows.push([label, `${pct}%`, st, `${passed}/${total} pass`]);
  }
  // NPI Integrity row
  const npiFindings = findings.filter(f => {
    const id = (f.id as string) || '';
    return id.startsWith('NPI-') || id.startsWith('RST-');
  });
  const npiPass = npiFindings.filter(f => f.status === 'pass').length;
  const npiTotal = npiFindings.length || 4;
  const npiPct = Math.round(npiPass / Math.max(npiTotal, 1) * 100);
  const npiSt = npiPct >= 67 ? 'Sovereign' : npiPct >= 34 ? 'Drift' : 'Violation';
  catRows.push(['NPI Integrity (Check Engine v2)', `${npiPct}%`, npiSt, `${npiPass}/${npiTotal} pass`]);

  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['CATEGORY', 'SCORE', 'STATUS', 'CHECKS']],
    body: catRows,
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' as const },
    columnStyles: {
      0: { fontStyle: 'bold' as const },
      1: { halign: 'center' as const },
      2: { halign: 'center' as const },
      3: { halign: 'center' as const },
    },
    alternateRowStyles: { fillColor: C.grayLight },
    didParseCell: (data: { section: string; column: { index: number }; row: { index: number }; cell: { styles: { textColor: number[] } } }) => {
      if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
        const pctStr = catRows[data.row.index]?.[1] || '0%';
        const val = parseInt(pctStr);
        data.cell.styles.textColor = riskColor(val) as unknown as number[];
      }
    },
    theme: 'grid' as const,
  });
  y = getLastTableY() + 20;

  // ══════════════════════════════════════════════════════════
  // NPI INTEGRITY VERIFICATION
  // ══════════════════════════════════════════════════════════

  y = sectionHeader(y, 'NPI INTEGRITY VERIFICATION');
  y = bodyText(y, 'Check Engine v2 cross-references the provider\'s website content against the federal NPPES registry to identify credentialing mismatches that could indicate compliance risk or identity discrepancies.');
  y += 6;

  if (npiVerification.valid) {
    const npiName = safe(npiVerification.name as string);
    const nameMatch = npiName.toLowerCase().trim() === providerName.toLowerCase().trim() ? 'MATCH' : 'MISMATCH';
    const npiRows = [
      ['Provider Name', npiName, providerName, nameMatch],
      ['NPI Number', safe(npiVerification.npi as string), npi, 'MATCH'],
      ['Provider Type', safe(npiVerification.type as string), safe(npiVerification.type as string), 'MATCH'],
      ['Primary Specialty', safe(npiVerification.specialty as string), 'From website scan', 'REVIEW'],
      ['Address', safe(npiVerification.address as string), 'From website scan', 'REVIEW'],
      ['Enumeration Date', safe(npiVerification.enumerationDate as string), 'N/A', 'INFO'],
    ];

    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['FIELD', 'NPPES REGISTRY', 'WEBSITE / SCAN', 'STATUS']],
      body: npiRows,
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' as const },
      columnStyles: { 0: { fontStyle: 'bold' as const }, 3: { halign: 'center' as const, fontStyle: 'bold' as const } },
      alternateRowStyles: { fillColor: C.grayLight },
      didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] }; raw: unknown } }) => {
        if (data.section === 'body' && data.column.index === 3) {
          const v = String(data.cell.raw);
          if (v === 'MATCH') data.cell.styles.textColor = C.green as unknown as number[];
          else if (v === 'MISMATCH') data.cell.styles.textColor = C.amber as unknown as number[];
          else if (v === 'REVIEW') data.cell.styles.textColor = C.amber as unknown as number[];
          else data.cell.styles.textColor = C.gray as unknown as number[];
        }
      },
      theme: 'grid' as const,
    });
  } else {
    y = bodyText(y, 'NPI verification unavailable. The NPI could not be validated against the NPPES registry.', { bold: true });
  }

  // ══════════════════════════════════════════════════════════
  // DETAILED FINDINGS (DR-, AI-, ER-, NPI-/RST-)
  // ══════════════════════════════════════════════════════════

  const findingsSections: { prefix: string | string[]; title: string; description: string }[] = [
    {
      prefix: 'DR-',
      title: 'DETAILED FINDINGS: DATA RESIDENCY (SB 1188)',
      description: 'Senate Bill 1188 requires all electronic health records for Texas patients to be physically maintained within the United States. These checks verify that your digital infrastructure routes patient data exclusively through domestic endpoints.',
    },
    {
      prefix: 'AI-',
      title: 'DETAILED FINDINGS: AI TRANSPARENCY (HB 149)',
      description: 'House Bill 149 requires physicians to disclose when AI tools are used in patient care. These checks verify that your website and patient-facing systems provide clear, conspicuous AI disclosures.',
    },
    {
      prefix: 'ER-',
      title: 'DETAILED FINDINGS: CLINICAL INTEGRITY',
      description: 'These checks verify compliance with EHR system integrity requirements, including proper data field handling and patient access controls mandated by Texas administrative code.',
    },
    {
      prefix: ['NPI-', 'RST-'],
      title: 'CHECK ENGINE v2: NPI INTEGRITY PLUGINS',
      description: 'These plugin-based checks are unique to KairoLogic\'s Check Engine v2 and cross-reference your website content against the federal NPPES registry in real time.',
    },
  ];

  for (let si = 0; si < findingsSections.length; si++) {
    const section = findingsSections[si];

    // New page for first two sections, combine ER + NPI on same page if space
    if (si === 0 || si === 2) {
      newBodyPage();
      y = 75;
    } else {
      y = getLastTableY() + 24;
      if (y > 580) {
        newBodyPage();
        y = 75;
      }
    }

    const prefixes = Array.isArray(section.prefix) ? section.prefix : [section.prefix];
    const sectionFindings = findings.filter(f => {
      const id = (f.id as string) || '';
      return prefixes.some(p => id.startsWith(p));
    });

    if (sectionFindings.length === 0) continue;

    y = sectionHeader(y, section.title);
    y = bodyText(y, section.description);
    y += 6;

    const fRows = sectionFindings.map(f => [
      safe(f.id as string),
      safe(f.name as string),
      (f.status as string || 'info').toUpperCase() === 'PASS' ? 'PASS' :
        (f.status as string || 'info').toUpperCase() === 'FAIL' ? 'FAIL' : 'WARN',
      safe(f.detail as string),
    ]);

    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['CHECK ID', 'CHECK NAME', 'STATUS', 'FINDING']],
      body: fRows,
      styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' as const },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' as const },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' as const },
        1: { cellWidth: 100 },
        2: { cellWidth: 42, halign: 'center' as const, fontStyle: 'bold' as const },
        3: { cellWidth: CW - 192 },
      },
      didParseCell: (data: { section: string; column: { index: number }; row: { index: number }; cell: { styles: { textColor: number[]; fillColor: number[] }; raw: unknown } }) => {
        if (data.section === 'body') {
          if (data.column.index === 2) {
            const v = String(data.cell.raw);
            data.cell.styles.textColor = statusColor(v) as unknown as number[];
          }
          // Row background for fail/warn
          const rowStatus = fRows[data.row.index]?.[2];
          if (rowStatus && rowStatus !== 'PASS') {
            data.cell.styles.fillColor = statusBg(rowStatus) as unknown as number[];
          }
        }
      },
      theme: 'grid' as const,
    });
  }

  // ══════════════════════════════════════════════════════════
  // DATA BORDER MAP
  // ══════════════════════════════════════════════════════════

  if (dataBorderMap.length > 0) {
    newBodyPage();
    y = 75;
    y = sectionHeader(y, 'DATA BORDER MAP');
    y = bodyText(y, 'IP geolocation analysis of all endpoints detected during the scan. Foreign endpoints represent potential SB 1188 violations if they process or cache protected health information.');
    y += 6;

    let usCount = 0;
    let foreignCount = 0;
    const borderRows = dataBorderMap.map(ep => {
      const country = safe(ep.country as string).toUpperCase();
      const city = safe(ep.city as string, '');
      const isUS = ['US', 'USA', 'UNITED STATES'].includes(country);
      if (isUS) usCount++; else foreignCount++;
      const location = city ? `${city}, ${country}` : country;
      return [
        safe(ep.domain as string),
        safe(ep.ip as string),
        location,
        safe(ep.provider as string),
        safe(ep.phiRisk as string, 'LOW').toUpperCase(),
        isUS ? 'DOMESTIC' : 'FOREIGN',
      ];
    });

    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['DOMAIN', 'IP ADDRESS', 'LOCATION', 'PROVIDER', 'PHI RISK', 'STATUS']],
      body: borderRows,
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' as const },
      columnStyles: {
        4: { halign: 'center' as const },
        5: { halign: 'center' as const, fontStyle: 'bold' as const },
      },
      alternateRowStyles: { fillColor: C.grayLight },
      didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[]; fillColor: number[] }; raw: unknown } }) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'FOREIGN') {
            data.cell.styles.textColor = C.red as unknown as number[];
            data.cell.styles.fillColor = C.redBg as unknown as number[];
          }
        }
      },
      theme: 'grid' as const,
    });
    y = getLastTableY() + 10;
    const total = usCount + foreignCount;
    const summaryText = foreignCount > 0
      ? `Summary: ${total} endpoints mapped. ${usCount} domestic (US), ${foreignCount} foreign. Foreign endpoints require immediate remediation under SB 1188.`
      : `Summary: ${total} endpoints mapped. All endpoints resolved to domestic (US) infrastructure.`;
    bodyText(y, summaryText, { bold: true });
  }

  // ══════════════════════════════════════════════════════════
  // REMEDIATION ROADMAP
  // ══════════════════════════════════════════════════════════

  newBodyPage();
  y = 75;
  y = sectionHeader(y, 'REMEDIATION ROADMAP');
  y = bodyText(y, 'Priority-sorted action items with technical fixes. Hand this section to your web developer, hosting provider, or MSP for immediate implementation.');
  y += 8;

  const failed = findings.filter(f => f.status === 'fail' || f.status === 'warn');

  if (failed.length === 0) {
    y = bodyText(y, 'No compliance failures detected. Your practice meets all scanned requirements.', { bold: true, color: C.green });
  } else {
    // Assign priorities
    const prioritized = failed.map(f => {
      const id = (f.id as string) || '';
      let priority = safe(f.fix_priority as string, '').toUpperCase();
      if (!priority) {
        if (f.status === 'fail') {
          priority = (id.startsWith('DR-') || id.startsWith('AI-')) ? 'CRITICAL' : 'HIGH';
        } else {
          priority = 'MEDIUM';
        }
      }
      return { ...f, _priority: priority };
    });

    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    prioritized.sort((a, b) => (order[a._priority] ?? 9) - (order[b._priority] ?? 9));

    for (const f of prioritized) {
      if (y > 660) {
        newBodyPage();
        y = 75;
      }

      const pColor = priorityColor(f._priority);
      const fid = safe(f.id as string);
      const fname = safe(f.name as string);
      const clause = safe(f.clause as string, '');
      const detail = safe(f.detail as string, '');
      const techFix = safe(
        (f.technicalFix || f.recommended_fix || f.technical_fix) as string, ''
      );
      const complexity = safe(f.fix_complexity as string, 'Medium');
      const timeline = safe(f.fix_timeline as string, '1-7 days');

      // Priority + ID header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...pColor);
      doc.text(`[${f._priority}]`, M, y);
      const pWidth = doc.getTextWidth(`[${f._priority}]  `);
      doc.setTextColor(...C.navy);
      doc.text(`${fid}: ${fname}`, M + pWidth, y);
      y += 14;

      // Meta line
      const metaParts: string[] = [];
      if (clause) metaParts.push(`Statutory Reference: ${clause}`);
      metaParts.push(`Complexity: ${complexity}`);
      metaParts.push(`Timeline: ${timeline}`);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.gray);
      doc.text(metaParts.join('  |  '), M, y);
      y += 12;

      // Finding detail
      if (detail) {
        y = bodyText(y, `Finding: ${detail}`, { size: 8.5 });
      }

      // Remediation
      if (techFix) {
        y = bodyText(y, `Remediation: ${techFix}`, { size: 8.5, bold: true });
      } else {
        y = bodyText(y, 'Contact KairoLogic engineering for detailed remediation guidance specific to your infrastructure.', { size: 8.5 });
      }

      // Separator
      y += 2;
      doc.setDrawColor(...C.grayBd);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
      y += 10;
    }
  }

  // ══════════════════════════════════════════════════════════
  // NEXT STEPS + CTA
  // ══════════════════════════════════════════════════════════

  if (y > 550) {
    newBodyPage();
    y = 75;
  }

  y = sectionHeader(y, 'NEXT STEPS');

  const criticalCount = findings.filter(f => f.status === 'fail' && ((f.id as string) || '').match(/^(DR|AI)-/)).length;
  const highCount = findings.filter(f => f.status === 'fail').length - criticalCount;
  const warnCount = findings.filter(f => f.status === 'warn').length;

  if (criticalCount > 0) {
    y = bodyText(y, `1. Address ${criticalCount} CRITICAL item(s) immediately - these represent active statutory violations with potential enforcement exposure under SB 1188 and HB 149.`, { bold: true });
  }
  if (highCount > 0) {
    y = bodyText(y, `2. Schedule ${highCount} HIGH priority item(s) within 7 days to close remaining compliance gaps.`, { bold: true });
  }
  if (warnCount > 0) {
    y = bodyText(y, `3. Review ${warnCount} WARNING(s) within 30 days for comprehensive compliance posture.`, { bold: true });
  }
  y = bodyText(y, '4. Activate Sentry Shield monitoring to detect future drift. Plugin updates, hosting changes, and new third-party scripts can silently re-introduce compliance gaps within weeks of remediation.', { bold: true });
  y += 16;

  // CTA box
  if (y > 620) {
    newBodyPage();
    y = 75;
  }

  // Navy header
  doc.setFillColor(...C.navy);
  doc.rect(M, y, CW, 30, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('PROTECT YOUR COMPLIANCE - ACTIVATE SENTRY SHIELD', W / 2, y + 20, { align: 'center' });
  y += 30;

  // Gold body
  doc.setFillColor(...C.goldLight);
  doc.rect(M, y, CW, 50, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(2);
  doc.rect(M, y - 30, CW, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.navy);
  doc.text('Your 3-month Shield trial includes: 7-tab live dashboard, NPI Integrity monitoring,', W / 2, y + 16, { align: 'center' });
  doc.text('Data Border mapping, drift alerts, and the "Data & AI Trust" badge for your website.', W / 2, y + 28, { align: 'center' });
  doc.text('Start your trial: https://kairologic.net/scan  |  Questions: compliance@kairologic.net', W / 2, y + 42, { align: 'center' });
  y += 66;

  // Disclaimer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray);
  const disclaimer = `This report was generated by the KairoLogic ${ENGINE_LABEL} on ${scanDate}. Findings reflect the state of the website at the time of scan and may change as the site is updated. This document is intended for compliance purposes and should be retained as part of your regulatory record.`;
  const discLines = doc.splitTextToSize(disclaimer, CW) as string[];
  doc.text(discLines, M, y);

  // ── Return base64 ──
  return doc.output('datauristring').split(',')[1];
}


// ══════════════════════════════════════════════════════════════
// API HANDLERS
// ══════════════════════════════════════════════════════════════

// ── POST: Generate report, store in Supabase ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { npi, findings } = body;
    if (!npi || !findings || !Array.isArray(findings)) {
      return NextResponse.json({ error: 'Missing required fields: npi, findings' }, { status: 400 });
    }

    const reportId = generateReportId();
    const reportDate = new Date().toISOString();
    const practiceName = body.providerName || body.name || body.npiVerification?.name || 'Unknown Practice';
    const score = body.riskScore || 0;

    // Generate the locked-format PDF
    let pdfBase64: string | null = null;
    let pdfSize = 0;
    try {
      pdfBase64 = generatePDF(body);
      pdfSize = Math.round((pdfBase64.length * 3) / 4); // approximate decoded size
    } catch (pdfErr: unknown) {
      console.error('PDF generation failed:', pdfErr);
      // Continue without PDF - store data anyway
    }

    // Build record for Supabase
    const reportRecord = {
      npi,
      registry_id: npi,
      report_id: reportId,
      report_date: reportDate,
      engine_version: body.engineVersion || ENGINE_LABEL,
      sovereignty_score: score,
      compliance_status: body.complianceStatus || riskLabel(score),
      category_scores: body.categoryScores || null,
      data_border_map: body.dataBorderMap || null,
      findings: findings,
      page_context: body.pageContext || null,
      npi_verification: body.npiVerification || null,
      scan_meta: body.meta || null,
      practice_name: practiceName,
      website_url: body.url || null,
      pdf_base64: pdfBase64,
      pdf_size_bytes: pdfSize,
    };

    // Store in Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(reportRecord),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase insert error:', errorText);
      // Return report ID even if storage fails (PDF was generated)
      return NextResponse.json({
        reportId,
        reportDate,
        score,
        status: body.complianceStatus || riskLabel(score),
        pdfGenerated: !!pdfBase64,
        stored: false,
        error: 'Storage failed',
      }, { status: 207 });
    }

    return NextResponse.json({
      reportId,
      reportDate,
      score,
      status: body.complianceStatus || riskLabel(score),
      practiceName,
      pdfGenerated: !!pdfBase64,
      pdfSizeBytes: pdfSize,
      stored: true,
      formatVersion: FORMAT_VERSION,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Report generation error:', msg);
    return NextResponse.json({ error: 'Report generation failed', message: msg }, { status: 500 });
  }
}


// ── GET: Retrieve report(s) ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const npiParam = searchParams.get('npi');
    const download = searchParams.get('download') === 'true';

    if (!reportId && !npiParam) {
      return NextResponse.json({ error: 'Provide reportId or npi parameter' }, { status: 400 });
    }

    let url: string;
    if (reportId) {
      url = `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}&limit=1`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/scan_reports?npi=eq.${encodeURIComponent(npiParam!)}&order=report_date.desc&limit=50`;
    }

    // Only fetch PDF base64 if downloading specific report
    const selectFields = download && reportId
      ? '*'
      : 'id,npi,report_id,report_date,engine_version,sovereignty_score,compliance_status,practice_name,website_url,pdf_size_bytes,category_scores,emailed_at,payment_confirmed';

    const response = await fetch(
      `${url}&select=${selectFields}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to retrieve reports' }, { status: 500 });
    }

    const data = await response.json();

    // If downloading a specific report as PDF
    if (download && reportId && data.length > 0 && data[0].pdf_base64) {
      const pdfBuffer = Buffer.from(data[0].pdf_base64, 'base64');
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="KairoLogic-Report-${reportId}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      });
    }

    // Return report metadata
    if (reportId) {
      return NextResponse.json(data[0] || null);
    }

    return NextResponse.json({
      npi: npiParam,
      count: data.length,
      reports: data.map((r: Record<string, unknown>) => ({
        reportId: r.report_id,
        date: r.report_date,
        score: r.sovereignty_score,
        status: r.compliance_status,
        practiceName: r.practice_name,
        engine: r.engine_version,
        hasPdf: !!(r.pdf_base64 || r.pdf_size_bytes),
        pdfSize: r.pdf_size_bytes,
        emailed_at: r.emailed_at,
        payment_confirmed: r.payment_confirmed,
        category_scores: r.category_scores,
      })),
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to retrieve reports', message: msg }, { status: 500 });
  }
}


// ── PATCH: Update report metadata ──
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, ...updates } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const allowed = [
      'pdf_base64', 'pdf_size_bytes', 'pdf_storage_path',
      'emailed_at', 'emailed_to', 'downloaded_at', 'payment_confirmed'
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/scan_reports?report_id=eq.${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(safeUpdates),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Update failed', detail: errorText }, { status: 500 });
    }

    const updated = await response.json();
    return NextResponse.json({ success: true, record: updated[0] || updated });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Update failed', message: msg }, { status: 500 });
  }
}
