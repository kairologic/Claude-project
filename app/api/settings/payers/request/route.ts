import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * POST /api/settings/payers/request
 * Insert into payer_requests table
 * Body: { practice_id, payer_name, email?, reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { practice_id, payer_name, email, reason } = body;

    if (!practice_id || !payer_name) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, payer_name' },
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

    // Create payer request
    const { data, error } = await supabase
      .from('payer_requests')
      .insert({
        practice_id,
        payer_name,
        email: email || null,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Payer Request POST] Error creating request:', error);
      return NextResponse.json(
        { error: 'Failed to create payer request' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payer request submitted',
        request: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Payer Request POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
