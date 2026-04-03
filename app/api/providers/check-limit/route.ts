/**
 * GET /api/providers/check-limit?practiceId=xxx
 *
 * Returns the provider limit for the practice's organization tier
 * and the current active provider count. Used by the dashboard to
 * gate the "Add provider" button.
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function db(path: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// Map plan_tier to max providers (fallback if organizations.max_providers is null)
const TIER_PROVIDER_LIMITS: Record<string, number> = {
  free: 5,
  trial_protect: 15, // trial gets Small tier limits
  small: 15,
  monitor: 15,
  medium: 25,
  protect: 25,
  command: 999,
  enterprise: 999,
};

export async function GET(request: NextRequest) {
  try {
    const practiceId = request.nextUrl.searchParams.get('practiceId');
    if (!practiceId) {
      return NextResponse.json({ error: 'practiceId required' }, { status: 400 });
    }

    // Get practice → organization link
    const practices = await db(
      `practice_websites?id=eq.${practiceId}&select=id,organization_id`
    );
    if (!practices?.length) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const orgId = practices[0].organization_id;
    let maxProviders = 5; // default to free tier
    let planTier = 'free';

    if (orgId) {
      const orgs = await db(
        `organizations?id=eq.${orgId}&select=id,plan_tier,max_providers`
      );
      if (orgs?.length) {
        planTier = orgs[0].plan_tier || 'free';
        maxProviders = orgs[0].max_providers
          || TIER_PROVIDER_LIMITS[planTier]
          || 5;
      }
    }

    // Count active providers (active + onboarding count toward the limit)
    const providers = await db(
      `practice_providers?practice_website_id=eq.${practiceId}&roster_status=in.(active,onboarding)&select=id`
    );
    const currentCount = providers?.length || 0;

    return NextResponse.json({
      currentCount,
      maxProviders,
      planTier,
      canAdd: currentCount < maxProviders,
      remaining: Math.max(0, maxProviders - currentCount),
    });

  } catch (err) {
    console.error('[Check Provider Limit]', err);
    return NextResponse.json(
      { error: 'Failed to check provider limit' },
      { status: 500 },
    );
  }
}
