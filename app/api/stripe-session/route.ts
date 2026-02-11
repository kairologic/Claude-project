import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Fetch session with line items expanded
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`,
      {
        headers: { Authorization: `Bearer ${stripeKey}` },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Stripe error" }, { status: res.status });
    }

    const session = await res.json();

    // Extract basic info
    const npi = session.client_reference_id || "";
    const email = session.customer_details?.email || session.customer_email || "";
    const amountTotal = (session.amount_total || 0) / 100;

    const lineItems = session.line_items?.data || [];
    const priceId = lineItems[0]?.price?.id || "";
    const productName = lineItems[0]?.description || lineItems[0]?.price?.product?.name || "";

    // ── Product Detection (v3 — 3 products + hidden watch) ──
    // Priority: metadata > product name > amount
    let product = "report";

    // 1. Check metadata (most reliable — set on Payment Link)
    const metadata = session.metadata as Record<string, string> | undefined;
    if (metadata?.product) {
      const metaProduct = metadata.product.toLowerCase();
      if (metaProduct === 'audit-report') product = 'report';
      else if (metaProduct === 'safe-harbor') product = 'safe-harbor';
      else if (metaProduct === 'sentry-shield') product = 'shield';
      else if (metaProduct === 'sentry-watch') product = 'watch';
      else product = metaProduct;
    } else {
      // 2. Fallback: detect from product name or amount
      const nameLower = productName.toLowerCase();
      if (nameLower.includes('safe harbor') || nameLower.includes('safe-harbor') || nameLower.includes('bundle')) {
        product = "safe-harbor";
      } else if (nameLower.includes('shield')) {
        product = "shield";
      } else if (nameLower.includes('watch')) {
        product = "watch";
      } else if (nameLower.includes('audit') || nameLower.includes('report') || nameLower.includes('sovereignty')) {
        product = "report";
      } else if (amountTotal >= 200) {
        product = "safe-harbor";
      } else if (amountTotal >= 100) {
        product = "report";
      } else if (amountTotal >= 70) {
        product = "shield";
      } else if (amountTotal >= 30) {
        product = "watch";
      }
    }

    // Check if recurring
    const isRecurring = lineItems.some((li: any) => li.price?.type === "recurring");

    // Determine trial status
    const includesShieldTrial = product === 'report' || product === 'safe-harbor';

    return NextResponse.json({
      product,
      npi,
      email,
      amount: amountTotal,
      productName,
      priceId,
      isRecurring,
      includesShieldTrial,
      paymentStatus: session.payment_status,
    });
  } catch (e: any) {
    console.error("Stripe session fetch error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
