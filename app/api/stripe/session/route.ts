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

    // Extract product info
    const npi = session.client_reference_id || "";
    const email = session.customer_details?.email || session.customer_email || "";
    const amountTotal = (session.amount_total || 0) / 100;

    // Determine product from price/amount
    // Map Stripe prices to our product keys
    const lineItems = session.line_items?.data || [];
    const priceId = lineItems[0]?.price?.id || "";
    const productName = lineItems[0]?.description || lineItems[0]?.price?.product?.name || "";

    // Detect product by amount (most reliable for Payment Links)
    let product = "report";
    if (amountTotal >= 249 || productName.toLowerCase().includes("safe harbor") || productName.toLowerCase().includes("bundle")) {
      product = "safe-harbor";
    } else if (amountTotal >= 149 || productName.toLowerCase().includes("audit") || productName.toLowerCase().includes("report")) {
      product = "report";
    } else if (amountTotal >= 79 || productName.toLowerCase().includes("shield")) {
      product = "shield";
    } else if (amountTotal >= 39 || productName.toLowerCase().includes("watch")) {
      product = "watch";
    }

    // Check for recurring (subscription products)
    const isRecurring = lineItems.some((li: any) => li.price?.type === "recurring");

    return NextResponse.json({
      product,
      npi,
      email,
      amount: amountTotal,
      productName,
      priceId,
      isRecurring,
      paymentStatus: session.payment_status,
    });
  } catch (e: any) {
    console.error("Stripe session fetch error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
