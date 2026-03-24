import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string | null;
  category_id: string | null;
  author_name: string;
  author_avatar_url: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  reading_time_min: number;
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * Get all published posts ordered by published_at (newest first)
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const supabase = await createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching published posts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPublishedPosts:', error);
    return [];
  }
}

/**
 * Get a single published post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = await createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getPostBySlug:', error);
    return null;
  }
}

/**
 * Get all published posts in a specific category
 */
export async function getPostsByCategory(categoryId: string): Promise<BlogPost[]> {
  try {
    const supabase = await createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts by category:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPostsByCategory:', error);
    return [];
  }
}

/**
 * Get related posts based on the same category (excluding the current post)
 * Limit to 3 most recent posts
 */
export async function getRelatedPosts(
  postId: string,
  categoryId: string | null,
  limit: number = 3
): Promise<BlogPost[]> {
  try {
    if (!categoryId) {
      return [];
    }

    const supabase = await createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .neq('id', postId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRelatedPosts:', error);
    return [];
  }
}

/**
 * Get all blog categories ordered by sort_order
 */
export async function getCategories(): Promise<BlogCategory[]> {
  try {
    const supabase = await createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCategories:', error);
    return [];
  }
}

/**
 * Increment the view count for a post by 1
 */
export async function incrementViewCount(postId: string): Promise<boolean> {
  try {
    const supabase = await createAdminSupabaseClient();

    const { error } = await supabase.rpc('increment_blog_view_count', {
      post_id: postId,
    });

    if (error) {
      // Fallback: manually increment if RPC doesn't exist
      const { data: post } = await supabase
        .from('blog_posts')
        .select('view_count')
        .eq('id', postId)
        .single();

      if (post) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq('id', postId);

        return !updateError;
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementViewCount:', error);
    return false;
  }
}
