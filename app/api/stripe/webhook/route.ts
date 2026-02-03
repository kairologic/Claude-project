import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Product identification from Stripe session data.
 * Maps product descriptions / line item names to our internal product types.
 */
type ProductType = 'forensic-report' | 'quick-fix' | 'sentry-widget' | 'unknown';

interface ProductInfo {
  type: ProductType;
  displayName: string;
  templateSlug: string;
}

function identifyProduct(session: Record<string, unknown>): ProductInfo {
  // Gather all possible product identifiers from the Stripe session
  const candidates: string[] = [];

  // Line items (most reliable for Buy Button checkouts)
  const lineItems = session.line_items as Record<string, unknown> | undefined;
  if (lineItems && Array.isArray((lineItems as Record<string, unknown>).data)) {
    for (const item of (lineItems as Record<string, unknown>).data as Record<string, unknown>[]) {
      if (item.description) candidates.push(String(item.description).toLowerCase());
      if (item.price && typeof item.price === 'object') {
        const price = item.price as Record<string, unknown>;
        if (price.product && typeof price.product === 'object') {
          const prod = price.product as Record<string, unknown>;
          if (prod.name) candidates.push(String(prod.name).toLowerCase());
        }
      }
    }
  }

  // Display items (legacy)
  const displayItems = session.display_items as Record<string, unknown>[] | undefined;
  if (Array.isArray(displayItems)) {
    for (const item of displayItems) {
      if (item.custom && typeof item.custom === 'object') {
        const custom = item.custom as Record<string, unknown>;
        if (custom.name) candidates.push(String(custom.name).toLowerCase());
      }
    }
  }

  // Metadata (manual override)
  const metadata = session.metadata as Record<string, string> | undefined;
  if (metadata?.product) candidates.push(metadata.product.toLowerCase());

  // Match against known products
  const combined = candidates.join(' ');

  if (combined.includes('forensic') || combined.includes('sovereignty audit') || combined.includes('full report')) {
    return {
      type: 'forensic-report',
      displayName: 'Sovereignty Audit & Forensic Report',
      templateSlug: 'purchase-success',
    };
  }

  if (combined.includes('quick-fix') || combined.includes('quick fix') || combined.includes('blueprint')) {
    return {
      type: 'quick-fix',
      displayName: 'Quick-Fix Blueprint',
      templateSlug: 'purchase-success',
    };
  }

  if (combined.includes('sentry') || combined.includes('widget') || combined.includes('sentryguard')) {
    return {
      type: 'sentry-widget',
      displayName: 'SentryGuard Performance Widget',
      templateSlug: 'sentryshield-activation',
    };
  }

  // Fallback: send generic purchase confirmation
  return {
    type: 'unknown',
    displayName: candidates[0] || 'KairoLogic Product',
    templateSlug: 'purchase-success',
  };
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events (checkout.session.completed)
 *
 * Email routing:
 *   Forensic Report / Quick-Fix Blueprint → purchase-success template
 *   Sentry Widget                         → sentryshield-activation template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let event;

    try {
      event = JSON.parse(body);
    } catch {
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

      // Identify which product was purchased
      const product = identifyProduct(session);

      // Build Stripe receipt URL (available on successful payments)
      const receiptUrl = session.receipt_url
        || (session.payment_intent
          ? `https://dashboard.stripe.com/payments/${session.payment_intent}`
          : '');

      console.log(`[Stripe Webhook] Payment: ${customerEmail}, $${amountTotal}, ${product.displayName} (${product.type})`);

      // ── 1. Update registry ────────────────────────────────────
      if (customerEmail) {
        try {
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

            // Build registry update based on product type
            const registryUpdate: Record<string, unknown> = {
              is_paid: true,
              updated_at: new Date().toISOString(),
            };

            if (product.type === 'sentry-widget') {
              // Widget purchase: activate subscription + widget
              registryUpdate.subscription_status = 'active';
              registryUpdate.widget_status = 'active';
            } else if (product.type === 'forensic-report') {
              // Forensic report: mark report as generated
              registryUpdate.report_status = 'generated';
            } else if (product.type === 'quick-fix') {
              // Quick-fix: mark report as generated
              registryUpdate.report_status = 'generated';
            }

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
                body: JSON.stringify(registryUpdate)
              }
            );

            console.log(`[Stripe Webhook] Updated registry for ${provider.name} (${provider.npi}) — product: ${product.type}`);
          }
        } catch (dbErr) {
          console.error('[Stripe Webhook] DB update error:', dbErr);
        }

        // ── 2. Send product-specific email ────────────────────────
        try {
          const origin = request.headers.get('origin') || request.nextUrl.origin || 'https://kairologic.com';
          await fetch(`${origin}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_slug: product.templateSlug,
              variables: {
                email: customerEmail,
                practice_name: customerName,
                practice_manager_name: customerName,
                amount: amountTotal.toFixed(2),
                productName: product.displayName,
                product: product.displayName,
                payment_id: paymentId,
                receiptUrl: receiptUrl,
              }
            })
          });

          console.log(`[Stripe Webhook] Email sent: ${product.templateSlug} → ${customerEmail}`);
        } catch (emailErr) {
          console.error('[Stripe Webhook] Email trigger error:', emailErr);
        }
      }

      // ── 3. Log purchase to prospects ────────────────────────────
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
              admin_notes: `Stripe payment: $${amountTotal.toFixed(2)} — ${product.displayName}`,
              form_data: {
                stripe_event: event.type,
                stripe_session_id: session.id,
                payment_intent: paymentId,
                amount: amountTotal,
                product_type: product.type,
                product_name: product.displayName,
              }
            })
          }
        );
      } catch (prospectErr) {
        console.error('[Stripe Webhook] Prospect creation error:', prospectErr);
      }

      return NextResponse.json({ received: true, action: 'checkout_completed', product: product.type });
    }

    // Other event types
    return NextResponse.json({ received: true, action: 'ignored' });

  } catch (err) {
    console.error('[Stripe Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
