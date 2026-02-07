import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Stripe Webhook v2
 * ============================
 * POST /api/stripe/webhook
 * 
 * Handles checkout.session.completed events.
 * 
 * PRODUCT HIERARCHY:
 *   1. Audit Report ($149)        → report generated, email sent
 *   2. Safe Harbor ($249)         → report + safe harbor materials
 *   3. Safe Harbor + Watch ($249) → report + safe harbor + Watch subscription ($39/mo)
 *   4. Safe Harbor + Shield ($249)→ report + safe harbor + Shield subscription ($79/mo)
 *   5. Sentry Watch ($39/mo)      → Watch subscription (standalone)
 *   6. Sentry Shield ($79/mo)     → Shield subscription (standalone)
 * 
 * BUNDLE LOGIC:
 *   When a bundle product (Safe Harbor + Watch/Shield) is purchased as a
 *   one-time payment, this webhook auto-creates the recurring subscription
 *   via the Stripe API using the customer's payment method.
 * 
 * FLOW:
 *   1. Identify product from session line items / metadata
 *   2. Find provider in registry (by email or client_reference_id NPI)
 *   3. Update registry (is_paid, report_status, subscription_status, widget_status)
 *   4. Log purchase to purchases table
 *   5. If bundle → auto-create Stripe subscription for Watch/Shield
 *   6. Send product-specific email
 *   7. Log to prospects
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// ── Stripe recurring price IDs ──
// Set these in your .env or Vercel environment variables after creating prices in Stripe Dashboard
const STRIPE_WATCH_PRICE_ID = process.env.STRIPE_WATCH_PRICE_ID || '';   // $39/mo recurring price
const STRIPE_SHIELD_PRICE_ID = process.env.STRIPE_SHIELD_PRICE_ID || ''; // $79/mo recurring price

// ── Product Types ──
type ProductType =
  | 'audit-report'
  | 'safe-harbor'
  | 'safe-harbor-watch'
  | 'safe-harbor-shield'
  | 'sentry-watch'
  | 'sentry-shield'
  | 'unknown';

interface ProductInfo {
  type: ProductType;
  displayName: string;
  templateSlug: string;
  includesReport: boolean;
  includesSafeHarbor: boolean;
  includesMonitoring: false | 'watch' | 'shield';
}

// ── Product Config ──
const PRODUCTS: Record<ProductType, Omit<ProductInfo, 'type'>> = {
  'audit-report': {
    displayName: 'Sovereignty Audit Report',
    templateSlug: 'purchase-success',
    includesReport: true,
    includesSafeHarbor: false,
    includesMonitoring: false,
  },
  'safe-harbor': {
    displayName: 'Safe Harbor\u2122 Bundle',
    templateSlug: 'purchase-success',
    includesReport: true,
    includesSafeHarbor: true,
    includesMonitoring: false,
  },
  'safe-harbor-watch': {
    displayName: 'Safe Harbor\u2122 + Sentry Watch',
    templateSlug: 'sentryshield-activation',
    includesReport: true,
    includesSafeHarbor: true,
    includesMonitoring: 'watch',
  },
  'safe-harbor-shield': {
    displayName: 'Safe Harbor\u2122 + Sentry Shield',
    templateSlug: 'sentryshield-activation',
    includesReport: true,
    includesSafeHarbor: true,
    includesMonitoring: 'shield',
  },
  'sentry-watch': {
    displayName: 'Sentry Watch',
    templateSlug: 'sentryshield-activation',
    includesReport: false,
    includesSafeHarbor: false,
    includesMonitoring: 'watch',
  },
  'sentry-shield': {
    displayName: 'Sentry Shield',
    templateSlug: 'sentryshield-activation',
    includesReport: false,
    includesSafeHarbor: false,
    includesMonitoring: 'shield',
  },
  'unknown': {
    displayName: 'KairoLogic Product',
    templateSlug: 'purchase-success',
    includesReport: false,
    includesSafeHarbor: false,
    includesMonitoring: false,
  },
};

// ── Identify product from Stripe session ──
function identifyProduct(session: Record<string, unknown>): ProductInfo {
  const candidates: string[] = [];

  // 1. Check metadata first (most reliable — set on Payment Link)
  const metadata = session.metadata as Record<string, string> | undefined;
  if (metadata?.product) {
    const key = metadata.product.toLowerCase() as ProductType;
    if (PRODUCTS[key]) {
      return { type: key, ...PRODUCTS[key] };
    }
    candidates.push(key);
  }

  // 2. Check client_reference_id format (can encode product: "NPI:product")
  const clientRef = session.client_reference_id as string | undefined;
  if (clientRef && clientRef.includes(':')) {
    const productPart = clientRef.split(':')[1]?.toLowerCase() as ProductType;
    if (PRODUCTS[productPart]) {
      return { type: productPart, ...PRODUCTS[productPart] };
    }
  }

  // 3. Check line items
  const lineItems = session.line_items as Record<string, unknown> | undefined;
  if (lineItems && Array.isArray((lineItems as Record<string, unknown>).data)) {
    for (const item of (lineItems as Record<string, unknown>).data as Record<string, unknown>[]) {
      if (item.description) candidates.push(String(item.description).toLowerCase());
      if (item.price && typeof item.price === 'object') {
        const price = item.price as Record<string, unknown>;
        if (price.product && typeof price.product === 'object') {
          const prod = price.product as Record<string, unknown>;
          if (prod.name) candidates.push(String(prod.name).toLowerCase());
          if (prod.metadata && typeof prod.metadata === 'object') {
            const pMeta = prod.metadata as Record<string, string>;
            if (pMeta.product_type) candidates.push(pMeta.product_type.toLowerCase());
          }
        }
      }
    }
  }

  const combined = candidates.join(' ');

  // Match bundles first (more specific)
  if ((combined.includes('safe harbor') || combined.includes('safe-harbor')) && combined.includes('shield')) {
    return { type: 'safe-harbor-shield', ...PRODUCTS['safe-harbor-shield'] };
  }
  if ((combined.includes('safe harbor') || combined.includes('safe-harbor')) && combined.includes('watch')) {
    return { type: 'safe-harbor-watch', ...PRODUCTS['safe-harbor-watch'] };
  }
  if (combined.includes('safe harbor') || combined.includes('safe-harbor')) {
    return { type: 'safe-harbor', ...PRODUCTS['safe-harbor'] };
  }

  // Standalone monitoring
  if (combined.includes('shield') || combined.includes('sentry shield')) {
    return { type: 'sentry-shield', ...PRODUCTS['sentry-shield'] };
  }
  if (combined.includes('watch') || combined.includes('sentry watch')) {
    return { type: 'sentry-watch', ...PRODUCTS['sentry-watch'] };
  }

  // Report
  if (combined.includes('audit') || combined.includes('report') || combined.includes('forensic') || combined.includes('sovereignty')) {
    return { type: 'audit-report', ...PRODUCTS['audit-report'] };
  }

  // Legacy fallbacks
  if (combined.includes('quick-fix') || combined.includes('quick fix') || combined.includes('blueprint')) {
    return { type: 'safe-harbor', ...PRODUCTS['safe-harbor'] };
  }
  if (combined.includes('sentry') || combined.includes('widget') || combined.includes('sentryguard')) {
    return { type: 'sentry-watch', ...PRODUCTS['sentry-watch'] };
  }

  return { type: 'unknown', ...PRODUCTS['unknown'] };
}

// ── Stripe API helper ──
async function stripeRequest(endpoint: string, body: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!STRIPE_SECRET_KEY) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY not set — cannot create subscription');
    return null;
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Stripe Webhook] Stripe API error (${endpoint}):`, err);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[Stripe Webhook] Stripe API fetch error (${endpoint}):`, err);
    return null;
  }
}

// ── Auto-create subscription for bundle purchases ──
async function createSubscription(
  customerId: string,
  monitoringTier: 'watch' | 'shield',
  npi: string
): Promise<{ subscriptionId: string | null; error: string | null }> {
  const priceId = monitoringTier === 'shield' ? STRIPE_SHIELD_PRICE_ID : STRIPE_WATCH_PRICE_ID;

  if (!priceId) {
    return {
      subscriptionId: null,
      error: `STRIPE_${monitoringTier.toUpperCase()}_PRICE_ID not configured`,
    };
  }

  const sub = await stripeRequest('/subscriptions', {
    'customer': customerId,
    'items[0][price]': priceId,
    'payment_behavior': 'default_incomplete',
    'metadata[npi]': npi,
    'metadata[product]': `sentry-${monitoringTier}`,
    'metadata[created_by]': 'webhook-auto-bundle',
  });

  if (!sub) {
    return { subscriptionId: null, error: 'Stripe subscription creation failed' };
  }

  return { subscriptionId: sub.id as string, error: null };
}

// ── Supabase helpers ──
async function supabaseGet(table: string, query: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function supabasePatch(table: string, query: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}

async function supabaseInsert(table: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}

// ═══════════════════════════════════════════════
// ═══ WEBHOOK HANDLER ═══
// ═══════════════════════════════════════════════

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

    // ── Handle checkout.session.completed ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (!session) {
        return NextResponse.json({ received: true, action: 'no_session_data' });
      }

      const customerEmail = session.customer_email || session.customer_details?.email || '';
      const customerName = session.customer_details?.name || '';
      const customerId = session.customer || '';
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      const paymentId = session.payment_intent || session.id;
      const clientRefId = session.client_reference_id || '';

      // Identify product
      const product = identifyProduct(session);

      const receiptUrl = session.receipt_url
        || (session.payment_intent
          ? `https://dashboard.stripe.com/payments/${session.payment_intent}`
          : '');

      console.log(`[Stripe Webhook] Payment: ${customerEmail}, $${amountTotal}, ${product.displayName} (${product.type}), customer: ${customerId}`);

      // ── 1. Find provider ──
      // Try by NPI (from client_reference_id) first, then by email
      let provider: Record<string, unknown> | null = null;
      const npi = clientRefId?.split(':')[0] || clientRefId || '';

      if (npi && /^\d{10}$/.test(npi)) {
        const providers = await supabaseGet('registry', `npi=eq.${npi}&limit=1`);
        if (providers?.length) provider = providers[0];
      }

      if (!provider && customerEmail) {
        const providers = await supabaseGet('registry', `email=eq.${encodeURIComponent(customerEmail)}&limit=1`);
        if (providers?.length) provider = providers[0];
      }

      // ── 2. Update registry ──
      if (provider) {
        const registryUpdate: Record<string, unknown> = {
          is_paid: true,
          updated_at: new Date().toISOString(),
        };

        if (product.includesReport) {
          registryUpdate.report_status = 'generated';
        }

        if (product.includesMonitoring) {
          registryUpdate.subscription_status = 'active';
          registryUpdate.widget_status = 'active';
          registryUpdate.subscription_tier = product.includesMonitoring; // 'watch' or 'shield'
        }

        await supabasePatch('registry', `id=eq.${provider.id}`, registryUpdate);
        console.log(`[Stripe Webhook] Registry updated: ${provider.name} (${provider.npi}) — ${product.type}`);
      } else {
        console.warn(`[Stripe Webhook] No provider found for email=${customerEmail}, npi=${npi}`);
      }

      // ── 3. Log purchase ──
      await supabaseInsert('purchases', {
        npi: provider?.npi || npi || null,
        email: customerEmail,
        customer_name: customerName,
        stripe_customer_id: customerId,
        stripe_session_id: session.id,
        stripe_payment_intent: paymentId,
        product_type: product.type,
        product_name: product.displayName,
        amount: amountTotal,
        includes_report: product.includesReport,
        includes_safe_harbor: product.includesSafeHarbor,
        includes_monitoring: product.includesMonitoring || null,
        receipt_url: receiptUrl,
        created_at: new Date().toISOString(),
      });
      console.log(`[Stripe Webhook] Purchase logged: ${product.type}`);

      // ── 4. Auto-create subscription for bundles ──
      let subscriptionResult: { subscriptionId: string | null; error: string | null } = {
        subscriptionId: null,
        error: null,
      };

      if (product.includesMonitoring && customerId) {
        console.log(`[Stripe Webhook] Creating ${product.includesMonitoring} subscription for customer ${customerId}...`);
        subscriptionResult = await createSubscription(
          customerId,
          product.includesMonitoring,
          (provider?.npi as string) || npi
        );

        if (subscriptionResult.subscriptionId) {
          console.log(`[Stripe Webhook] Subscription created: ${subscriptionResult.subscriptionId}`);
          // Update registry with subscription ID
          if (provider) {
            await supabasePatch('registry', `id=eq.${provider.id}`, {
              stripe_subscription_id: subscriptionResult.subscriptionId,
            });
          }
        } else {
          console.error(`[Stripe Webhook] Subscription creation failed: ${subscriptionResult.error}`);
          // Non-fatal — the purchase is still valid, just flag for manual follow-up
          if (provider) {
            await supabasePatch('registry', `id=eq.${provider.id}`, {
              subscription_status: 'pending_activation',
              admin_notes: `Auto-subscription failed: ${subscriptionResult.error}. Needs manual activation.`,
            });
          }
        }
      }

      // ── 5. Send product-specific email ──
      if (customerEmail) {
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
                product_type: product.type,
                payment_id: paymentId,
                receiptUrl: receiptUrl,
                npi: (provider?.npi as string) || npi || '',
                includes_report: product.includesReport,
                includes_safe_harbor: product.includesSafeHarbor,
                monitoring_tier: product.includesMonitoring || '',
                subscription_id: subscriptionResult.subscriptionId || '',
                // Success page URL with product context
                deliverables_url: `${origin}/payment/success?npi=${(provider?.npi as string) || npi}&product=${product.type}&email=${encodeURIComponent(customerEmail)}`,
              },
            }),
          });
          console.log(`[Stripe Webhook] Email sent: ${product.templateSlug} → ${customerEmail}`);
        } catch (emailErr) {
          console.error('[Stripe Webhook] Email error:', emailErr);
        }
      }

      // ── 6. Log to prospects ──
      try {
        await supabaseInsert('prospects', {
          source: 'discovery',
          contact_name: customerName,
          email: customerEmail,
          status: 'qualified',
          priority: 'high',
          admin_notes: `Stripe: $${amountTotal.toFixed(2)} — ${product.displayName}${subscriptionResult.subscriptionId ? ` (sub: ${subscriptionResult.subscriptionId})` : ''}`,
          form_data: {
            stripe_event: event.type,
            stripe_session_id: session.id,
            payment_intent: paymentId,
            customer_id: customerId,
            amount: amountTotal,
            product_type: product.type,
            product_name: product.displayName,
            includes_monitoring: product.includesMonitoring,
            subscription_id: subscriptionResult.subscriptionId,
            npi: (provider?.npi as string) || npi || '',
          },
        });
      } catch (prospectErr) {
        console.error('[Stripe Webhook] Prospect error:', prospectErr);
      }

      return NextResponse.json({
        received: true,
        action: 'checkout_completed',
        product: product.type,
        subscription_created: !!subscriptionResult.subscriptionId,
        subscription_id: subscriptionResult.subscriptionId,
      });
    }

    // ── Handle subscription events ──
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data?.object;
      if (!subscription) {
        return NextResponse.json({ received: true, action: 'no_subscription_data' });
      }

      const subNpi = subscription.metadata?.npi;
      const subStatus = subscription.status; // active, canceled, past_due, etc.

      if (subNpi) {
        const widgetStatus = subStatus === 'active' ? 'active' : 'hidden';
        const subscriptionStatus = subStatus === 'active' ? 'active' : 'inactive';

        await supabasePatch('registry', `npi=eq.${subNpi}`, {
          subscription_status: subscriptionStatus,
          widget_status: widgetStatus,
          updated_at: new Date().toISOString(),
        });

        console.log(`[Stripe Webhook] Subscription ${event.type}: NPI ${subNpi} → ${subscriptionStatus}`);
      }

      return NextResponse.json({ received: true, action: event.type, status: subStatus });
    }

    // ── Handle payment failures ──
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data?.object;
      const subId = invoice?.subscription;
      const custEmail = invoice?.customer_email;

      console.warn(`[Stripe Webhook] Payment failed: sub=${subId}, email=${custEmail}`);

      // Could send a dunning email here in the future
      return NextResponse.json({ received: true, action: 'payment_failed' });
    }

    // Other events
    return NextResponse.json({ received: true, action: 'ignored' });

  } catch (err) {
    console.error('[Stripe Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// ── CORS for OPTIONS preflight ──
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    },
  });
}
