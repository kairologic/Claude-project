/**
 * Writing Engine: generates channel-specific content using Claude API
 * with the established KairoLogic voice and content rules.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ResearchContext } from './research';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export interface GeneratedContent {
  headline: string;
  body_linkedin: string;
  body_blog: string;
  body_substack: string;
  graphic_brief: GraphicBrief;
}

export interface GraphicBrief {
  type: 'data_viz' | 'process_diagram' | 'stat_card' | 'comparison';
  title: string;
  subtitle: string;
  data_query?: string;
  labels?: Record<string, string>;
  chart_type?: 'bar' | 'donut' | 'line' | 'stacked_bar';
  hero_number?: string;
  hero_context?: string;
  left_panel?: { title: string; items: string[] };
  right_panel?: { title: string; items: string[] };
}

const WRITER_SYSTEM_PROMPT = `You are the content writer for KairoLogic, a provider data intelligence platform that monitors 1.8M+ provider records for data integrity, credential drift, and state regulation compliance.

## Writing Rules (STRICT — follow exactly)
- NEVER use em dashes (—) or double dashes (--). Use commas instead.
- Write in first person: "I" for personal observations, "we" for company/team statements
- Mimic natural thought-jumping: transition between ideas the way someone talks, not writes
- Show genuine uncertainty where appropriate: "I think," "from what we're seeing," "this might be"
- Use personal experience as credibility: "When we built this," "What I keep seeing in the data"
- No corporate jargon or buzzword-heavy sentences
- Sound like a founder who deeply understands the problem, not a marketing team

## Audience Framing
- practice_manager: focus on time savings, risk reduction, operational efficiency
- credentialing: focus on accuracy, compliance, NCQA standards, verification workflows
- compliance: focus on audit readiness, regulatory exposure, enforcement actions
- executive: focus on financial impact, liability, competitive advantage

## Channel Formatting
- LinkedIn: 1300-2800 characters. Hook in first two lines (stat or contrarian take). Line breaks for readability. End with engagement prompt or link CTA.
- Blog: 800-1500 words. Headers (##). Problem framing intro. Data references inline. End with "Explore the dashboard" CTA.
- Substack: 600-1200 words. Personal opening/anecdote. Conversational newsletter tone. End with subscribe/share CTA.

## Graphic Brief
Always include a graphic_brief in your response describing what visual to generate. Choose the most impactful type:
- data_viz: for data with clear comparisons or trends (include chart_type)
- stat_card: for a single powerful number (include hero_number and hero_context)
- process_diagram: for workflows or step sequences
- comparison: for before/after or problem/solution contrasts (include left_panel and right_panel)

## Content Rules
- NEVER include individual provider names, NPIs, practice names, or any PII
- Only reference aggregate statistics
- Always attribute data: "Source: KairoLogic pipeline analysis of N providers"
- Make the proprietary data the star, as no competitor has this

Respond with valid JSON matching this exact structure:
{
  "headline": "...",
  "body_linkedin": "...",
  "body_blog": "...",
  "body_substack": "...",
  "graphic_brief": { "type": "...", "title": "...", "subtitle": "...", ...additional fields based on type }
}`;

export async function generateContent(
  topic: string,
  audience: string,
  intent: string,
  researchContext: ResearchContext,
  angle?: string,
): Promise<GeneratedContent> {
  const researchSummary = formatResearchForPrompt(researchContext);

  const userPrompt = `Generate content for all three channels (LinkedIn, blog, Substack) about the following:

**Topic:** ${topic}
**Target Audience:** ${audience}
**Content Intent:** ${intent}
${angle ? `**Specific Angle:** ${angle}` : ''}

## Research Context
${researchSummary}

## Pipeline Data Available
${formatPipelineData(researchContext)}

Generate the content now. Remember: valid JSON only, no markdown code fences.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: WRITER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => {
      if (b.type === 'text') return b.text;
      return '';
    })
    .join('');

  // Parse the JSON response, handling potential markdown fences
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  const parsed = JSON.parse(cleaned) as GeneratedContent;

  return parsed;
}

function formatResearchForPrompt(ctx: ResearchContext): string {
  if (!ctx.webResearch.length) return 'No external research available.';
  return ctx.webResearch.map((r) => `### Research: ${r.query}\n${r.findings}`).join('\n\n');
}

function formatPipelineData(ctx: ResearchContext): string {
  const parts: string[] = [];

  if (ctx.overviewStats && Object.keys(ctx.overviewStats).length > 0) {
    parts.push(`**Overview Stats:** ${JSON.stringify(ctx.overviewStats)}`);
  }

  for (const pq of ctx.pipelineData) {
    if (pq.data && pq.data.length > 0) {
      parts.push(`**${pq.queryName}:** ${JSON.stringify(pq.data.slice(0, 10))}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'Pipeline data not available for this topic.';
}
