import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Prospects API
 * ========================
 * POST   /api/prospects         — Create a new prospect
 * GET    /api/prospects          — List all prospects (admin)
 * PATCH  /api/prospects          — Update a prospect (admin edit)
 * DELETE /api/prospects?id=UUID  — Delete a prospect
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// ── POST: Create a new prospect ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      source,
      source_detail,
      contact_name,
      email,
      phone,
      practice_name,
      npi,
      website_url,
      form_data,
      scan_score,
      scan_risk_level,
      scan_report_id,
      appointment_date,
      appointment_time,
      meeting_url,
      subject,
      message,
      priority,
      fillout_submission_id,
    } = body;

    if (!source) {
      return NextResponse.json({ error: 'source is required' }, { status: 400 });
    }

    // Build the record — only include non-undefined fields
    const record: Record<string, unknown> = { source };
    if (source_detail !== undefined) record.source_detail = source_detail;
    if (contact_name !== undefined) record.contact_name = contact_name;
    if (email !== undefined) record.email = email;
    if (phone !== undefined) record.phone = phone;
    if (practice_name !== undefined) record.practice_name = practice_name;
    if (npi !== undefined) record.npi = npi;
    if (website_url !== undefined) record.website_url = website_url;
    if (form_data !== undefined) record.form_data = form_data;
    if (scan_score !== undefined) record.scan_score = scan_score;
    if (scan_risk_level !== undefined) record.scan_risk_level = scan_risk_level;
    if (scan_report_id !== undefined) record.scan_report_id = scan_report_id;
    if (appointment_date !== undefined) record.appointment_date = appointment_date;
    if (appointment_time !== undefined) record.appointment_time = appointment_time;
    if (meeting_url !== undefined) record.meeting_url = meeting_url;
    if (subject !== undefined) record.subject = subject;
    if (message !== undefined) record.message = message;
    if (priority !== undefined) record.priority = priority;
    if (fillout_submission_id !== undefined) record.fillout_submission_id = fillout_submission_id;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/prospects`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[PROSPECTS] Insert failed:', errText);
      return NextResponse.json({ error: 'Failed to create prospect', detail: errText }, { status: 500 });
    }

    const created = await response.json();
    return NextResponse.json({ success: true, prospect: created[0] || created }, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PROSPECTS] POST error:', msg);
    return NextResponse.json({ error: 'Failed to create prospect', message: msg }, { status: 500 });
  }
}

// ── GET: List all prospects (admin) ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const limit = searchParams.get('limit') || '200';

  try {
    let queryUrl = `${SUPABASE_URL}/rest/v1/prospects?select=*&order=created_at.desc&limit=${limit}`;

    if (status) queryUrl += `&status=eq.${encodeURIComponent(status)}`;
    if (source) queryUrl += `&source=eq.${encodeURIComponent(source)}`;

    const response = await fetch(queryUrl, { headers });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'Failed to fetch prospects', detail: errText }, { status: 500 });
    }

    const prospects = await response.json();
    return NextResponse.json({ prospects, count: prospects.length });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch prospects', message: msg }, { status: 500 });
  }
}

// ── PATCH: Update a prospect (admin edit) ──
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Whitelist editable fields
    const allowed = [
      'contact_name', 'email', 'phone', 'practice_name', 'npi', 'website_url',
      'status', 'admin_notes', 'assigned_to', 'priority', 'is_read',
      'subject', 'message', 'appointment_date', 'appointment_time',
      'source_detail', 'registry_id',
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
      `${SUPABASE_URL}/rest/v1/prospects?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(safeUpdates),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'Update failed', detail: errText }, { status: 500 });
    }

    const updated = await response.json();
    return NextResponse.json({ success: true, prospect: updated[0] || updated });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Update failed', message: msg }, { status: 500 });
  }
}

// ── DELETE: Remove a prospect ──
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/prospects?id=eq.${id}`,
      { method: 'DELETE', headers: { ...headers, 'Prefer': 'return=minimal' } }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'Delete failed', detail: errText }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Delete failed', message: msg }, { status: 500 });
  }
}
