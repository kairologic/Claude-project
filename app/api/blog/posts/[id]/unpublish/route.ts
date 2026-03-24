import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/auth/auth-helpers';

// Helper: Check if user is admin
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return data?.role === 'admin';
  } catch {
    return false;
  }
}

// POST: Unpublish a post (set status=draft)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIsAdmin = await isAdmin(request);

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const supabase = await createAdminSupabaseClient();

    // Verify post exists
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Update status to draft
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'draft',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to unpublish post' },
      { status: 500 }
    );
  }
}
