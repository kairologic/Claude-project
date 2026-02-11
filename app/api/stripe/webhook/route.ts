import { NextRequest, NextResponse } from 'next/server';

/**
 * KairoLogic Stripe Webhook v3
 * ============================
 * POST /api/stripe/webhook
 * 
 * PRODUCT LINEUP (v3):
 *   1. Audit Report ($149)      → report + 3-month Shield trial
 *   2. Safe Harbor ($249)       → report + safe harbor + 3-month Shield trial
 *   3. Sentry Shield ($79/mo)   → Shield subscription (immediate billing)
 *   4. Sentry Watch ($39/mo)    → Watch subscription (downgrade only, never sold directly)
 * 
 * TRIAL LOGIC:
 *   Report & Safe Harbor purchases auto-create a Shield subscription
 *   with a 90-day free trial (trial_period_days=90). After trial:
 *   - Customer converts to Shield ($79/mo), or
 *   - Downgrades to Watch ($39/mo), or
 *   - Cancels entirely
 * 
 * FLOW:
 *   1. Identify product from session metadata / line items
 *   2. Find provider in registry (by NPI or email)
 *   3. Update registry (is_paid, report_status, subscription_status, widget_status)
 *   4. Log purchase to purchases table
 *   5. If report/safe-harbor → auto-create Shield subscription with 90-day trial
 *   6. Send product-specific email
 *   7. Log to prospects
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// ── Stripe recurring price IDs ──
const STRIPE_SHIELD_PRICE_ID = process.env.STRIPE_SHIELD_PRICE_ID || ''; // $79/mo recurring price
const STRIPE_WATCH_PRICE_ID = process.env.STRIPE_WATCH_PRICE_ID || '';   // $39/mo recurring price (downgrade)

// ── Shield trial duration ──
const SHIELD_TRIAL_DAYS = 90; // 3 months free with Report or Safe Harbor

// ── Product Types ──
type ProductType =
  | 'audit-report'
  | 'safe-harbor'
  | 'sentry-shield'
  | 'sentry-watch'
  | 'unknown';

interface ProductInfo {
  type: ProductType;
  displayName: string;
  templateSlug: string;
  includesReport: boolean;
  includesSafeHarbor: boolean;
  includesShieldTrial: boolean;    // 90-day free Shield for report/safe-harbor
  includesMonitoring: false | 'shield' | 'watch';
}

// ── Product Config ──
const PRODUCTS: Record<ProductType, Omit<ProductInfo, 'type'>> = {
  'audit-report': {
    displayName: 'Sovereignty Audit Report',
    templateSlug: 'purchase-success',
    includesReport: true,
    includesSafeHarbor: false,
    includesShieldTrial: true,     // 3 months Shield FREE
    includesMonitoring: 'shield',
  },
  'safe-harbor': {
    displayName: 'Safe Harbor\u2122 Compliance Bundle',
    templateSlug: 'purchase-success',
    includesReport: true,
    includesSafeHarbor: true,
    includesShieldTrial: true,     // 3 months Shield FREE
    includesMonitoring: 'shield',
  },
  'sentry-shield': {
    displayName: 'Sentry Shield — Continuous Compliance',
    templateSlug: 'sentryshield-activation',
    includesReport: true,          // Shield includes free audit report
    includesSafeHarbor: false,
    includesShieldTrial: false,    // No trial — immediate billing
    includesMonitoring: 'shield',
  },
  'sentry-watch': {
    displayName: 'Sentry Watch — Basic Monitoring',
    templateSlug: 'sentryshield-activation',
    includesReport: false,
    includesSafeHarbor: false,
    includesShieldTrial: false,
    includesMonitoring: 'watch',
  },
  'unknown': {
    displayName: 'KairoLogic Product',
    templateSlug: 'purchase-success',
    includesReport: false,
    includesSafeHarbor: false,
    includesShieldTrial: false,
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

  // 4. Fallback: check amount
  const amountTotal = session.amount_total as number | undefined;
  if (amountTotal) {
    const dollars = amountTotal / 100;
    if (dollars >= 200) candidates.push('safe-harbor');
    else if (dollars >= 100) candidates.push('audit-report');
  }

  const combined = candidates.join(' ');

  // Match products
  if (combined.includes('safe harbor') || combined.includes('safe-harbor')) {
    return { type: 'safe-harbor', ...PRODUCTS['safe-harbor'] };
  }
  if (combined.includes('shield') || combined.includes('sentry shield') || combined.includes('sentry-shield')) {
    return { type: 'sentry-shield', ...PRODUCTS['sentry-shield'] };
  }
  if (combined.includes('watch') || combined.includes('sentry watch') || combined.includes('sentry-watch')) {
    return { type: 'sentry-watch', ...PRODUCTS['sentry-watch'] };
  }
  if (combined.includes('audit') || combined.includes('report') || combined.includes('forensic') || combined.includes('sovereignty')) {
    return { type: 'audit-report', ...PRODUCTS['audit-report'] };
  }

  // Legacy fallbacks
  if (combined.includes('quick-fix') || combined.includes('blueprint') || combined.includes('bundle')) {
    return { type: 'safe-harbor', ...PRODUCTS['safe-harbor'] };
  }

  return { type: 'unknown', ...PRODUCTS['unknown'] };
}

// ── Stripe API helper ──
async function stripeRequest(endpoint: string, body: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!STRIPE_SECRET_KEY) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY not set');
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

// ── Create Shield subscription (with optional 90-day trial) ──
async function createShieldSubscription(
  customerId: string,
  npi: string,
  withTrial: boolean,
  sourceProduct: string
): Promise<{ subscriptionId: string | null; error: string | null }> {
  if (!STRIPE_SHIELD_PRICE_ID) {
    return { subscriptionId: null, error: 'STRIPE_SHIELD_PRICE_ID not configured' };
  }

  const params: Record<string, string> = {
    'customer': customerId,
    'items[0][price]': STRIPE_SHIELD_PRICE_ID,
    'metadata[npi]': npi,
    'metadata[product]': 'sentry-shield',
    'metadata[source_product]': sourceProduct,
    'metadata[created_by]': withTrial ? 'webhook-auto-trial' : 'webhook-direct',
  };

  // Add 90-day trial for Report and Safe Harbor purchases
  if (withTrial) {
    params['trial_period_days'] = String(SHIELD_TRIAL_DAYS);
    params['metadata[trial_type]'] = '90-day-shield';
    params['metadata[trial_end_action]'] = 'prompt-convert-or-downgrade';
  } else {
    params['payment_behavior'] = 'default_incomplete';
  }

  const sub = await stripeRequest('/subscriptions', params);
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
          registryUpdate.subscription_status = product.includesShieldTrial ? 'trialing' : 'active';
          registryUpdate.widget_status = 'active';
          registryUpdate.subscription_tier = product.includesMonitoring; // 'shield' or 'watch'
        }

        if (product.includesShieldTrial) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + SHIELD_TRIAL_DAYS);
          registryUpdate.trial_end_date = trialEnd.toISOString();
          registryUpdate.trial_source_product = product.type;
        }

        await supabasePatch('registry', `id=eq.${provider.id}`, registryUpdate);
        console.log(`[Stripe Webhook] Registry updated: ${provider.name} (${provider.npi}) — ${product.type}${product.includesShieldTrial ? ' (90-day Shield trial)' : ''}`);
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
        includes_shield_trial: product.includesShieldTrial,
        receipt_url: receiptUrl,
        created_at: new Date().toISOString(),
      });
      console.log(`[Stripe Webhook] Purchase logged: ${product.type}`);

      // ── 4. Auto-create Shield subscription ──
      // For Report/Safe Harbor: 90-day trial
      // For standalone Shield: this is already handled by Stripe (it's a recurring product)
      let subscriptionResult: { subscriptionId: string | null; error: string | null } = {
        subscriptionId: null,
        error: null,
      };

      if (product.includesShieldTrial && customerId) {
        // Report or Safe Harbor → auto-create Shield sub with 90-day trial
        console.log(`[Stripe Webhook] Creating Shield subscription with ${SHIELD_TRIAL_DAYS}-day trial for customer ${customerId}...`);
        subscriptionResult = await createShieldSubscription(
          customerId,
          (provider?.npi as string) || npi,
          true,   // withTrial = true
          product.type
        );

        if (subscriptionResult.subscriptionId) {
          console.log(`[Stripe Webhook] Shield trial subscription created: ${subscriptionResult.subscriptionId}`);
          if (provider) {
            await supabasePatch('registry', `id=eq.${provider.id}`, {
              stripe_subscription_id: subscriptionResult.subscriptionId,
            });
          }
        } else {
          console.error(`[Stripe Webhook] Shield trial creation failed: ${subscriptionResult.error}`);
          if (provider) {
            await supabasePatch('registry', `id=eq.${provider.id}`, {
              subscription_status: 'pending_activation',
              admin_notes: `Auto-trial failed: ${subscriptionResult.error}. Needs manual activation.`,
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
                includes_shield_trial: product.includesShieldTrial,
                trial_days: product.includesShieldTrial ? SHIELD_TRIAL_DAYS : 0,
                subscription_id: subscriptionResult.subscriptionId || '',
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
          admin_notes: `Stripe: $${amountTotal.toFixed(2)} — ${product.displayName}${product.includesShieldTrial ? ' (+ 90-day Shield trial)' : ''}${subscriptionResult.subscriptionId ? ` (sub: ${subscriptionResult.subscriptionId})` : ''}`,
          form_data: {
            stripe_event: event.type,
            stripe_session_id: session.id,
            payment_intent: paymentId,
            customer_id: customerId,
            amount: amountTotal,
            product_type: product.type,
            product_name: product.displayName,
            includes_monitoring: product.includesMonitoring,
            includes_shield_trial: product.includesShieldTrial,
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
        shield_trial: product.includesShieldTrial,
      });
    }

    // ── Handle subscription events ──
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data?.object;
      if (!subscription) {
        return NextResponse.json({ received: true, action: 'no_subscription_data' });
      }

      const subNpi = subscription.metadata?.npi;
      const subStatus = subscription.status; // active, canceled, past_due, trialing, etc.

      if (subNpi) {
        let widgetStatus = 'hidden';
        let subscriptionStatus = 'inactive';
        let subscriptionTier: string | null = null;

        if (subStatus === 'active' || subStatus === 'trialing') {
          widgetStatus = 'active';
          subscriptionStatus = subStatus; // 'active' or 'trialing'
          
          // Determine tier from price
          const priceId = subscription.items?.data?.[0]?.price?.id;
          if (priceId === STRIPE_SHIELD_PRICE_ID) {
            subscriptionTier = 'shield';
          } else if (priceId === STRIPE_WATCH_PRICE_ID) {
            subscriptionTier = 'watch';
          }
        }

        const update: Record<string, unknown> = {
          subscription_status: subscriptionStatus,
          widget_status: widgetStatus,
          updated_at: new Date().toISOString(),
        };
        if (subscriptionTier) {
          update.subscription_tier = subscriptionTier;
        }

        await supabasePatch('registry', `npi=eq.${subNpi}`, update);
        console.log(`[Stripe Webhook] Subscription ${event.type}: NPI ${subNpi} → ${subscriptionStatus}${subscriptionTier ? ` (${subscriptionTier})` : ''}`);
      }

      return NextResponse.json({ received: true, action: event.type, status: subStatus });
    }

    // ── Handle trial ending (subscription goes from trialing to active or past_due) ──
    if (event.type === 'customer.subscription.trial_will_end') {
      // Stripe sends this 3 days before trial ends
      const subscription = event.data?.object;
      const subNpi = subscription?.metadata?.npi;
      const custEmail = subscription?.metadata?.email || '';

      console.log(`[Stripe Webhook] Trial ending soon: NPI=${subNpi}, email=${custEmail}`);
      
      // Could send a "trial ending" email here
      // For now, just log it
      return NextResponse.json({ received: true, action: 'trial_will_end', npi: subNpi });
    }

    // ── Handle payment failures ──
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data?.object;
      const subId = invoice?.subscription;
      const custEmail = invoice?.customer_email;

      console.warn(`[Stripe Webhook] Payment failed: sub=${subId}, email=${custEmail}`);
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
