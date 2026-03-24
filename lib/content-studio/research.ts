/**
 * Research Engine: combines external web research (Claude API + web search)
 * with internal pipeline intelligence for content generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { runPipelineQuery, getOverviewStats, type PipelineQueryName } from './pipeline-queries';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export interface ResearchContext {
  webResearch: { query: string; findings: string }[];
  pipelineData: { queryName: string; data: Record<string, unknown>[] | null }[];
  overviewStats: Record<string, number>;
  generatedAt: string;
}

const RESEARCH_SYSTEM_PROMPT = `You are a healthcare data intelligence researcher for KairoLogic, a provider data intelligence platform. Your job is to find current, relevant information to support thought leadership content.

Focus areas:
- Recent regulatory enforcement actions, state medical board news, CMS policy changes
- Industry statistics on credentialing timelines, provider data error rates, compliance costs
- Recent MGMA, NAMSS, or Becker's Healthcare articles providing context or supporting data
- State-specific compliance requirements and updates

Return your findings as a structured summary with specific facts, statistics, and source references. Be concise but thorough. Focus on facts that would make compelling content for healthcare practice managers and credentialing professionals.`;

export async function conductResearch(
  topic: string,
  audience: string,
  intent: string
): Promise<ResearchContext> {
  // Run web research and pipeline queries in parallel
  const [webResearch, pipelineData, overviewStats] = await Promise.all([
    conductWebResearch(topic, audience),
    gatherPipelineData(topic),
    getOverviewStats(),
  ]);

  return {
    webResearch,
    pipelineData,
    overviewStats,
    generatedAt: new Date().toISOString(),
  };
}

async function conductWebResearch(
  topic: string,
  audience: string
): Promise<{ query: string; findings: string }[]> {
  const queries = generateResearchQueries(topic, audience);
  const results: { query: string; findings: string }[] = [];

  for (const query of queries) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: RESEARCH_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Research the following topic and provide current, factual findings:\n\n"${query}"\n\nProvide 3-5 key findings with specific data points, dates, and sources where available.`,
          },
        ],
      });

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => {
          if (b.type === 'text') return b.text;
          return '';
        })
        .join('');
      results.push({ query, findings: text });
    } catch (err) {
      console.error(`Research query failed: ${query}`, err);
      results.push({ query, findings: `Research unavailable: ${(err as Error).message}` });
    }
  }

  return results;
}

function generateResearchQueries(topic: string, audience: string): string[] {
  const baseQueries = [
    `${topic} healthcare compliance 2025 2026 recent news`,
    `${topic} credentialing provider data regulations`,
  ];

  const audienceQueries: Record<string, string> = {
    practice_manager: `${topic} medical practice management impact cost savings`,
    credentialing: `${topic} credentialing verification accuracy NCQA standards`,
    compliance: `${topic} healthcare compliance audit CMS enforcement actions`,
    executive: `${topic} healthcare revenue impact ROI executive leadership`,
  };

  if (audienceQueries[audience]) {
    baseQueries.push(audienceQueries[audience]);
  }

  return baseQueries.slice(0, 3); // Max 3 research queries to control costs
}

async function gatherPipelineData(
  topic: string
): Promise<{ queryName: string; data: Record<string, unknown>[] | null }[]> {
  // Select relevant pipeline queries based on topic keywords
  const relevantQueries = selectRelevantQueries(topic);
  const results: { queryName: string; data: Record<string, unknown>[] | null }[] = [];

  for (const queryName of relevantQueries) {
    const { data } = await runPipelineQuery(queryName);
    results.push({ queryName, data });
  }

  return results;
}

function selectRelevantQueries(topic: string): PipelineQueryName[] {
  const lower = topic.toLowerCase();
  const queries: PipelineQueryName[] = [];

  if (lower.includes('mismatch') || lower.includes('data integrity') || lower.includes('accuracy')) {
    queries.push('mismatch_summary');
  }
  if (lower.includes('license') || lower.includes('credential')) {
    queries.push('license_status_distribution');
  }
  if (lower.includes('nppes') || lower.includes('npi') || lower.includes('update')) {
    queries.push('nppes_delta_trends');
  }
  if (lower.includes('scan') || lower.includes('website') || lower.includes('directory')) {
    queries.push('scan_results_breakdown');
  }
  if (lower.includes('provider') || lower.includes('coverage')) {
    queries.push('provider_coverage');
  }
  if (lower.includes('disciplin') || lower.includes('enforcement') || lower.includes('action')) {
    queries.push('disciplinary_summary');
  }

  // Always include at least one overview query
  if (queries.length === 0) {
    queries.push('provider_coverage', 'mismatch_summary');
  }

  return queries.slice(0, 3); // Max 3 pipeline queries
}
