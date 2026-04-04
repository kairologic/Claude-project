import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const supabase = createAdminSupabaseClient();

    // Update graphic config if provided
    if (body.config) {
      const { error } = await supabase
        .from('content_graphics')
        .update({ config: body.config, image_url: null })
        .eq('id', params.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Fetch updated graphic
    const { data, error } = await supabase
      .from('content_graphics')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ graphic: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
