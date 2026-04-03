import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * GET /api/checkout/session?session_id=xxx
 *
 * Retrieves a completed checkout session from Stripe.
 * Used by the success page to confirm the subscription and plan details.
 *
 * Response:
 *   - id: string (session ID)
 *   - customer_email: string (customer email)
 *   - subscription: string (subscription ID)
 *   - payment_status: string (paid | unpaid)
 *   - metadata: { planName, billingInterval }
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    // Expand subscription for trial info
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    const subscription = subscriptionId
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : null;

    return NextResponse.json({
      id: session.id,
      customer_email: session.customer_email,
      subscription: subscriptionId,
      payment_status: session.payment_status,
      status: session.status,
      metadata: session.metadata,
      trial_end: subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });
  } catch (err) {
    console.error('[Checkout Session]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve session' },
      { status: 500 },
    );
  }
}
