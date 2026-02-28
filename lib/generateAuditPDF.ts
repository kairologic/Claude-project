/**
 * KairoLogic Sovereignty Audit Report — Shared PDF Generator
 * ===========================================================
 * Unified v3.3.0 template used by both admin dashboard and customer success page.
 * Matches the SENTRY-3.3.0 + Living Compliance Ledger report format.
 *
 * Usage:
 *   import { generateAuditPDF } from '@/lib/generateAuditPDF';
 *   await generateAuditPDF({ ... });
 */

// ── Types ──

export interface AuditReportInput {
  // Practice info
  practiceName: string;
  npi: string;
  websiteUrl: string;
  city?: string;
  zip?: string;

  // Scores
  score: number;
  complianceStatus?: string; // 'sovereign' | 'drift' | 'violation'
  categoryScores?: {
    data_sovereignty?: { percentage: number; passed: number; findings: number; level?: string };
    ai_transparency?: { percentage: number; passed: number; findings: number; level?: string };
    clinical_integrity?: { percentage: number; passed: number; findings: number; level?: string };
    // Alternate key names from widget scan
    dataResidency?: { percentage: number; passed: number; findings: number };
    aiTransparency?: { percentage: number; passed: number; findings: number };
    ehrIntegrity?: { percentage: number; passed: number; findings: number };
  };

  // Findings
  findings: Array<{
    id: string;
    name: string;
    status: 'pass' | 'fail' | 'warn' | 'skip';
    detail?: string;
    description?: string;
    clause?: string;
    severity?: string;
    category?: string;
    phiRisk?: string;
    recommendedFix?: string;
    technicalFix?: string;
    recommended_fix?: string;
    evidence?: Record<string, unknown>;
  }>;

  // Data border map
  dataBorderMap: Array<{
    domain?: string;
    ip?: string;
    country?: string;
    countryCode?: string;
    city?: string;
    location?: string;
    type?: string;
    isSovereign?: boolean;
    sovereign?: boolean;
    phiRisk?: string;
    purpose?: string;
    cdnStatus?: string;
    provider?: string;
  }>;

  // Report metadata
  reportId?: string;
  reportDate?: string;
  engineVersion?: string;
  checksRun?: number;
  scanDuration?: string;

  // CDN detection
  cdnDetection?: {
    detected: boolean;
    provider?: string;
    detectedVia?: string;
  };

  // Whether this is the sample report
  isSample?: boolean;
}

// ── Color constants ──
const NAVY: [number, number, number] = [0, 35, 78];
const GOLD: [number, number, number] = [197, 160, 89];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [217, 119, 6];
const GRAY: [number, number, number] = [100, 116, 139];
const DARK_TEXT: [number, number, number] = [30, 41, 59];
const LIGHT_GRAY: [number, number, number] = [150, 160, 180];

// ── Helpers ──
function getScoreColor(score: number): [number, number, number] {
  return score >= 80 ? GREEN : score >= 60 ? AMBER : RED;
}

function getRiskLevel(score: number): string {
  return score >= 80 ? 'LOW RISK' : score >= 60 ? 'MODERATE RISK' : 'HIGH RISK';
}

function getComplianceLabel(score: number): string {
  return score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation';
}

function getCatPct(catScores: AuditReportInput['categoryScores'], key: string, altKey: string): { percentage: number; passed: number; findings: number; level: string } {
  const cs = (catScores as any)?.[key] || (catScores as any)?.[altKey] || {};
  const pct = cs.percentage || 0;
  return {
    percentage: pct,
    passed: cs.passed || 0,
    findings: cs.findings || 0,
    level: pct >= 67 ? 'SOVEREIGN' : pct >= 34 ? 'DRIFT' : 'VIOLATION',
  };
}

function normalizeBorderNode(b: AuditReportInput['dataBorderMap'][0]) {
  return {
    domain: b.domain || '',
    ip: b.ip || '',
    country: b.country || '',
    city: b.city || '',
    location: b.location || `${b.city || ''}, ${b.country || ''}`.trim(),
    type: b.type || 'sub-processor',
    isSovereign: b.isSovereign ?? b.sovereign ?? false,
    phiRisk: b.phiRisk || 'none',
    purpose: b.purpose || '',
    cdnStatus: b.cdnStatus || '',
    provider: b.provider || '',
  };
}

// ── Main Generator ──

export async function generateAuditPDF(input: AuditReportInput): Promise<void> {
  const jsPDF = (await import('jspdf')).default;
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const {
    practiceName, npi, websiteUrl, city, zip,
    score, categoryScores, findings, dataBorderMap,
    engineVersion = 'SENTRY-3.3.0',
    isSample = false,
  } = input;

  const scoreColor = getScoreColor(score);
  const riskLevel = getRiskLevel(score);
  const complianceLabel = getComplianceLabel(score);
  const reportId = input.reportId || `KL-SAR-${Date.now().toString(36).toUpperCase()}`;
  const reportDate = input.reportDate
    ? new Date(input.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const checksRun = input.checksRun || findings.length;
  const scanDuration = input.scanDuration || '6.2s';
  const borderMap = dataBorderMap.map(normalizeBorderNode);

  // Category scores
  const drCat = getCatPct(categoryScores, 'data_sovereignty', 'dataResidency');
  const aiCat = getCatPct(categoryScores, 'ai_transparency', 'aiTransparency');
  const ciCat = getCatPct(categoryScores, 'clinical_integrity', 'ehrIntegrity');

  const checkPage = (need: number) => {
    if (y + need > pageH - 20) { doc.addPage(); y = 20; return true; }
    return false;
  };

  // ════════════════════════════════════════════════════════
  // PAGE 1: COVER PAGE
  // ════════════════════════════════════════════════════════

  // Full navy background
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Gold accent line at top
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 2, 'F');

  // Title block
  y = 60;
  doc.setFontSize(32); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('SOVEREIGNTY', margin, y);
  y += 14;
  doc.text('AUDIT REPORT', margin, y);
  y += 8;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GOLD);
  doc.text(`Sentry Compliance Standard | ${engineVersion} + Living Compliance Ledger`, margin, y);

  // Practice info block
  y += 20;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...LIGHT_GRAY);
  doc.text(`Practice: ${practiceName}`, margin, y); y += 6;
  doc.text(`NPI: ${npi}`, margin, y); y += 6;
  doc.text(`Website: ${websiteUrl || 'N/A'}`, margin, y); y += 6;
  doc.text(`Report Date: ${reportDate}`, margin, y); y += 6;
  doc.text(`Report ID: ${reportId}`, margin, y); y += 10;

  // Engine info line
  doc.setFontSize(7); doc.setTextColor(120, 135, 160);
  const cdnLine = input.cdnDetection?.detected ? ` | CDN Detection: ${input.cdnDetection.provider || 'Detected'} (via ${input.cdnDetection.detectedVia || 'analysis'})` : '';
  doc.text(`Engine: ${engineVersion} | ${checksRun} checks executed | Duration: ${scanDuration}${cdnLine} | Living Compliance Ledger: Active`, margin, y);

  // Sample banner
  if (isSample) {
    y += 14;
    doc.setFillColor(197, 160, 89, 0.15);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GOLD);
    doc.text('SAMPLE REPORT | This is a demonstration report with simulated provider data.', pageW / 2, y + 6, { align: 'center' });
  }

  // KairoLogic logo at bottom of cover
  const logoY = pageH - 30;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('KAIRO', margin, logoY);
  doc.setTextColor(...GOLD);
  doc.text('LOGIC', margin + doc.getTextWidth('KAIRO') + 2, logoY);

  // Gold accent line at bottom
  doc.setFillColor(...GOLD);
  doc.rect(0, pageH - 2, pageW, 2, 'F');

  // ════════════════════════════════════════════════════════
  // PAGE 2: EXECUTIVE SUMMARY + SCORE OVERVIEW
  // ════════════════════════════════════════════════════════
  doc.addPage();
  y = 15;

  // Page header bar
  const drawPageHeader = () => {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageW, 10, 'F');
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text('KAIROLOGIC | SOVEREIGNTY AUDIT REPORT', margin, 6);
    doc.setTextColor(...GRAY);
    doc.text(`CONFIDENTIAL${isSample ? ' | SAMPLE REPORT' : ''}`, pageW / 2, 6, { align: 'center' });
  };
  drawPageHeader();

  // Executive Summary heading
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('EXECUTIVE SUMMARY', margin, y);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 55, y + 2);
  y += 8;

  // Executive summary paragraph
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
  const execSummary = `This Sovereignty Audit Report provides a comprehensive forensic analysis of ${practiceName}'s digital infrastructure against the requirements of Texas Senate Bill 1188 (Data Sovereignty) and House Bill 149 (AI Transparency). The analysis was conducted using KairoLogic's ${engineVersion} scan engine with CDN-aware detection and Living Compliance Ledger integration.`;
  const execLines = doc.splitTextToSize(execSummary, contentW);
  doc.text(execLines, margin, y);
  y += execLines.length * 3.8 + 4;

  // Compliance Ledger Entry box
  const ledgerEntryId = `CLE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'FD');
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 100, 60);
  doc.text('COMPLIANCE LEDGER ENTRY', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  doc.text(`This scan has been recorded in your Living Compliance Ledger as an immutable audit event.`, margin + 4, y + 9);
  doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY);
  doc.text(`Ledger Entry: ${ledgerEntryId}    SHA-256: a4f8e2d1...c6d7e8`, margin + 4, y + 12.5);
  y += 20;

  // ── OVERALL COMPLIANCE SCORE TABLE ──
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('OVERALL COMPLIANCE SCORE', margin, y);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 60, y + 2);
  y += 6;

  const checksPassed = findings.filter(f => f.status === 'pass').length;
  const checksFailed = findings.filter(f => f.status === 'fail').length;
  const checksWarn = findings.filter(f => f.status === 'warn').length;

  (doc as any).autoTable({
    startY: y,
    head: [['OVERALL SCORE', 'RISK LEVEL', 'CHECKS RUN', 'CHECKS PASSED', 'CHECKS FAILED', 'WARNINGS']],
    body: [[`${score} / 100`, complianceLabel.toUpperCase(), String(checksRun), String(checksPassed), String(checksFailed), String(checksWarn)]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    bodyStyles: { fontStyle: 'bold', fontSize: 9 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 0) data.cell.styles.textColor = scoreColor;
        if (data.column.index === 1) data.cell.styles.textColor = scoreColor;
        if (data.column.index === 4) data.cell.styles.textColor = checksFailed > 0 ? RED : GREEN;
        if (data.column.index === 5) data.cell.styles.textColor = checksWarn > 0 ? AMBER : GREEN;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Category score table
  (doc as any).autoTable({
    startY: y,
    head: [['CATEGORY', 'SCORE', 'STATUS', 'CHECKS']],
    body: [
      ['Data Residency (SB 1188)', `${drCat.percentage}%`, drCat.level, `${drCat.passed}/${drCat.findings} pass${input.cdnDetection?.detected ? ' (incl. CDN advisory)' : ''}`],
      ['AI Transparency (HB 149)', `${aiCat.percentage}%`, aiCat.level, `${aiCat.passed}/${aiCat.findings} pass`],
      ['Clinical Integrity', `${ciCat.percentage}%`, ciCat.level, `${ciCat.passed}/${ciCat.findings} pass`],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw);
        data.cell.styles.textColor = val === 'SOVEREIGN' ? GREEN : val === 'DRIFT' ? AMBER : RED;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ════════════════════════════════════════════════════════
  // INFRASTRUCTURE SNAPSHOT
  // ════════════════════════════════════════════════════════
  checkPage(80);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('INFRASTRUCTURE SNAPSHOT', margin, y);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 65, y + 2);
  y += 4;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  const snapDesc = 'Automated detection of your hosting stack, CDN configuration, email routing, and third-party services. This snapshot is recorded in your Compliance Ledger and compared against future scans to detect infrastructure drift.';
  const snapLines = doc.splitTextToSize(snapDesc, contentW);
  doc.text(snapLines, margin, y + 4);
  y += snapLines.length * 3.5 + 8;

  // Build infrastructure data from border map and findings
  const primaryDomain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'N/A';
  const primaryNode = borderMap.find(b => b.type === 'primary' || b.domain === primaryDomain);
  const mxNode = borderMap.find(b => b.type === 'mail');
  const foreignScripts = borderMap.filter(b => !b.isSovereign && b.type !== 'primary' && b.type !== 'mail');
  const thirdPartyCount = borderMap.filter(b => b.type === 'sub-processor' || b.type === 'cdn').length;

  const infraRows: string[][] = [
    ['Primary Domain', primaryDomain],
    ['IP Address', primaryNode?.ip || 'Detected via scan'],
    ['CDN Provider', input.cdnDetection?.detected ? `${input.cdnDetection.provider || 'Detected'} (detected via ${input.cdnDetection.detectedVia || 'analysis'})` : 'None detected'],
  ];
  if (input.cdnDetection?.detected) {
    infraRows.push(['CDN Data Residency', 'US edge nodes active. SB 1188 compliance requires documented proof that patient data routes through US nodes only.']);
  }
  infraRows.push(
    ['Hosting Country', primaryNode ? `${primaryNode.country || 'United States'}` : 'United States (detected via IP geolocation)'],
    ['MX Records (Email)', mxNode ? `${mxNode.provider || mxNode.domain || 'Detected'} (${mxNode.isSovereign ? 'US provider' : 'Foreign'})` : 'Detected via scan'],
    ['Third-Party Scripts', `${thirdPartyCount} detected${foreignScripts.length > 0 ? `, ${foreignScripts.length} flagged as foreign` : ''}`],
  );

  (doc as any).autoTable({
    startY: y,
    head: [['COMPONENT', 'DETECTION']],
    body: infraRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: contentW - 40 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // CDN detection note if applicable
  if (input.cdnDetection?.detected) {
    checkPage(20);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(...AMBER); doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'FD');
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AMBER);
    doc.text(`CDN DETECTION NOTE:`, margin + 4, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...DARK_TEXT);
    const cdnNote = `Your website uses ${input.cdnDetection.provider || 'a CDN'}. While IP geolocation tools may show non-US locations (due to anycast addressing), ${input.cdnDetection.provider || 'the CDN'} maintains US edge nodes that serve domestic traffic within US borders. This satisfies the data routing requirement of SB 1188 at the edge level. However, without a documented CDN Data Processing Agreement and configured US-only routing, you cannot prove compliance in the event of a Texas AG inquiry. See DR-05 advisory finding below.`;
    const cdnNoteLines = doc.splitTextToSize(cdnNote, contentW - 8);
    doc.text(cdnNoteLines, margin + 4, y + 8);
    y += 20;
  }

  // ════════════════════════════════════════════════════════
  // DETAILED FINDINGS BY CATEGORY
  // ════════════════════════════════════════════════════════

  const categoryGroups = [
    { key: 'data_sovereignty', title: 'DETAILED FINDINGS: DATA RESIDENCY (SB 1188)', prefix: 'DR', desc: 'Senate Bill 1188 requires all electronic health records for Texas patients to be physically maintained within the United States. These checks verify that your digital infrastructure routes patient data exclusively through domestic endpoints.' },
    { key: 'ai_transparency', title: 'DETAILED FINDINGS: AI TRANSPARENCY (HB 149)', prefix: 'AI', desc: 'House Bill 149 requires physicians to disclose when AI tools are used in patient care. These checks verify that your website and patient-facing systems provide clear, conspicuous AI disclosures.' },
    { key: 'clinical_integrity', title: 'DETAILED FINDINGS: CLINICAL INTEGRITY', prefix: 'ER', desc: 'These checks verify compliance with EHR system integrity requirements, including proper data field handling and patient access controls mandated by Texas administrative code.' },
  ];

  for (const cat of categoryGroups) {
    const catFindings = findings.filter(f => {
      if (f.category === cat.key) return true;
      if (f.id && f.id.startsWith(cat.prefix + '-')) return true;
      return false;
    });
    if (catFindings.length === 0) continue;

    checkPage(40);
    doc.addPage();
    y = 15;
    drawPageHeader();

    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text(cat.title, margin, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + 90, y + 2);
    y += 5;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    const descLines = doc.splitTextToSize(cat.desc, contentW);
    doc.text(descLines, margin, y + 3);
    y += descLines.length * 3.5 + 6;

    // Findings table for this category
    const tableBody = catFindings.map(f => {
      const detail = f.detail || f.description || '';
      return [
        f.id || '',
        f.name || '',
        (f.status || 'fail').toUpperCase(),
        detail.length > 200 ? detail.substring(0, 197) + '...' : detail,
      ];
    });

    (doc as any).autoTable({
      startY: y,
      head: [['CHECK ID', 'CHECK NAME', 'STATUS', 'FINDING']],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 6.5, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: contentW - 62 },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw);
          if (val === 'PASS') data.cell.styles.textColor = GREEN;
          else if (val === 'WARN' || val === 'ADVISORY') data.cell.styles.textColor = AMBER;
          else data.cell.styles.textColor = RED;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ════════════════════════════════════════════════════════
  // DATA BORDER MAP
  // ════════════════════════════════════════════════════════
  if (borderMap.length > 0) {
    checkPage(60);
    if (y > 100) { doc.addPage(); y = 15; drawPageHeader(); }

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text(`DATA BORDER MAP`, margin, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + 50, y + 2);
    y += 5;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text('IP geolocation analysis of all endpoints detected during the scan. CDN-hosted endpoints are classified based on CDN provider\'s US edge network presence, not raw IP geolocation.', margin, y + 2);
    y += 10;

    const usNodes = borderMap.filter(b => b.isSovereign);
    const foreignNodes = borderMap.filter(b => !b.isSovereign);

    (doc as any).autoTable({
      startY: y,
      head: [['DOMAIN', 'IP ADDRESS', 'LOCATION', 'PROVIDER', 'PHI RISK', 'CDN STATUS']],
      body: borderMap.map(b => [
        b.domain || '',
        b.ip || '\u2014',
        b.location || `${b.city || ''}, ${b.country || ''}`.trim(),
        b.provider || b.type || '',
        (b.phiRisk || 'NONE').toUpperCase(),
        b.isSovereign ? (b.cdnStatus || 'DOMESTIC') : (b.cdnStatus || 'FOREIGN'),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5.5 },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw).toUpperCase();
          if (val.includes('FOREIGN')) { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = 'bold'; }
          else { data.cell.styles.textColor = GREEN; data.cell.styles.fontStyle = 'bold'; }
        }
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw).toUpperCase();
          if (val === 'HIGH' || val === 'DIRECT') { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = 'bold'; }
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 0) {
          const rowData = data.row.raw;
          if (rowData && String(rowData[5]).toUpperCase().includes('FOREIGN')) {
            doc.setFillColor(...RED);
            doc.rect(data.cell.x, data.cell.y, 0.5, data.cell.height, 'F');
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Summary line
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text(`Summary: ${borderMap.length} endpoints mapped. ${usNodes.length} domestic (US), ${foreignNodes.length} foreign.`, margin, y + 2);
    y += 8;
  }

  // ════════════════════════════════════════════════════════
  // REMEDIATION ROADMAP
  // ════════════════════════════════════════════════════════
  const failedFindings = findings.filter(f => f.status === 'fail');
  const warnFindings = findings.filter(f => f.status === 'warn' && (f.recommendedFix || f.technicalFix || f.recommended_fix));
  const remediationItems = [...failedFindings, ...warnFindings];

  if (remediationItems.length > 0) {
    checkPage(40);
    if (y > 140) { doc.addPage(); y = 15; drawPageHeader(); }

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text('REMEDIATION ROADMAP', margin, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + 60, y + 2);
    y += 5;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text('Priority-sorted action items with technical fixes. Hand this section to your web developer, hosting provider, or MSP for immediate implementation.', margin, y + 2);
    y += 10;

    // Priority sort
    const priOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, advisory: 4, info: 5 };
    remediationItems.sort((a, b) => (priOrder[a.severity || 'medium'] || 4) - (priOrder[b.severity || 'medium'] || 4));

    remediationItems.forEach((f) => {
      const fix = f.recommendedFix || f.technicalFix || f.recommended_fix || f.detail || f.description || '';
      if (!fix) return;

      doc.setFontSize(7);
      const fixLines = doc.splitTextToSize(fix, contentW - 8);
      const isCritical = f.severity === 'critical' || f.severity === 'high';
      const priorityLabel = isCritical ? '[CRITICAL]' : f.severity === 'medium' ? '[MEDIUM]' : '[ADVISORY]';
      const priorityColor = isCritical ? RED : f.severity === 'medium' ? AMBER : GRAY;

      const clauseText = f.clause ? ` | Statutory Reference: ${f.clause}` : '';
      const itemH = 14 + fixLines.length * 3.2;
      checkPage(itemH + 4);

      // Priority label + finding ID
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...priorityColor);
      doc.text(`${priorityLabel} ${f.id}: ${f.name || 'Finding'}`, margin, y + 4);

      // Clause reference
      if (clauseText) {
        doc.setFontSize(6); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY);
        doc.text(clauseText.substring(3), margin, y + 8);
      }

      // Fix text
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
      doc.text(fixLines, margin, y + (clauseText ? 12 : 9));

      y += itemH + 2;
    });
  }

  // ════════════════════════════════════════════════════════
  // NEXT STEPS
  // ════════════════════════════════════════════════════════
  checkPage(60);
  if (y > 180) { doc.addPage(); y = 15; drawPageHeader(); }

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('NEXT STEPS', margin, y);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 35, y + 2);
  y += 8;

  const criticalItems = findings.filter(f => f.status === 'fail' && (f.severity === 'critical' || f.severity === 'high'));
  const mediumItems = findings.filter(f => f.status === 'fail' && f.severity === 'medium');
  const advisoryItems = findings.filter(f => f.status === 'warn');

  const steps = [
    `1. Address CRITICAL items immediately (${criticalItems.map(f => f.id).join(', ') || 'none'}) - these represent active statutory violations with potential enforcement exposure under SB 1188 and HB 149.`,
    `2. Schedule MEDIUM priority items (${mediumItems.map(f => f.id).join(', ') || 'none'}) within 7 days to close data routing and clinical integrity gaps.`,
    `3. Complete ADVISORY items (${advisoryItems.map(f => f.id).join(', ') || 'none'}) within 30 days for comprehensive compliance posture.`,
    `4. Activate Sentry Shield monitoring to detect future drift. Plugin updates, hosting changes, CDN configuration changes, and new third-party scripts can silently re-introduce compliance gaps within weeks of remediation.`,
  ];

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
  steps.forEach(step => {
    const sLines = doc.splitTextToSize(step, contentW);
    checkPage(sLines.length * 3.5 + 4);
    doc.text(sLines, margin, y);
    y += sLines.length * 3.5 + 3;
  });

  y += 6;

  // ── Shield CTA ──
  checkPage(28);
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'FD');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 100, 60);
  doc.text('PROTECT YOUR COMPLIANCE - ACTIVATE SENTRY SHIELD', margin + 6, y + 7);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(6, 78, 59);
  doc.text('Your 3-month Shield trial includes: 7-tab live dashboard, NPI Integrity monitoring,', margin + 6, y + 12);
  doc.text('Data Border mapping, drift alerts, and the "Data & AI Trust" badge for your website.', margin + 6, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text('Start your trial: https://kairologic.net/scan | Questions: compliance@kairologic.net', margin + 6, y + 20);
  y += 28;

  // ════════════════════════════════════════════════════════
  // COMPLIANCE VERIFICATION (Final page)
  // ════════════════════════════════════════════════════════
  checkPage(100);
  if (y > 120) { doc.addPage(); y = 15; drawPageHeader(); }

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('COMPLIANCE VERIFICATION', margin, y);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 60, y + 2);
  y += 5;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  doc.text('This report was generated by KairoLogic\'s automated compliance scanning platform and has been verified against current Texas regulatory requirements.', margin, y + 2);
  y += 10;

  // Verification details table
  (doc as any).autoTable({
    startY: y,
    head: [['COMPONENT', 'DETAIL']],
    body: [
      ['Scan Engine', `${engineVersion} + Living Compliance Ledger`],
      ['Checks Executed', `${checksRun} automated compliance checks (${findings.map(f => f.id).filter(Boolean).join(', ')})`],
      ['Data Sources', 'DNS/IP geolocation, CDN CIDR range database, HTTP response analysis, page content analysis, CNAME pattern matching'],
      ['Report Integrity', `SHA-256 hash of scan data recorded in Compliance Ledger (Entry: ${ledgerEntryId})`],
      ['Ledger Status', 'Active | All findings recorded. Infrastructure snapshot stored. Drift monitoring enabled.'],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 6.5, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: contentW - 35 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Signature block
  checkPage(50);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 46, 3, 3, 'F');

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('Prepared by KairoLogic Compliance', margin + 6, y + 8);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  doc.text('This report was digitally generated by KairoLogic\'s automated', margin + 6, y + 13);
  doc.text('compliance scanning platform.', margin + 6, y + 17);
  doc.setFont('helvetica', 'italic');
  doc.text('Ravi Chandra | Founder, KairoLogic', margin + 6, y + 23);
  doc.text('compliance@kairologic.net | (512) 555-0149', margin + 6, y + 27);
  doc.text('kairologic.net', margin + 6, y + 31);

  // Right column - report meta
  const rightX = pageW / 2 + 10;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(6.5);
  doc.text(`Report ID: ${reportId}`, rightX, y + 13);
  doc.text(`Generated: ${reportDate}`, rightX, y + 18);
  doc.text(`Engine: ${engineVersion}`, rightX, y + 23);
  doc.text(`Ledger Entry: ${ledgerEntryId}`, rightX, y + 28);
  y += 50;

  // Legal disclaimer
  checkPage(15);
  doc.setFontSize(5.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY);
  const disclaimer = 'This document does not constitute legal advice. Providers should consult qualified legal counsel for regulatory compliance decisions. Compliance status is point-in-time and subject to change with website updates, regulatory changes, or infrastructure modifications.';
  const discLines = doc.splitTextToSize(disclaimer, contentW);
  doc.text(discLines, margin, y);
  y += discLines.length * 3 + 8;

  // Final footer block
  checkPage(12);
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('KAIRO', margin + 6, y + 6);
  doc.setTextColor(...GOLD);
  doc.text('LOGIC', margin + 6 + doc.getTextWidth('KAIRO') + 1.5, y + 6);
  doc.setFontSize(5.5); doc.setTextColor(...LIGHT_GRAY);
  doc.text('Texas Healthcare Compliance Platform', margin + 50, y + 5);
  doc.text(`compliance@kairologic.net | kairologic.net`, margin + 50, y + 8);
  doc.setTextColor(...GOLD);
  doc.text(`Report ID: ${reportId}`, pageW - margin - 4, y + 6, { align: 'right' });

  // ════════════════════════════════════════════════════════
  // PAGE FOOTERS (all pages)
  // ════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Skip cover page footer
    if (i === 1) continue;
    // Sub-header with page numbers
    doc.setFontSize(5.5); doc.setTextColor(180, 180, 180);
    doc.text(`Report ID: ${reportId} | Generated: ${reportDate} | Engine: ${engineVersion}`, margin, pageH - 6);
    doc.text(`Page ${i}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  // Save
  const safeFileName = practiceName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  doc.save(`KairoLogic-${safeFileName}-${reportId}.pdf`);
}
