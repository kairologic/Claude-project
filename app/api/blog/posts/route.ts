import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/auth/auth-helpers';

// Helper: Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Helper: Calculate reading time (200 words per minute)
function calculateReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// Helper: Generate excerpt from content (first 160 chars)
function generateExcerpt(content: string): string {
  return content.substring(0, 160).trim();
}

// Helper: Check if user is admin
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Check if user is admin (you may need to adjust based on your auth setup)
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return data?.role === 'admin';
  } catch {
    return false;
  }
}

// GET: List all posts (public users see published only, admins see all)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const userIsAdmin = await isAdmin(request);

    let query = supabase.from('blog_posts').select('*').order('published_at', { ascending: false });

    // Non-admin users only see published posts
    if (!userIsAdmin) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST: Create a new post (admin only)
export async function POST(request: NextRequest) {
  try {
    const userIsAdmin = await isAdmin(request);

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      content,
      excerpt,
      featured_image_url,
      category_id,
      author_name,
      author_avatar_url,
      meta_title,
      meta_description,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = generateSlug(title);
    const reading_time_min = calculateReadingTime(content);
    const finalExcerpt = excerpt || generateExcerpt(content);

    const supabase = await createAdminSupabaseClient();

    // Check if slug already exists
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingPost) {
      return NextResponse.json({ error: 'A post with this title already exists' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        content,
        excerpt: finalExcerpt,
        featured_image_url,
        category_id,
        author_name: author_name || 'KairoLogic',
        author_avatar_url,
        status: 'draft',
        reading_time_min,
        meta_title,
        meta_description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
