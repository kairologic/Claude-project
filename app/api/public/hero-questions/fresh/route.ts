import { NextResponse } from 'next/server';

interface GeneratedQuestion {
  question_text: string;
  category: string;
  dataset_key: string;
}

interface FreshQuestionsResponse {
  questions: GeneratedQuestion[];
  generated: true;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

/**
 * GET /api/public/hero-questions/fresh
 * Generates fresh questions using Claude Haiku based on current data coverage
 *
 * Process:
 * 1. Fetch dataset_coverage from Supabase
 * 2. Fetch current aggregate stats
 * 3. Call Claude Haiku with context about datasets and stats
 * 4. Parse and return generated questions
 */
export async function GET(): Promise<
  NextResponse<FreshQuestionsResponse | { error: string }>
> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Fresh Questions] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('[Fresh Questions] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 },
      );
    }

    // Step 1: Fetch dataset coverage (surfaceable datasets only)
    const datasetCoverage = await fetchDatasetCoverage();

    // Step 2: Fetch current aggregate stats
    const stats = await fetchAggregateStats();

    // Step 3: Generate prompt and call Claude
    const prompt = buildPrompt(datasetCoverage, stats);
    const generatedQuestions = await callClaudeHaiku(prompt);

    // Step 4: Validate and return parsed questions
    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      console.warn('[Fresh Questions] Claude returned no questions');
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        questions: generatedQuestions,
        generated: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error: any) {
    console.error(
      '[Fresh Questions] Error:',
      error?.message || error,
    );
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 },
    );
  }
}

/**
 * Fetch dataset coverage from Supabase (is_surfaceable = true)
 */
async function fetchDatasetCoverage(): Promise<
  Array<{ name: string; coverage_count: number; description: string }>
> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/dataset_coverage?` +
      `is_surfaceable.eq.true&select=name,coverage_count,description`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      console.warn('[Fresh Questions] Failed to fetch dataset coverage');
      return [];
    }

    return await res.json();
  } catch (error: any) {
    console.error(
      '[Fresh Questions] Error fetching dataset coverage:',
      error?.message,
    );
    return [];
  }
}

/**
 * Fetch current aggregate stats (reuse hero-stats logic inline)
 */
async function fetchAggregateStats(): Promise<Record<string, number>> {
  try {
    const stats: Record<string, number> = {};

    // Fetch key stats in parallel
    stats.total_providers = await getCount('providers', 'npi');
    stats.tx_providers = await getCount(
      'practice_websites',
      'id',
      'state.eq.TX&and(last_scan_at.not.is.null)',
    );
    stats.oig_exclusions = await getCount(
      'provider_exclusions',
      'id',
      'rein_date.is.null',
    );
    stats.ai_tools = await getCount('ai_tools_detected', 'id');
    stats.payer_directories = await getCount('payer_directory_snapshots', 'id');
    stats.websites = await getCount('practice_websites', 'id', 'url.not.is.null');

    return stats;
  } catch (error: any) {
    console.error(
      '[Fresh Questions] Error fetching aggregate stats:',
      error?.message,
    );
    return {};
  }
}

/**
 * Get count of records from a table via Supabase REST API
 */
async function getCount(
  table: string,
  column: string = 'id',
  filters?: string,
): Promise<number> {
  try {
    const path = filters
      ? `${table}?select=${column}&${filters}`
      : `${table}?select=${column}`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
        'Content-Range': '0-0/*',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return 0;
    }

    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (error: any) {
    console.error(
      '[Fresh Questions] Error getting count for ${table}:',
      error?.message,
    );
    return 0;
  }
}

/**
 * Build prompt for Claude with dataset and stats context
 */
function buildPrompt(
  datasets: Array<{ name: string; coverage_count: number; description: string }>,
  stats: Record<string, number>,
): string {
  const datasetList = datasets
    .map(
      (d) =>
        `- ${d.name}: ${d.coverage_count} records available. ${d.description}`,
    )
    .join('\n');

  const statsText = Object.entries(stats)
    .map(([key, value]) => `- ${key}: ${value.toLocaleString()}`)
    .join('\n');

  return `You are generating compelling questions for KairoLogic's homepage — a healthcare provider data intelligence platform focused on TX healthcare compliance.

Given these available TX healthcare datasets with their coverage:
${datasetList}

Current aggregate stats:
${statsText}

Generate 4 specific, provocative questions that a healthcare compliance officer, practice manager, or CVO would want answered. Each question should be:
1. Answerable from the data above
2. Specific and use real numbers where possible
3. Varied across different categories (risk, compliance, operational, analytics)
4. Created to spark curiosity and demonstrate data depth

Return ONLY a valid JSON array with no additional text. Each object must have exactly these fields:
[
  {
    "question_text": "string (specific, compelling question)",
    "category": "string (risk|compliance|operational|analytics)",
    "dataset_key": "string (the primary dataset this question uses)"
  }
]`;
}

/**
 * Call Claude Haiku API and parse the response
 */
async function callClaudeHaiku(
  prompt: string,
): Promise<GeneratedQuestion[]> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Fresh Questions] Claude API error: ${response.status} ${errorText}`,
      );
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: any = await response.json();
    const textContent = data.content?.[0];

    if (!textContent || textContent.type !== 'text') {
      throw new Error('Unexpected Claude response format');
    }

    // Parse JSON from response (may contain explanatory text)
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[Fresh Questions] No JSON array found in Claude response');
      throw new Error('No JSON array in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Claude response is not an array');
    }

    // Validate each question has required fields
    const validated = parsed.map((q: any) => {
      if (!q.question_text || !q.category || !q.dataset_key) {
        throw new Error('Question missing required fields');
      }
      return {
        question_text: String(q.question_text),
        category: String(q.category),
        dataset_key: String(q.dataset_key),
      };
    });

    return validated;
  } catch (error: any) {
    console.error(
      '[Fresh Questions] Error calling Claude:',
      error?.message || error,
    );
    throw error;
  }
}
