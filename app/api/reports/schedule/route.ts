import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * GET /api/reports/schedule
 * List scheduled reports for practice
 * Query param: practice_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practice_id = searchParams.get('practice_id');

    if (!practice_id) {
      return NextResponse.json(
        { error: 'Missing practice_id query parameter' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('practice_id', practice_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Reports Schedule GET] Error fetching scheduled reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled reports' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Reports Schedule GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/schedule
 * Create scheduled report in scheduled_reports table
 * Body: { practice_id, report_type, schedule_type, schedule_cron?, recipient_email?, enabled? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      practice_id,
      report_type,
      schedule_type,
      schedule_cron,
      recipient_email,
      enabled = true,
    } = body;

    if (!practice_id || !report_type || !schedule_type) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, report_type, schedule_type' },
        { status: 400 }
      );
    }

    // Validate schedule_type
    const validScheduleTypes = ['daily', 'weekly', 'monthly', 'custom'];
    if (!validScheduleTypes.includes(schedule_type)) {
      return NextResponse.json(
        { error: `Invalid schedule_type. Must be one of: ${validScheduleTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If custom, require cron expression
    if (schedule_type === 'custom' && !schedule_cron) {
      return NextResponse.json(
        { error: 'schedule_cron required for custom schedule_type' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('id')
      .eq('id', practice_id)
      .single();

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    // Create scheduled report
    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        practice_id,
        report_type,
        schedule_type,
        schedule_cron: schedule_cron || null,
        recipient_email: recipient_email || null,
        enabled,
        last_sent_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Reports Schedule POST] Error creating scheduled report:', error);
      return NextResponse.json(
        { error: 'Failed to create scheduled report' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Scheduled report created',
        report: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Reports Schedule POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
