import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    // Fetch all active connections (personal + organization)
    const { data: connections, error } = await supabase
      .from('linkedin_connections')
      .select('account_type, linkedin_name, linkedin_email, organization_id, organization_name, expires_at, is_active, updated_at')
      .eq('is_active', true);

    if (error || !connections || connections.length === 0) {
      return NextResponse.json({ connected: false, accounts: [] });
    }

    const accounts = connections.map((c) => ({
      account_type: c.account_type || 'personal',
      name: c.account_type === 'organization' ? (c.organization_name || 'Company Page') : c.linkedin_name,
      email: c.linkedin_email,
      organization_id: c.organization_id,
      expired: new Date(c.expires_at) < new Date(),
      connected_at: c.updated_at,
    }));

    // Backward compatibility: report connected if any account is active and not expired
    const anyConnected = accounts.some((a) => !a.expired);

    return NextResponse.json({
      connected: anyConnected,
      accounts,
      // Legacy fields for backward compat
      name: accounts.find((a) => a.account_type === 'personal')?.name || accounts[0]?.name,
      email: accounts.find((a) => a.account_type === 'personal')?.email,
      expired: !anyConnected,
    });
  } catch {
    return NextResponse.json({ connected: false, accounts: [] });
  }
}

// Disconnect LinkedIn — supports disconnecting specific account type
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get('type'); // 'personal' or 'organization'

    let query = supabase
      .from('linkedin_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    if (accountType) {
      query = query.eq('account_type', accountType);
    }

    await query;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
