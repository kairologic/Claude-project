import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getOverviewStats } from '@/lib/content-studio/pipeline-queries';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function GET(request: NextRequest) {
  try {
    const stats = await getOverviewStats();
    const category = request.nextUrl.searchParams.get('category')?.trim();

    const categoryInstruction = category
      ? `Focus all suggestions specifically on the category/area: "${category}". Every topic must relate directly to this category within the healthcare credentialing and practice management space.`
      : 'Cover a variety of relevant topics across credentialing, compliance, and practice management.';

    const prompt = `Based on these KairoLogic pipeline statistics, suggest 5 compelling content topics for LinkedIn thought leadership posts targeting healthcare practice managers and credentialing professionals.

${categoryInstruction}

Pipeline Stats:
- Total providers monitored: ${stats.total_providers || 'N/A'}
- Total practices: ${stats.total_practices || 'N/A'}
- Practices with data mismatches: ${stats.practices_with_mismatches || 'N/A'}
- NPPES delta events this week: ${stats.recent_delta_events || 'N/A'}

Return a JSON array of objects with "topic" and "angle" fields. Topics should be specific, data-backed, and timely. No markdown fences.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const suggestions = JSON.parse(cleaned);

    return NextResponse.json({ suggestions, stats });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
