import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events (checkout.session.completed)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let event;

    try {
      event = JSON.parse(body);
    } catch (parseErr) {
      console.error('[Stripe Webhook] Failed to parse body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Event: ${event.type}, ID: ${event.id}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (!session) {
        return NextResponse.json({ received: true, action: 'no_session_data' });
      }

      const customerEmail = session.customer_email || session.customer_details?.email || '';
      const customerName = session.customer_details?.name || '';
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      const paymentId = session.payment_intent || session.id;
      const productDesc = session.display_items?.[0]?.custom?.name
        || session.line_items?.data?.[0]?.description
        || session.metadata?.product
        || 'Unknown Product';

      console.log(`[Stripe Webhook] Payment: ${customerEmail}, $${amountTotal}, ${productDesc}`);

      // Try to find and update provider in registry by email
      if (customerEmail) {
        try {
          // Find provider by email
          const findRes = await fetch(
            `${SUPABASE_URL}/rest/v1/registry?email=eq.${encodeURIComponent(customerEmail)}&limit=1`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              }
            }
          );
          const providers = await findRes.json();

          if (providers && providers.length > 0) {
            const provider = providers[0];

            // Update registry: mark as paid, update subscription
            await fetch(
              `${SUPABASE_URL}/rest/v1/registry?id=eq.${provider.id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  is_paid: true,
                  subscription_status: 'active',
                  report_status: 'generated',
                  updated_at: new Date().toISOString()
                })
              }
            );

            console.log(`[Stripe Webhook] Updated registry for ${provider.name} (${provider.npi})`);
          }
        } catch (dbErr) {
          console.error('[Stripe Webhook] DB update error:', dbErr);
        }

        // Fire SentryShield activation email (Template 3)
        try {
          const origin = request.headers.get('origin') || request.nextUrl.origin || 'https://kairologic.com';
          await fetch(`${origin}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_slug: 'sentryshield-activation',
              variables: {
                email: customerEmail,
                practice_name: customerName,
                practice_manager_name: customerName,
                amount: String(amountTotal),
                payment_id: paymentId,
                product: productDesc,
              }
            })
          });
        } catch (emailErr) {
          console.error('[Stripe Webhook] Email trigger error:', emailErr);
        }
      }

      // Log purchase to prospects table
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/prospects`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              source: 'discovery',
              contact_name: customerName,
              email: customerEmail,
              status: 'qualified',
              priority: 'high',
              admin_notes: `Stripe payment: $${amountTotal} - ${productDesc}`,
              form_data: {
                stripe_event: event.type,
                stripe_session_id: session.id,
                payment_intent: paymentId,
                amount: amountTotal,
                product: productDesc,
              }
            })
          }
        );
      } catch (prospectErr) {
        console.error('[Stripe Webhook] Prospect creation error:', prospectErr);
      }

      return NextResponse.json({ received: true, action: 'checkout_completed' });
    }

    // Other event types
    return NextResponse.json({ received: true, action: 'ignored' });

  } catch (err) {
    console.error('[Stripe Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
