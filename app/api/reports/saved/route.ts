/**
 * GET  /api/reports/saved?practice_id=...
 * POST /api/reports/saved  { practice_id, name, report_type, config }
 *
 * CRUD for saved Data Explorer report configurations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const practiceId = request.nextUrl.searchParams.get('practice_id');
    if (!practiceId) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('saved_report_configs')
      .select('id, name, report_type, config, created_at, updated_at')
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data || [] });
  } catch (err) {
    console.error('[saved-reports GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { practice_id, name, report_type, config } = body;

    if (!practice_id || !name || !report_type) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, name, report_type' },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('saved_report_configs')
      .insert({
        practice_id,
        name,
        report_type,
        config: config || {},
      })
      .select('id, name, report_type, config, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: data });
  } catch (err) {
    console.error('[saved-reports POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('saved_report_configs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[saved-reports DELETE]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
