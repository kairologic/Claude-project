/**
 * lib/workflows/generate-nppes-form.ts
 *
 * Generates a 2-page NPPES correction report PDF using pdf-lib.
 * Pure JS, no native dependencies, Vercel-compatible.
 *
 * Page 1: Correction Report
 *   - Provider identity (name, NPI, practice)
 *   - Current NPPES data vs approved correction (side-by-side boxes)
 *   - Submission instructions (4 steps + timeline note)
 *   - Reference to page 2 visual guide
 *
 * Page 2: Visual Walkthrough
 *   - 4 annotated mockup panels showing the NPPES portal flow
 *   - Login, Find & Edit NPI, Update field, Error Check & Submit
 *   - Dynamic: adapts field labels/values for address vs phone vs other
 *
 * Usage:
 *   const pdfBytes = await generateNPPESForm({ ... });
 *   // Return as Response with content-type application/pdf
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// ── Colors ───────────────────────────────────────────────────────────────

const NAVY = rgb(15 / 255, 30 / 255, 46 / 255);
const GOLD = rgb(212 / 255, 160 / 255, 23 / 255);
const WHITE = rgb(1, 1, 1);
const GRAY_600 = rgb(75 / 255, 85 / 255, 99 / 255);
const GRAY_400 = rgb(156 / 255, 163 / 255, 175 / 255);
const GRAY_200 = rgb(229 / 255, 231 / 255, 235 / 255);
const GRAY_100 = rgb(243 / 255, 244 / 255, 246 / 255);
const GRAY_50 = rgb(249 / 255, 250 / 255, 251 / 255);
const RED = rgb(214 / 255, 69 / 255, 69 / 255);
const GREEN = rgb(26 / 255, 158 / 255, 109 / 255);
const BLUE = rgb(24 / 255, 95 / 255, 165 / 255);
const GOLD_PALE = rgb(253 / 255, 246 / 255, 227 / 255);
const GREEN_PALE = rgb(220 / 255, 252 / 255, 231 / 255);

// ── Types ────────────────────────────────────────────────────────────────

export interface NPPESFormData {
  workflowId: string;
  providerName: string;
  providerNpi: string;
  practiceName: string;

  field: string; // 'address_line_1' | 'phone' | etc.
  websiteValue: string;
  nppesValue: string;
  approvedValue: string;
  approvedSource: string; // 'website' | 'nppes' | 'custom'

  providerRecord?: {
    first_name?: string;
    last_name?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    primary_taxonomy_code?: string;
    taxonomy_desc?: string;
  };

  generatedAt?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatFieldLabel(field: string): string {
  const map: Record<string, string> = {
    address_line_1: 'Practice Address',
    address_line_2: 'Address Line 2',
    phone: 'Phone Number',
    primary_taxonomy_code: 'Taxonomy / Specialty',
    city: 'City',
    state: 'State',
    zip_code: 'ZIP Code',
  };
  return map[field] || field;
}

/** Which NPPES portal section contains this field */
function portalSection(field: string): string {
  if (field.startsWith('address') || field === 'city' || field === 'state' || field === 'zip_code')
    return 'Practice Location';
  if (field === 'phone') return 'Practice Location';
  if (field.includes('taxonomy')) return 'Taxonomies';
  return 'Provider Info';
}

function formatPhone(raw: string | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

function hline(page: PDFPage, y: number, x1: number, x2: number) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: GRAY_200 });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Numbered gold circle for callouts */
function drawCallout(page: PDFPage, cx: number, cy: number, label: string, font: PDFFont) {
  page.drawCircle({ x: cx, y: cy, size: 11, color: GOLD });
  const offset = label.length > 1 ? 5 : 3;
  page.drawText(label, { x: cx - offset, y: cy - 4, size: 9, font, color: WHITE });
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════

export async function generateNPPESForm(data: NPPESFormData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontR = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 612; // US Letter width
  const H = 792; // US Letter height
  const m = 50; // margin
  const cw = W - m * 2; // content width

  const genDate = data.generatedAt || new Date().toISOString();
  const dateStr = new Date(genDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const fieldLabel = formatFieldLabel(data.field);
  const section = portalSection(data.field);
  const isPhone = data.field === 'phone';

  // Display values (formatted for readability)
  const nppesDisplay = isPhone ? formatPhone(data.nppesValue) : data.nppesValue;
  const approvedDisplay = isPhone ? formatPhone(data.approvedValue) : data.approvedValue;

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Correction Report
  // ════════════════════════════════════════════════════════════════════════

  const p1 = doc.addPage([W, H]);
  let y = H;

  // ── Header bar ────────────────────────────────────────────────────────

  const headerH = 60;
  p1.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: NAVY });

  const kairoW = fontB.widthOfTextAtSize('Kairo', 18);
  p1.drawText('Kairo', { x: m, y: H - 38, size: 18, font: fontB, color: WHITE });
  p1.drawText('Logic', { x: m + kairoW, y: H - 38, size: 18, font: fontB, color: GOLD });

  const titleR = 'NPPES Correction Report';
  p1.drawText(titleR, {
    x: W - m - fontB.widthOfTextAtSize(titleR, 12),
    y: H - 32,
    size: 12,
    font: fontB,
    color: WHITE,
  });
  p1.drawText(dateStr, {
    x: W - m - fontR.widthOfTextAtSize(dateStr, 9),
    y: H - 46,
    size: 9,
    font: fontR,
    color: GRAY_400,
  });

  y = H - headerH - 30;

  // ── Provider Information ──────────────────────────────────────────────

  p1.drawText('Provider Information', { x: m, y, size: 11, font: fontB, color: NAVY });
  y -= 20;

  const infoRows: [string, string][] = [
    ['Provider Name', data.providerName],
    ['NPI', data.providerNpi],
    ['Practice', data.practiceName],
  ];

  const rec = data.providerRecord;
  if (rec) {
    if (rec.address_line_1) {
      const parts = [
        rec.address_line_1,
        rec.address_line_2,
        [rec.city, rec.state, rec.zip_code].filter(Boolean).join(', '),
      ].filter(Boolean);
      infoRows.push(['Current NPPES Address', parts.join(', ')]);
    }
    if (rec.phone) infoRows.push(['Current NPPES Phone', formatPhone(rec.phone)]);
    if (rec.taxonomy_desc) infoRows.push(['Taxonomy / Specialty', rec.taxonomy_desc]);
  }

  for (const [label, value] of infoRows) {
    p1.drawText(label, { x: m, y, size: 9, font: fontB, color: GRAY_600 });
    // Wrap long values
    const valLines = wrapText(value || '--', fontR, 9, cw - 145);
    for (const vl of valLines) {
      p1.drawText(vl, { x: m + 140, y, size: 9, font: fontR, color: NAVY });
      y -= 14;
    }
    y -= 2;
  }

  y -= 8;
  hline(p1, y, m, W - m);
  y -= 20;

  // ── Correction Details ────────────────────────────────────────────────

  p1.drawText('Correction Details', { x: m, y, size: 11, font: fontB, color: NAVY });
  y -= 6;
  p1.drawText(`Field being corrected: ${fieldLabel}`, {
    x: m,
    y,
    size: 9,
    font: fontR,
    color: GRAY_600,
  });
  y -= 24;

  // Side-by-side comparison boxes
  const bw = (cw - 16) / 2;
  const bh = 70;
  const bp = 10;

  // Left: Current NPPES (red accent)
  p1.drawRectangle({
    x: m,
    y: y - bh,
    width: bw,
    height: bh,
    color: GRAY_50,
    borderColor: GRAY_200,
    borderWidth: 1,
  });
  p1.drawRectangle({ x: m, y, width: bw, height: 3, color: RED });
  p1.drawText('CURRENT NPPES VALUE', { x: m + bp, y: y - 18, size: 8, font: fontB, color: RED });

  const nppesLines = wrapText(nppesDisplay, fontR, 10, bw - bp * 2);
  let nlY = y - 34;
  for (const nl of nppesLines) {
    p1.drawText(nl, { x: m + bp, y: nlY, size: 10, font: fontR, color: NAVY });
    nlY -= 14;
  }

  // Right: Approved correction (green accent)
  const rx = m + bw + 16;
  p1.drawRectangle({
    x: rx,
    y: y - bh,
    width: bw,
    height: bh,
    color: GRAY_50,
    borderColor: GRAY_200,
    borderWidth: 1,
  });
  p1.drawRectangle({ x: rx, y, width: bw, height: 3, color: GREEN });
  p1.drawText('APPROVED CORRECTION', { x: rx + bp, y: y - 18, size: 8, font: fontB, color: GREEN });

  const approvedLines = wrapText(approvedDisplay, fontB, 10, bw - bp * 2);
  let alY = y - 34;
  for (const al of approvedLines) {
    p1.drawText(al, { x: rx + bp, y: alY, size: 10, font: fontB, color: NAVY });
    alY -= 14;
  }

  // Arrow between boxes (WinAnsi safe)
  p1.drawText('>>', { x: m + bw + 4, y: y - bh / 2, size: 12, font: fontB, color: GOLD });

  y -= bh + 12;

  // Source note
  const sourceLabel =
    data.approvedSource === 'website'
      ? 'Approved from website data'
      : data.approvedSource === 'nppes'
        ? 'NPPES data confirmed correct'
        : 'Custom value entered by practice manager';
  p1.drawText(sourceLabel, { x: m, y, size: 8, font: fontR, color: GRAY_400 });

  y -= 20;
  hline(p1, y, m, W - m);
  y -= 24;

  // ── How to Submit This Correction ─────────────────────────────────────

  p1.drawText('How to Submit This Correction', { x: m, y, size: 11, font: fontB, color: NAVY });
  y -= 20;

  const steps = [
    `1.  Log in to the NPPES portal at https://nppes.cms.hhs.gov/`,
    `2.  Find and edit the NPI application for this provider.`,
    `3.  Navigate to the ${section} section and enter the approved ${fieldLabel.toLowerCase()}.`,
    `4.  Run Error Check, then submit the updated application.`,
  ];
  for (const s of steps) {
    p1.drawText(s, { x: m, y, size: 9, font: fontR, color: GRAY_600 });
    y -= 15;
  }

  y -= 6;

  // Timeline + auto-monitoring lines (kept from original, important context)
  const followUp = [
    'NPPES typically processes updates within 1-2 business weeks. KairoLogic will',
    'automatically detect the update during our weekly sync and close this workflow',
    'when confirmed.',
  ];
  for (const line of followUp) {
    p1.drawText(line, { x: m, y, size: 9, font: fontR, color: GRAY_600 });
    y -= 14;
  }

  y -= 8;

  // Page 2 reference
  p1.drawText('See page 2 for a step-by-step visual walkthrough with annotated screenshots.', {
    x: m,
    y,
    size: 9,
    font: fontB,
    color: BLUE,
  });
  y -= 24;

  // Note box
  const noteH = 50;
  p1.drawRectangle({
    x: m,
    y: y - noteH,
    width: cw,
    height: noteH,
    color: GOLD_PALE,
    borderColor: GOLD,
    borderWidth: 1,
  });
  p1.drawText('Note:', { x: m + 10, y: y - 18, size: 9, font: fontB, color: NAVY });
  p1.drawText(
    'If you have already submitted this correction, no action is needed. KairoLogic monitors',
    { x: m + 10, y: y - 32, size: 8, font: fontR, color: GRAY_600 },
  );
  p1.drawText(
    'NPPES weekly and will automatically close this workflow when the update appears live.',
    { x: m + 10, y: y - 42, size: 8, font: fontR, color: GRAY_600 },
  );

  // Footer
  hline(p1, 56, m, W - m);
  p1.drawText(`Workflow ID: ${data.workflowId}`, {
    x: m,
    y: 40,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });
  p1.drawText(`Generated: ${new Date(genDate).toISOString()}`, {
    x: m,
    y: 30,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });
  p1.drawText('kairologic.net', {
    x: W - m - fontR.widthOfTextAtSize('kairologic.net', 7),
    y: 40,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });
  p1.drawText('Confidential - For practice use only', {
    x: W - m - fontR.widthOfTextAtSize('Confidential - For practice use only', 7),
    y: 30,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 — NPPES Portal Visual Walkthrough
  // ════════════════════════════════════════════════════════════════════════

  const p2 = doc.addPage([W, H]);
  y = H;

  // Smaller header bar
  const h2H = 44;
  p2.drawRectangle({ x: 0, y: H - h2H, width: W, height: h2H, color: NAVY });
  const kw2 = fontB.widthOfTextAtSize('Kairo', 14);
  p2.drawText('Kairo', { x: m, y: H - 28, size: 14, font: fontB, color: WHITE });
  p2.drawText('Logic', { x: m + kw2, y: H - 28, size: 14, font: fontB, color: GOLD });
  const walkTitle = 'NPPES Portal Walkthrough';
  p2.drawText(walkTitle, {
    x: W - m - fontB.widthOfTextAtSize(walkTitle, 11),
    y: H - 28,
    size: 11,
    font: fontB,
    color: WHITE,
  });

  y = H - h2H - 16;
  p2.drawText('Follow these steps in the NPPES portal at nppes.cms.hhs.gov', {
    x: m,
    y,
    size: 9,
    font: fontR,
    color: GRAY_600,
  });
  y -= 24;

  // ── Panel drawing helper ──────────────────────────────────────────────

  function drawPanel(
    page: PDFPage,
    startY: number,
    stepNum: number,
    title: string,
    desc: string,
    panelH: number,
    mockupFn: (page: PDFPage, px: number, py: number, pw: number, ph: number) => void,
  ): number {
    // Step circle + title + description
    drawCallout(page, m + 11, startY - 8, String(stepNum), fontB);
    page.drawText(title, { x: m + 28, y: startY - 12, size: 10, font: fontB, color: NAVY });
    page.drawText(desc, { x: m + 28, y: startY - 24, size: 8, font: fontR, color: GRAY_600 });

    // Mockup box
    const mockY = startY - 36;
    const mockH = panelH - 40;
    page.drawRectangle({
      x: m,
      y: mockY - mockH,
      width: cw,
      height: mockH,
      color: WHITE,
      borderColor: GRAY_200,
      borderWidth: 1,
    });

    mockupFn(page, m, mockY, cw, mockH);

    return startY - panelH - 12;
  }

  // ── STEP 1: Login ─────────────────────────────────────────────────────

  y = drawPanel(
    p2,
    y,
    1,
    'Log in to NPPES',
    'Go to nppes.cms.hhs.gov and sign in with your CMS Identity & Access credentials.',
    130,
    (page, px, py, pw, ph) => {
      // CMS header
      page.drawRectangle({ x: px + 1, y: py - 1, width: pw - 2, height: 18, color: BLUE });
      page.drawText('CMS  |  NPPES', { x: px + 8, y: py - 13, size: 8, font: fontB, color: WHITE });
      page.drawText('National Plan & Provider Enumeration System', {
        x: px + 70,
        y: py - 13,
        size: 7,
        font: fontR,
        color: rgb(180 / 255, 210 / 255, 240 / 255),
      });

      // Login form
      const fx = px + pw / 2 - 80;
      const fy = py - 32;
      page.drawText('Sign In', { x: fx, y: fy, size: 9, font: fontB, color: NAVY });

      page.drawText('User ID', { x: fx, y: fy - 13, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx,
        y: fy - 28,
        width: 160,
        height: 16,
        color: WHITE,
        borderColor: GRAY_200,
        borderWidth: 1,
      });

      page.drawText('Password', { x: fx, y: fy - 37, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx,
        y: fy - 52,
        width: 160,
        height: 16,
        color: WHITE,
        borderColor: GRAY_200,
        borderWidth: 1,
      });

      page.drawRectangle({ x: fx, y: fy - 72, width: 60, height: 16, color: BLUE });
      page.drawText('Sign In', { x: fx + 12, y: fy - 68, size: 8, font: fontB, color: WHITE });

      // Callout
      drawCallout(page, fx + 175, fy - 68, 'A', fontB);
      page.drawText('Use your CMS I&A login', {
        x: fx + 190,
        y: fy - 72,
        size: 7,
        font: fontB,
        color: GOLD,
      });
    },
  );

  // ── STEP 2: Find & Edit NPI ───────────────────────────────────────────

  y = drawPanel(
    p2,
    y,
    2,
    'Find and edit the NPI',
    'Click the magnifying glass to view, then the pencil icon to edit the NPI application.',
    130,
    (page, px, py, pw, ph) => {
      page.drawRectangle({ x: px + 1, y: py - 1, width: pw - 2, height: 18, color: BLUE });
      page.drawText('CMS  |  NPPES', { x: px + 8, y: py - 13, size: 8, font: fontB, color: WHITE });

      const lx = px + 12;
      const ly = py - 28;
      page.drawText('My NPIs', { x: lx, y: ly, size: 9, font: fontB, color: NAVY });

      // Table header
      page.drawRectangle({ x: lx, y: ly - 20, width: pw - 24, height: 14, color: GRAY_100 });
      page.drawText('NPI', { x: lx + 4, y: ly - 17, size: 7, font: fontB, color: GRAY_600 });
      page.drawText('Name', { x: lx + 70, y: ly - 17, size: 7, font: fontB, color: GRAY_600 });
      page.drawText('Type', { x: lx + 240, y: ly - 17, size: 7, font: fontB, color: GRAY_600 });
      page.drawText('Actions', { x: lx + 350, y: ly - 17, size: 7, font: fontB, color: GRAY_600 });

      // Data row (dynamic)
      const rowY = ly - 38;
      page.drawText(data.providerNpi, { x: lx + 4, y: rowY, size: 8, font: fontR, color: NAVY });
      page.drawText(data.providerName, { x: lx + 70, y: rowY, size: 8, font: fontR, color: NAVY });
      page.drawText('Type 1', { x: lx + 240, y: rowY, size: 8, font: fontR, color: GRAY_600 });

      // Action icons
      page.drawRectangle({
        x: lx + 348,
        y: rowY - 4,
        width: 20,
        height: 14,
        color: GRAY_100,
        borderColor: GRAY_200,
        borderWidth: 1,
      });
      page.drawText('Q', { x: lx + 354, y: rowY - 1, size: 8, font: fontB, color: BLUE });

      page.drawRectangle({ x: lx + 374, y: rowY - 4, width: 20, height: 14, color: BLUE });
      page.drawText('E', { x: lx + 381, y: rowY - 1, size: 8, font: fontB, color: WHITE });

      drawCallout(page, lx + 406, rowY + 2, 'B', fontB);
      page.drawText('Click pencil to Edit', {
        x: lx + 418,
        y: rowY - 2,
        size: 7,
        font: fontB,
        color: GOLD,
      });
    },
  );

  // ── STEP 3: Navigate & Update ─────────────────────────────────────────

  const step3Desc = isPhone
    ? `Use the left sidebar to navigate to ${section}, then update the phone number.`
    : `Use the left sidebar to navigate to ${section}, then enter the corrected address.`;

  y = drawPanel(p2, y, 3, `Update the ${fieldLabel}`, step3Desc, 140, (page, px, py, pw, ph) => {
    page.drawRectangle({ x: px + 1, y: py - 1, width: pw - 2, height: 18, color: BLUE });
    page.drawText('CMS  |  NPPES  >  Edit NPI Application', {
      x: px + 8,
      y: py - 13,
      size: 7,
      font: fontB,
      color: WHITE,
    });

    // Left sidebar
    const sideW = 110;
    page.drawRectangle({
      x: px + 1,
      y: py - ph + 1,
      width: sideW,
      height: ph - 20,
      color: GRAY_50,
      borderColor: GRAY_200,
      borderWidth: 0.5,
    });

    const navItems = [
      'Provider Info',
      'Other Info',
      'Practice Location',
      'Endpoint Info',
      'Review',
      'Submit',
    ];
    let navY = py - 28;
    for (const item of navItems) {
      const isActive = item === section;
      if (isActive)
        page.drawRectangle({ x: px + 2, y: navY - 3, width: sideW - 2, height: 14, color: BLUE });
      page.drawText(item, {
        x: px + 10,
        y: navY,
        size: 7,
        font: isActive ? fontB : fontR,
        color: isActive ? WHITE : GRAY_600,
      });
      navY -= 14;
    }
    drawCallout(page, px + sideW + 6, py - 52, 'C', fontB);

    // Form area (dynamic based on field type)
    const fx = px + sideW + 20;
    const fy = py - 28;
    page.drawText(`${section} Information`, { x: fx, y: fy, size: 9, font: fontB, color: NAVY });

    if (isPhone) {
      // Phone field
      page.drawText('Practice Phone', { x: fx, y: fy - 18, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx,
        y: fy - 36,
        width: pw - sideW - 40,
        height: 16,
        color: WHITE,
        borderColor: GREEN,
        borderWidth: 1.5,
      });
      page.drawText(approvedDisplay, { x: fx + 4, y: fy - 32, size: 8, font: fontB, color: GREEN });

      drawCallout(page, fx + pw - sideW - 30, fy - 28, 'D', fontB);
      page.drawText('Enter approved', {
        x: fx + pw - sideW - 18,
        y: fy - 24,
        size: 6,
        font: fontB,
        color: GOLD,
      });
      page.drawText('phone number', {
        x: fx + pw - sideW - 17,
        y: fy - 32,
        size: 6,
        font: fontB,
        color: GOLD,
      });
    } else {
      // Address fields
      // Parse approved value into parts for form fields
      const addrParts = approvedDisplay.split(',').map((s) => s.trim());
      const line1 = addrParts[0] || approvedDisplay;
      const cityPart = addrParts.length > 1 ? addrParts[1] : '';
      // Try to extract state and zip from last part
      const lastPart = addrParts.length > 2 ? addrParts[2] : '';
      const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5})/);
      const statePart = stateZipMatch ? stateZipMatch[1] : lastPart.substring(0, 2);
      const zipPart = stateZipMatch ? stateZipMatch[2] : '';

      page.drawText('Address Line 1', { x: fx, y: fy - 18, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx,
        y: fy - 36,
        width: pw - sideW - 40,
        height: 16,
        color: WHITE,
        borderColor: GREEN,
        borderWidth: 1.5,
      });
      page.drawText(line1, { x: fx + 4, y: fy - 32, size: 8, font: fontB, color: GREEN });

      page.drawText('City', { x: fx, y: fy - 50, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx,
        y: fy - 68,
        width: 100,
        height: 16,
        color: WHITE,
        borderColor: GREEN,
        borderWidth: 1.5,
      });
      page.drawText(cityPart, { x: fx + 4, y: fy - 64, size: 8, font: fontB, color: GREEN });

      page.drawText('State', { x: fx + 110, y: fy - 50, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx + 110,
        y: fy - 68,
        width: 40,
        height: 16,
        color: WHITE,
        borderColor: GREEN,
        borderWidth: 1.5,
      });
      page.drawText(statePart, { x: fx + 114, y: fy - 64, size: 8, font: fontB, color: GREEN });

      page.drawText('ZIP', { x: fx + 160, y: fy - 50, size: 7, font: fontR, color: GRAY_400 });
      page.drawRectangle({
        x: fx + 160,
        y: fy - 68,
        width: 60,
        height: 16,
        color: WHITE,
        borderColor: GREEN,
        borderWidth: 1.5,
      });
      page.drawText(zipPart, { x: fx + 164, y: fy - 64, size: 8, font: fontB, color: GREEN });

      drawCallout(page, fx + pw - sideW - 30, fy - 32, 'D', fontB);
      page.drawText('Enter approved', {
        x: fx + pw - sideW - 18,
        y: fy - 28,
        size: 6,
        font: fontB,
        color: GOLD,
      });
      page.drawText('address here', {
        x: fx + pw - sideW - 15,
        y: fy - 36,
        size: 6,
        font: fontB,
        color: GOLD,
      });
    }
  });

  // ── STEP 4: Error Check & Submit ──────────────────────────────────────

  y = drawPanel(
    p2,
    y,
    4,
    'Error Check and Submit',
    'Click "Error Check" to validate, then "Complete NPI Application" to submit your update.',
    130,
    (page, px, py, pw, ph) => {
      page.drawRectangle({ x: px + 1, y: py - 1, width: pw - 2, height: 18, color: BLUE });
      page.drawText('CMS  |  NPPES  >  Submit', {
        x: px + 8,
        y: py - 13,
        size: 7,
        font: fontB,
        color: WHITE,
      });

      const cx = px + pw / 2;

      // Success message
      page.drawRectangle({
        x: cx - 130,
        y: py - 34,
        width: 260,
        height: 16,
        color: GREEN_PALE,
        borderColor: GREEN,
        borderWidth: 1,
      });
      page.drawText('No errors found. Ready to submit.', {
        x: cx - 80,
        y: py - 31,
        size: 8,
        font: fontR,
        color: GREEN,
      });

      // Error Check button
      page.drawRectangle({
        x: cx - 120,
        y: py - 60,
        width: 90,
        height: 18,
        color: GRAY_100,
        borderColor: GRAY_200,
        borderWidth: 1,
      });
      page.drawText('Error Check', { x: cx - 103, y: py - 56, size: 8, font: fontB, color: NAVY });
      drawCallout(page, cx - 120 + 103, py - 51, 'E', fontB);

      // Complete NPI Application button
      page.drawRectangle({ x: cx + 10, y: py - 60, width: 140, height: 18, color: BLUE });
      page.drawText('Complete NPI Application', {
        x: cx + 20,
        y: py - 56,
        size: 8,
        font: fontB,
        color: WHITE,
      });
      drawCallout(page, cx + 163, py - 51, 'F', fontB);

      // Closing note
      page.drawText(
        'After submitting, NPPES typically processes updates within 1-2 business weeks.',
        {
          x: cx - 160,
          y: py - ph + 14,
          size: 7,
          font: fontR,
          color: GRAY_400,
        },
      );
      page.drawText('KairoLogic will automatically detect the change and close your workflow.', {
        x: cx - 145,
        y: py - ph + 4,
        size: 7,
        font: fontR,
        color: GRAY_400,
      });
    },
  );

  // ── Page 2 footer ─────────────────────────────────────────────────────

  hline(p2, 56, m, W - m);
  p2.drawText('Page 2 of 2  |  NPPES Portal Visual Guide', {
    x: m,
    y: 40,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });
  p2.drawText('Screens may vary slightly. Portal: nppes.cms.hhs.gov', {
    x: m,
    y: 30,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });
  p2.drawText('kairologic.net', {
    x: W - m - fontR.widthOfTextAtSize('kairologic.net', 7),
    y: 40,
    size: 7,
    font: fontR,
    color: GRAY_400,
  });

  return doc.save();
}
