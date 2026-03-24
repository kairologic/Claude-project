import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { publishToLinkedIn } from '@/lib/content-studio/linkedin-api';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminSupabaseClient();

    // Read channels from the request body (UI sends them)
    const body = await request.json().catch(() => ({}));
    const requestedChannels: string[] = body.channels || [];

    // Fetch the post with graphics
    const { data: post, error: fetchError } = await supabase
      .from('content_posts')
      .select('*, content_graphics(*)')
      .eq('id', params.id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Use channels from the request body, fall back to post.channels
    const channels = requestedChannels.length > 0 ? requestedChannels : (post.channels || []);

    if (channels.length === 0) {
      return NextResponse.json({ error: 'No channels selected for publishing' }, { status: 400 });
    }

    const results: Record<string, { success: boolean; url?: string; error?: string }> = {};
    const graphicUrl = post.content_graphics?.[0]?.image_url;

    // Publish to each selected channel
    for (const channel of channels) {
      try {
        if (channel === 'linkedin') {
          const liResult = await publishToLinkedIn(post.body_linkedin || '', graphicUrl);
          results.linkedin = {
            success: liResult.success,
            url: liResult.postUrl,
            error: liResult.error,
          };

          await supabase.from('content_publish_log').insert({
            post_id: post.id,
            channel: 'linkedin',
            status: liResult.success ? 'success' : 'failed',
            external_id: liResult.postUrn,
            external_url: liResult.postUrl,
            error_message: liResult.error,
            published_at: new Date().toISOString(),
          });
        }

        if (channel === 'blog') {
          // Auto-publish to KairoLogic blog via blog_posts table
          const slug = generateSlug(post.headline || post.topic);
          const { data: blogPost, error: blogError } = await supabase
            .from('blog_posts')
            .insert({
              title: post.headline || post.topic,
              slug,
              excerpt: (post.body_blog || '').substring(0, 200) + '...',
              content: post.body_blog,
              featured_image_url: graphicUrl,
              author_name: 'KairoLogic',
              status: 'published',
              published_at: new Date().toISOString(),
              reading_time_min: Math.ceil((post.body_blog || '').split(' ').length / 200),
              meta_title: post.headline,
              meta_description: (post.body_blog || '').substring(0, 160),
            })
            .select()
            .single();

          const blogUrl = blogPost ? `https://kairologic.net/blog/${slug}` : undefined;
          results.blog = {
            success: !blogError,
            url: blogUrl,
            error: blogError?.message,
          };

          await supabase.from('content_publish_log').insert({
            post_id: post.id,
            channel: 'blog',
            status: blogError ? 'failed' : 'success',
            external_id: slug,
            external_url: blogUrl,
            error_message: blogError?.message,
            published_at: new Date().toISOString(),
          });
        }

        if (channel === 'substack') {
          // Substack is manual — just log it as pending
          results.substack = { success: true };

          await supabase.from('content_publish_log').insert({
            post_id: post.id,
            channel: 'substack',
            status: 'pending',
            published_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        results[channel] = { success: false, error: (err as Error).message };
      }
    }

    // Update post status
    const allSuccess = Object.values(results).every((r) => r.success);
    await supabase
      .from('content_posts')
      .update({ status: allSuccess ? 'published' : 'failed' })
      .eq('id', post.id);

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/-$/, '');
}
