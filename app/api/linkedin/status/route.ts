import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('linkedin_connections')
      .select('linkedin_name, linkedin_email, expires_at, is_active, updated_at')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    const expired = new Date(data.expires_at) < new Date();
    return NextResponse.json({
      connected: true,
      expired,
      name: data.linkedin_name,
      email: data.linkedin_email,
      connected_at: data.updated_at,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// Disconnect LinkedIn
export async function DELETE() {
  try {
    const supabase = createAdminSupabaseClient();

    await supabase
      .from('linkedin_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
