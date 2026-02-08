import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registryId, name, email, npi } = body;

    if (!registryId || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert prospect
    const { error: prospectError } = await supabaseAdmin.from("prospects").insert({
      source: "registry-claim",
      contact_name: name,
      email,
      status: "hot",
      priority: "high",
      admin_notes: `Claimed registry ID: ${registryId}. NPI: ${npi || "N/A"}.`,
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

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Claim API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
