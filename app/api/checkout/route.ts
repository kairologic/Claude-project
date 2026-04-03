import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kairologic.net';

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session in embedded mode with a 14-day trial.
 *
 * Request body:
 *   - priceId: string (Stripe price ID)
 *   - planName: string (plan name for metadata)
 *   - billingInterval: 'month' | 'year'
 *
 * Response:
 *   - clientSecret: string (for embedded checkout)
 */
export async function POST(request: NextRequest) {
  try {
    const { priceId, planName, billingInterval } = await request.json();

    if (!priceId || !planName || !billingInterval) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, planName, billingInterval' },
        { status: 400 },
      );
    }

    // Create checkout session with embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      return_url: `${BASE_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        planName,
        billingInterval,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          planName,
          billingInterval,
        },
      },
    });

    if (!session.client_secret) {
      throw new Error('No client_secret in checkout session');
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('[Checkout]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 },
    );
  }
}
