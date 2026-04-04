import { NextRequest, NextResponse } from 'next/server';

/**
 * Trial Upgrade API
 * POST /api/trial/upgrade
 * Body: { practice_website_id: string, plan: string }
 *
 * Creates a Stripe Checkout session for the selected plan.
 * On success, Stripe webhook calls recordUpgrade().
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

// Stripe price IDs for each plan tier
const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_1TIYIEGg3oiiGF7gkr81Zj4z',
    annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_1TIYIFGg3oiiGF7gIoHxe3Bd',
  },
  professional: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_1TIYIHGg3oiiGF7ge3eppidd',
    annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || 'price_1TIYIIGg3oiiGF7g4CMiFxIQ',
  },
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
    const { practice_website_id, plan, billing } = await request.json();

    if (!practice_website_id) {
      return NextResponse.json({ error: 'practice_website_id required' }, { status: 400 });
    }

    const selectedPlan = plan || 'starter';
    const billingCycle = billing || 'monthly';

    // Get practice and org info
    const practices = await db(
      `practice_websites?id=eq.${practice_website_id}&select=id,organization_id,name`,
    );
    if (!practices?.length || !practices[0].organization_id) {
      return NextResponse.json({ error: 'Practice not found or not claimed' }, { status: 404 });
    }

    const orgId = practices[0].organization_id;
    const orgs = await db(`organizations?id=eq.${orgId}&select=id,contact_email,name`);
    if (!orgs?.length) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Look up price ID for selected plan and billing cycle
    const planPrices = PRICE_IDS[selectedPlan];
    if (!planPrices) {
      return NextResponse.json(
        { error: `Invalid plan: ${selectedPlan}. Choose starter or professional.` },
        { status: 400 },
      );
    }
    const priceId = billingCycle === 'annual' ? planPrices.annual : planPrices.monthly;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured. Contact support.' },
        { status: 500 },
      );
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
        plan: selectedPlan,
        billing: billingCycle,
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
