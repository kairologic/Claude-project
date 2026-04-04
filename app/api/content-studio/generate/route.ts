import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { conductResearch } from '@/lib/content-studio/research';
import { generateContent } from '@/lib/content-studio/writer';

export async function POST(request: Request) {
  try {
    const { topic, audience, intent, angle } = await request.json();

    if (!topic || !audience || !intent) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, audience, intent' },
        { status: 400 },
      );
    }

    // Audience and intent are free-text — passed directly to the AI writer

    // Step 1: Create draft record
    const supabase = createAdminSupabaseClient();
    const { data: post, error: insertError } = await supabase
      .from('content_posts')
      .insert({ topic, audience, intent, status: 'draft', channels: [] })
      .select()
      .single();

    if (insertError || !post) {
      return NextResponse.json(
        { error: `Failed to create post: ${insertError?.message}` },
        { status: 500 },
      );
    }

    // Step 2: Conduct research
    const researchContext = await conductResearch(topic, audience, intent);

    // Step 3: Generate content
    const content = await generateContent(topic, audience, intent, researchContext, angle);

    // Step 4: Update post with generated content
    const { error: updateError } = await supabase
      .from('content_posts')
      .update({
        headline: content.headline,
        body_linkedin: content.body_linkedin,
        body_blog: content.body_blog,
        body_substack: content.body_substack,
        graphic_brief: content.graphic_brief,
        research_context: researchContext,
      })
      .eq('id', post.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update post: ${updateError.message}` },
        { status: 500 },
      );
    }

    // Step 5: Create graphic record
    const { error: graphicError } = await supabase.from('content_graphics').insert({
      post_id: post.id,
      graphic_type: content.graphic_brief.type,
      config: content.graphic_brief,
    });

    if (graphicError) {
      console.error('Failed to create graphic record:', graphicError);
    }

    return NextResponse.json({
      success: true,
      post: { id: post.id },
      headline: content.headline,
      graphic_type: content.graphic_brief.type,
    });
  } catch (err) {
    console.error('Content generation failed:', err);
    return NextResponse.json(
      { error: `Generation failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
