import { NextRequest, NextResponse } from 'next/server';

/**
 * Trial Upgrade API
 * POST /api/trial/upgrade
 * Body: { practice_website_id: string, plan: string }
 *
 * Creates a Stripe Checkout session for the selected plan.
 * On success, Stripe webhook calls recordUpgrade().
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

// Founders' rate price IDs (create these in Stripe Dashboard)
// For launch: single $99/mo price, no per-provider metering yet
const PRICE_IDS: Record<string, string> = {
  founders: process.env.STRIPE_FOUNDERS_PRICE_ID || '',
  monitor: process.env.STRIPE_MONITOR_PRICE_ID || '',
  protect: process.env.STRIPE_PROTECT_PRICE_ID || '',
  command: process.env.STRIPE_COMMAND_PRICE_ID || '',
};

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { practice_website_id, plan } = await request.json();

    if (!practice_website_id) {
      return NextResponse.json({ error: 'practice_website_id required' }, { status: 400 });
    }

    // Get practice and org info
    const practices = await db(
      `practice_websites?id=eq.${practice_website_id}&select=id,organization_id,name`
    );
    if (!practices?.length || !practices[0].organization_id) {
      return NextResponse.json({ error: 'Practice not found or not claimed' }, { status: 404 });
    }

    const orgId = practices[0].organization_id;
    const orgs = await db(`organizations?id=eq.${orgId}&select=id,contact_email,name`);
    if (!orgs?.length) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // For founders' rate: use single price
    const priceId = PRICE_IDS.founders || PRICE_IDS[plan || 'protect'];
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured. Contact support.' }, { status: 500 });
    }

    // Create Stripe checkout session
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: orgs[0].contact_email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/practice/${practice_website_id}?upgraded=true`,
      cancel_url: `${BASE_URL}/practice/${practice_website_id}?upgrade=cancelled`,
      metadata: {
        organization_id: orgId,
        practice_website_id,
        plan: plan || 'founders',
      },
      subscription_data: {
        metadata: {
          organization_id: orgId,
          practice_website_id,
        },
      },
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });

  } catch (err) {
    console.error('[Upgrade API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upgrade failed' },
      { status: 500 },
    );
  }
}
