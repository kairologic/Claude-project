/**
 * POST /api/admin/practice-add
 *
 * Manually add a practice to the system.
 * Input: { npi, url }
 * Flow: Look up NPI in NPPES → create practice_websites row → kick off scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

// TODO: Add system-admin role check when role system is expanded

const POST_HANDLER = withAuth(async (request: NextRequest, ctx) => {
  try {
    const { npi, url } = await request.json();

    if (!url || !url.includes('.')) {
      return NextResponse.json({ error: 'Valid URL required' }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Use admin Supabase client from auth middleware
    const supabase = ctx.supabase;

    // Check for duplicate URL — strip trailing slash for comparison
    const baseUrl = normalizedUrl.replace(/\/+$/, '');
    // Match exact URL or URL with trailing slash/query params only
    const { data: existing } = await supabase
      .from('practice_websites')
      .select('id,name,url')
      .or(`url.eq.${baseUrl},url.eq.${baseUrl + '/'}`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Practice exists from a prior scan — adopt it into admin tracking
      await supabase
        .from('practice_websites')
        .update({ admin_tracked: true })
        .eq('id', existing[0].id);
      return NextResponse.json({
        success: true,
        adopted: true,
        practice: existing[0],
        message: `Practice "${existing[0].name || existing[0].url}" added to admin tracking.`,
      });
    }

    // Look up NPI in NPPES data if provided
    let practiceName: string | null = null;
    let state: string | null = null;

    if (npi) {
      const { data: npiData } = await supabase
        .from('providers')
        .select('first_name,last_name,organization_name,state')
        .eq('npi', npi)
        .limit(1);
      if (npiData && npiData.length > 0) {
        const p = npiData[0];
        practiceName = p.organization_name || `${p.first_name} ${p.last_name}`.trim();
        state = p.state;
      }
    }

    // Create practice_websites row
    const { data: newPractice } = await supabase
      .from('practice_websites')
      .insert({
        url: normalizedUrl,
        npi: npi || null,
        name: practiceName,
        state,
        scan_status: 'pending',
        scan_tier: 'weekly',
        consecutive_errors: 0,
        provider_count: 0,
        mismatch_count: 0,
        admin_tracked: true,
      })
      .select();

    const practiceId = newPractice?.[0]?.id;

    // If NPI provided, also add to practice_providers
    if (npi && practiceId) {
      await supabase.from('practice_providers').insert({
        practice_website_id: practiceId,
        npi,
        provider_name: practiceName,
        association_source: 'MANUAL_ADMIN',
        roster_status: 'active',
        first_detected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      practice: newPractice?.[0] || { id: practiceId },
      message: `Practice created${practiceName ? `: ${practiceName}` : ''}. Scan will run on next cycle, or trigger manually.`,
    });
  } catch (err) {
    console.error('[practice-add] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add practice' },
      { status: 500 },
    );
  }
});

export { POST_HANDLER as POST };
