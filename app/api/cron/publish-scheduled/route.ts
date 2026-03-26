import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { publishToLinkedIn } from '@/lib/content-studio/linkedin-api';

/**
 * Vercel Cron Job: Runs every 15 minutes to publish scheduled posts.
 * Finds posts with status='scheduled' and scheduled_at <= now(),
 * then publishes them to their selected channels.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development or if no CRON_SECRET set, allow access
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Find all posts that are scheduled and due
    const { data: duePosts, error: fetchError } = await supabase
      .from('content_posts')
      .select('*, content_graphics(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('Cron: failed to fetch scheduled posts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ message: 'No scheduled posts due', published: 0 });
    }

    const results: { id: string; status: string; channels: Record<string, { success: boolean; error?: string }> }[] = [];

    for (const post of duePosts) {
      const channels = post.channels || [];
      const graphicUrl = post.content_graphics?.[0]?.image_url;
      const channelResults: Record<string, { success: boolean; url?: string; error?: string }> = {};

      for (const channel of channels) {
        try {
          if (channel === 'linkedin') {
            const liResult = await publishToLinkedIn(post.body_linkedin || '', graphicUrl);
            channelResults.linkedin = {
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
            const slug = generateSlug(post.headline || post.topic);
            const { error: blogError } = await supabase
              .from('blog_posts')
              .upsert(
                {
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
                },
                { onConflict: 'slug' }
              );

            const blogUrl = `https://kairologic.net/blog/${slug}`;
            channelResults.blog = {
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
            channelResults.substack = { success: true };
            await supabase.from('content_publish_log').insert({
              post_id: post.id,
              channel: 'substack',
              status: 'pending',
              published_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          channelResults[channel] = { success: false, error: (err as Error).message };
        }
      }

      // Update post status
      const anySuccess = Object.values(channelResults).some((r) => r.success);
      const newStatus = anySuccess ? 'published' : 'failed';
      await supabase
        .from('content_posts')
        .update({ status: newStatus, scheduled_at: null })
        .eq('id', post.id);

      results.push({ id: post.id, status: newStatus, channels: channelResults });
    }

    return NextResponse.json({
      message: `Published ${results.length} scheduled post(s)`,
      published: results.length,
      results,
    });
  } catch (err) {
    console.error('Cron: unexpected error:', err);
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
