import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const { registryId, name, email, npi } = body;

    if (!registryId || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get practice name from registry
    let practiceName = name;
    const { data: registryData } = await supabaseAdmin
      .from("registry")
      .select("name, npi")
      .eq("id", registryId)
      .single();
    
    if (registryData?.name) {
      practiceName = registryData.name;
    }

    // Insert prospect
    const { error: prospectError } = await supabaseAdmin.from("prospects").insert({
      source: "registry-claim",
      contact_name: name,
      email,
      status: "hot",
      priority: "high",
      admin_notes: `Claimed registry ID: ${registryId}. NPI: ${npi || registryData?.npi || "N/A"}.`,
      form_data: { npi, registry_id: registryId, claim_source: "registry-page" },
    });
    if (prospectError) console.error("Prospect insert error:", prospectError);

    // Update registry record with email (marks as claimed)
    const updateData: any = { email, updated_at: new Date().toISOString() };
    if (npi) updateData.npi = npi;

    const { error: registryError } = await supabaseAdmin
      .from("registry")
      .update(updateData)
      .eq("id", registryId);

    if (registryError) {
      console.error("Registry update error:", registryError);
      return NextResponse.json({ error: "Failed to update registry" }, { status: 500 });
    }

    // Send confirmation email to the provider
    try {
      const origin = req.headers.get('origin') || req.nextUrl.origin || 'https://kairologic.net';
      await fetch(`${origin}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: 'registry-claim-confirm',
          npi: npi || registryData?.npi || '',
          variables: {
            email,
            contact_name: name,
            practice_name: practiceName,
            npi: npi || registryData?.npi || 'N/A',
          },
        }),
      });
      console.log(`[Registry Claim] Confirmation email sent to ${email}`);
    } catch (emailErr) {
      console.error('[Registry Claim] Email failed:', emailErr);
      // Non-blocking — claim still succeeds
    }

    // Send admin notification
    try {
      const origin = req.headers.get('origin') || req.nextUrl.origin || 'https://kairologic.net';
      await fetch(`${origin}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: 'registry-claim-confirm',
          npi: npi || registryData?.npi || '',
          variables: {
            email: 'compliance@kairologic.com',
            contact_name: name,
            practice_name: practiceName,
            npi: npi || registryData?.npi || 'N/A',
            _force_internal: 'true',
          },
        }),
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Claim API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
