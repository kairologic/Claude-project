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

// GET: Fetch a single post by ID
// Public users can only view published posts, admins can view any
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createAdminSupabaseClient();
    const userIsAdmin = await isAdmin(request);

    let query = supabase.from('blog_posts').select('*').eq('id', id).single();

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if public user is trying to access draft post
    if (!userIsAdmin && data.status !== 'published') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PUT: Update a post (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIsAdmin = await isAdmin(request);

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const supabase = await createAdminSupabaseClient();

    // Verify post exists
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE: Hard delete a post (admin only)
export async function DELETE(
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
      .select('id, featured_image_url')
      .eq('id', id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete the post
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
