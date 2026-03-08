// lib/forms/nppes-form-generator.ts
// ═══ NPPES Update Form Pre-Fill + Bulk Generation ═══
// Task 2.5: Generate pre-filled NPPES update guidance PDFs from delta events.
// Task 3.3: Bulk form generation across all mismatches for a practice.
//
// Each form contains:
//   - Provider name + NPI
//   - Current wrong value in NPPES (highlighted)
//   - Detected correct value from website (highlighted)
//   - Exact NPPES portal section to navigate to
//   - Step-by-step submission instructions
//   - Estimated completion time (3-5 minutes)
//   - ROI calculation ($118 manual cost vs. 4 min with KairoLogic)
//
// Free tier: sees full form preview, download locked behind upgrade prompt.
// Paid tier: one-click download, pre-formatted for CMS submission.

// We use jsPDF which is already in package.json

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Types ────────────────────────────────────────────────

export interface FormField {
  field_label: string;            // human readable: "Practice Address"
  field_name: string;             // DB field: "address_line_1"
  nppes_section: string;          // "Practice Location Information"
  current_value: string;          // what NPPES currently says (wrong)
  expected_value: string;         // what we detected (correct)
  detection_source: string;       // "web_scan", "state_board"
  confidence: string;
  corroborated: boolean;
}

export interface FormData {
  npi: string;
  provider_name: string;
  practice_name: string | null;
  practice_website_id: string | null;
  fields: FormField[];
  estimated_manual_time_min: number;
  estimated_kairologic_time_min: number;
  estimated_manual_cost: number;
  generated_at: string;
}

export interface BulkFormResult {
  practice_name: string;
  practice_website_id: string;
  forms: FormData[];
  total_mismatches: number;
  total_providers: number;
  total_estimated_savings: number;
  generated_at: string;
}

// ── NPPES Section Mapping ────────────────────────────────

const FIELD_TO_NPPES_SECTION: Record<string, { section: string; label: string; instructions: string }> = {
  address_line_1: {
    section: 'Practice Location Information',
    label: 'Practice Address',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Select "Practice Location Information" from the left menu\n3. Click "Edit" next to the practice location\n4. Update the Address Line 1 field\n5. Click "Save" then "Submit"\n6. Estimated time: 3-5 minutes',
  },
  city: {
    section: 'Practice Location Information',
    label: 'City',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Navigate to Practice Location Information\n3. Update the City field\n4. Save and Submit',
  },
  state: {
    section: 'Practice Location Information',
    label: 'State',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Navigate to Practice Location Information\n3. Update the State field\n4. Save and Submit',
  },
  zip_code: {
    section: 'Practice Location Information',
    label: 'ZIP Code',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Navigate to Practice Location Information\n3. Update the ZIP Code field\n4. Save and Submit',
  },
  phone: {
    section: 'Contact Information',
    label: 'Practice Phone',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Select "Contact Information"\n3. Update the Authorized Official Telephone Number\n4. Save and Submit',
  },
  primary_taxonomy_code: {
    section: 'Taxonomy Information',
    label: 'Primary Taxonomy / Specialty',
    instructions: '1. Log in at https://nppes.cms.hhs.gov/\n2. Select "Taxonomy Information"\n3. Search for the correct NUCC taxonomy code\n4. Set as Primary taxonomy\n5. Save and Submit',
  },
};

// ── Single Form Generation ───────────────────────────────

/**
 * Generate form data for a single provider's NPPES mismatches.
 * Returns the structured data that can be rendered as PDF or displayed in UI.
 */
export async function generateFormData(
  npi: string,
  practiceWebsiteId: string,
): Promise<FormData | null> {
  // Get provider info
  const providers = await db(`providers?npi=eq.${npi}&select=npi,first_name,last_name,address_line_1,city,state,zip_code,phone,primary_taxonomy_code`);
  if (!providers?.length) return null;
  const provider = providers[0];

  // Get practice info
  const practices = await db(`practice_websites?id=eq.${practiceWebsiteId}&select=name,url`);
  const practiceName = practices?.[0]?.name || null;

  // Get delta events (active mismatches)
  const deltas = await db(
    `nppes_delta_events?npi=eq.${npi}&practice_website_id=eq.${practiceWebsiteId}&order=detected_at.desc&limit=20`
  );

  if (!deltas?.length) return null;

  // Deduplicate by field_name (keep most recent)
  const fieldMap = new Map<string, any>();
  for (const d of deltas) {
    if (!fieldMap.has(d.field_name)) fieldMap.set(d.field_name, d);
  }

  // Build form fields
  const fields: FormField[] = [];
  for (const [fieldName, delta] of fieldMap) {
    const mapping = FIELD_TO_NPPES_SECTION[fieldName];
    if (!mapping) continue;

    fields.push({
      field_label: mapping.label,
      field_name: fieldName,
      nppes_section: mapping.section,
      current_value: delta.old_value || (provider as any)[fieldName] || '',
      expected_value: delta.new_value || '',
      detection_source: delta.detection_source,
      confidence: delta.confidence,
      corroborated: delta.corroboration_count >= 2,
    });
  }

  if (fields.length === 0) return null;

  return {
    npi,
    provider_name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || npi,
    practice_name: practiceName,
    practice_website_id: practiceWebsiteId,
    fields,
    estimated_manual_time_min: 47,
    estimated_kairologic_time_min: 4,
    estimated_manual_cost: 118,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate a PDF buffer for an NPPES update form.
 * Uses jsPDF (already in package.json).
 */
export async function generateFormPDF(formData: FormData): Promise<Buffer> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const pageWidth = 215.9;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Header
  doc.setFillColor(11, 30, 61); // navy
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(212, 165, 116); // gold
  doc.setFontSize(10);
  doc.text('KAIROLOGIC', margin, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('NPPES Update Form', margin, 25);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date(formData.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, 25, { align: 'right' });

  y = 45;

  // Provider info
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.text(`Provider: ${formData.provider_name}`, margin, y); y += 6;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`NPI: ${formData.npi}`, margin, y);
  if (formData.practice_name) {
    doc.text(`Practice: ${formData.practice_name}`, margin + 60, y);
  }
  y += 10;

  // ROI box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.text('Estimated manual correction time:', margin + 4, y + 7);
  doc.setTextColor(239, 68, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formData.estimated_manual_time_min} minutes ($${formData.estimated_manual_cost})`, margin + 70, y + 7);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text('With KairoLogic pre-filled form:', margin + 4, y + 14);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formData.estimated_kairologic_time_min} minutes`, margin + 70, y + 14);
  y += 28;

  // Fields
  for (const field of formData.fields) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    // Field header
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(field.field_label, margin + 3, y + 5.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`NPPES Section: ${field.nppes_section}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });
    y += 12;

    // Current value (red)
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('NPPES current (wrong):', margin + 3, y);
    y += 5;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin + 3, y - 3.5, contentWidth - 6, 7, 1, 1, 'F');
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(10);
    doc.text(field.current_value || '\u2014', margin + 6, y + 1);
    y += 9;

    // Expected value (green)
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Detected correct value:', margin + 3, y);
    y += 5;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin + 3, y - 3.5, contentWidth - 6, 7, 1, 1, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(10);
    doc.text(field.expected_value || '\u2014', margin + 6, y + 1);
    y += 9;

    // Corroboration badge
    if (field.corroborated) {
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(margin + 3, y - 3, 40, 5, 1, 1, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(7);
      doc.text('\u2713 Corroborated by 2+ sources', margin + 5, y);
      y += 4;
    }

    y += 6;
  }

  // Instructions section
  if (y > 220) { doc.addPage(); y = margin; }
  y += 5;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('How to Submit This Update', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  const steps = [
    '1. Log in to the NPPES portal at https://nppes.cms.hhs.gov/',
    '2. Navigate to the sections listed above for each field',
    '3. Update each field with the detected correct value (shown in green)',
    '4. Review all changes, then click Submit',
    '5. Return to your KairoLogic dashboard and click "Mark as Submitted"',
    '6. We will monitor the NPPES API daily and alert you when the update is confirmed live',
  ];

  for (const step of steps) {
    doc.text(step, margin + 3, y);
    y += 5;
  }

  // Footer
  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text('KairoLogic Provider Data Intelligence \u00B7 kairologic.net', margin, y);
  doc.text(`Form ID: ${formData.npi}-${Date.now().toString(36)}`, pageWidth - margin, y, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ── Bulk Generation (Task 3.3) ───────────────────────────

/**
 * Generate NPPES update forms for ALL providers with mismatches at a practice.
 * Returns form data for each provider + a combined summary.
 */
export async function generateBulkForms(
  practiceWebsiteId: string,
): Promise<BulkFormResult> {
  // Get all providers with active mismatches
  const providers = await db(
    `practice_providers?practice_website_id=eq.${practiceWebsiteId}&active_mismatch_count=gt.0&select=npi,provider_name`
  );

  const practice = await db(`practice_websites?id=eq.${practiceWebsiteId}&select=name`);
  const practiceName = practice?.[0]?.name || 'Practice';

  const forms: FormData[] = [];

  for (const provider of providers || []) {
    const form = await generateFormData(provider.npi, practiceWebsiteId);
    if (form) forms.push(form);
  }

  const totalMismatches = forms.reduce((sum, f) => sum + f.fields.length, 0);
  const savingsPerForm = 118; // $118 manual cost saved per form

  return {
    practice_name: practiceName,
    practice_website_id: practiceWebsiteId,
    forms,
    total_mismatches: totalMismatches,
    total_providers: forms.length,
    total_estimated_savings: forms.length * savingsPerForm,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate a combined bulk PDF with all provider forms in one document.
 */
export async function generateBulkPDF(bulkResult: BulkFormResult): Promise<Buffer> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const pageWidth = 215.9;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Cover page
  doc.setFillColor(11, 30, 61);
  doc.rect(0, 0, pageWidth, 279.4, 'F');
  doc.setTextColor(212, 165, 116);
  doc.setFontSize(12);
  doc.text('KAIROLOGIC', margin, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('NPPES Update Forms', margin, 65);
  doc.setFontSize(14);
  doc.text(bulkResult.practice_name, margin, 78);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.text(`${bulkResult.total_providers} providers \u00B7 ${bulkResult.total_mismatches} corrections needed`, margin, 92);
  doc.text(`Estimated savings: $${bulkResult.total_estimated_savings.toLocaleString()}`, margin, 100);
  doc.text(`Generated: ${new Date(bulkResult.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 108);

  // Table of contents
  doc.setTextColor(212, 165, 116);
  doc.setFontSize(11);
  doc.text('Providers in this batch:', margin, 130);
  let tocY = 140;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  for (const form of bulkResult.forms) {
    doc.text(`\u2022  ${form.provider_name} (NPI: ${form.npi}) \u2014 ${form.fields.length} correction${form.fields.length > 1 ? 's' : ''}`, margin + 4, tocY);
    tocY += 6;
  }

  // Individual forms (one per provider, starting on new page)
  for (const form of bulkResult.forms) {
    doc.addPage();
    let y = margin;

    // Provider header
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(form.provider_name, margin, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`NPI: ${form.npi} \u00B7 ${form.fields.length} correction${form.fields.length > 1 ? 's' : ''} needed`, margin, 23);

    y = 38;

    // Fields
    for (const field of form.fields) {
      if (y > 235) { doc.addPage(); y = margin; }

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${field.field_label} (${field.nppes_section})`, margin, y);
      y += 7;

      // Current
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Current (wrong):', margin + 3, y);
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(9);
      doc.text(field.current_value || '\u2014', margin + 40, y);
      y += 6;

      // Expected
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Correct value:', margin + 3, y);
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(9);
      doc.text(field.expected_value || '\u2014', margin + 40, y);
      y += 10;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ── Update Request Tracking ──────────────────────────────

/**
 * Create update_requests records for each form field.
 * Tracks the workflow: DETECTED → FORM_GENERATED → SUBMITTED → CONFIRMED
 */
export async function createUpdateRequests(
  formData: FormData,
  organizationId?: string,
): Promise<string[]> {
  const ids: string[] = [];

  for (const field of formData.fields) {
    // Find the delta event for this field
    const deltas = await db(
      `nppes_delta_events?npi=eq.${formData.npi}&field_name=eq.${field.field_name}&practice_website_id=eq.${formData.practice_website_id}&order=detected_at.desc&limit=1`
    );

    const rows = await db('update_requests', {
      method: 'POST',
      body: JSON.stringify({
        npi: formData.npi,
        practice_website_id: formData.practice_website_id,
        delta_event_id: deltas?.[0]?.id || null,
        organization_id: organizationId || null,
        status: 'FORM_GENERATED',
        field_name: field.field_name,
        current_value: field.current_value,
        expected_value: field.expected_value,
        nppes_section: field.nppes_section,
        form_generated_at: new Date().toISOString(),
      }),
    });

    if (rows?.[0]?.id) ids.push(rows[0].id);
  }

  return ids;
}
