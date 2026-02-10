import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/shield/dashboard?npi=XXX&token=YYY
 * 
 * Returns provider info, heartbeats, and access status for the Shield dashboard.
 * 
 * Access is granted if:
 *   - token matches dashboard_token in registry, AND
 *   - subscription_tier === 'shield' OR shield_trial_end > now()
 * 
 * Returns { error: 'access_denied' } if auth fails.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npi = searchParams.get('npi');
  const token = searchParams.get('token');

  if (!npi) {
    return NextResponse.json({ error: 'npi required' }, { status: 400 });
  }

  try {
    // Fetch provider info
    const provRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registry?npi=eq.${encodeURIComponent(npi)}&limit=1&select=name,npi,url,email,risk_score,status_label,subscription_tier,subscription_status,last_scan_timestamp,widget_status,shield_trial_start,shield_trial_end,dashboard_token`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const providers = await provRes.json();

    if (!providers || providers.length === 0) {
      return NextResponse.json({ error: 'provider_not_found' }, { status: 404 });
    }

    const provider = providers[0];

    // ── Token Auth ──
    // Must provide valid dashboard_token
    if (!token || !provider.dashboard_token || token !== provider.dashboard_token) {
      return NextResponse.json({
        error: 'access_denied',
        message: 'Valid dashboard token required',
      });
    }

    // ── Subscription Check ──
    const hasShieldSubscription = provider.subscription_tier === 'shield';
    const hasActiveTrial = provider.shield_trial_end && new Date(provider.shield_trial_end) > new Date();

    if (!hasShieldSubscription && !hasActiveTrial) {
      return NextResponse.json({
        error: 'access_denied',
        subscription_tier: provider.subscription_tier || 'none',
        message: 'Shield subscription or active trial required for dashboard access',
      });
    }

    // Fetch heartbeats
    const hbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/widget_heartbeats?npi=eq.${encodeURIComponent(npi)}&select=*&order=last_seen.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const heartbeats = await hbRes.json();

    return NextResponse.json({
      provider: {
        name: provider.name,
        npi: provider.npi,
        url: provider.url,
        email: provider.email,
        subscription_tier: provider.subscription_tier,
        risk_score: provider.risk_score,
        status_label: provider.status_label,
        last_scan_timestamp: provider.last_scan_timestamp,
        access_type: hasShieldSubscription ? 'subscription' : 'trial',
        trial_ends: provider.shield_trial_end || null,
      },
      heartbeats: heartbeats || [],
    });
  } catch (err: any) {
    console.error('[Shield Dashboard API] Error:', err);
    return NextResponse.json({ error: 'Dashboard load failed' }, { status: 500 });
  }
}
