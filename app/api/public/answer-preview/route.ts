import { NextRequest, NextResponse } from 'next/server';

interface AnswerPreviewRequest {
  question: string;
  visitor_fingerprint?: string;
}

interface StatHighlight {
  value: string;
  label: string;
}

interface GatedResponse {
  gated: true;
  message: string;
}

interface AnswerResponse {
  gated: false;
  answer: {
    summary: string;
    stat_highlight?: StatHighlight;
    preview_rows?: unknown[];
  };
  questions_remaining: number;
}

type AnswerPreviewResponse = GatedResponse | AnswerResponse;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

/**
 * POST /api/public/answer-preview
 * Returns a teaser answer to a question with visitor rate limiting
 *
 * Process:
 * 1. Check visitor rate limit (3 free questions per day)
 * 2. If under limit, increment counter
 * 3. Fetch current stats
 * 4. Call Claude Haiku with stats context
 * 5. Return parsed answer with gating info
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<AnswerPreviewResponse | { error: string }>> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Answer Preview] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('[Answer Preview] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 },
      );
    }

    const body: AnswerPreviewRequest = await request.json();
    const { question, visitor_fingerprint } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Missing required field: question' },
        { status: 400 },
      );
    }

    // Generate default fingerprint if not provided (e.g., from IP + user agent hash)
    const fingerprint =
      visitor_fingerprint || generateDefaultFingerprint(request);

    // Step 1: Check rate limit
    const rateLimit = await checkRateLimit(fingerprint);
    if (rateLimit.exceeded) {
      return NextResponse.json({
        gated: true,
        message:
          "You've used your 3 free questions today. Sign up free for unlimited access.",
      } as GatedResponse);
    }

    // Step 2: Increment counter
    try {
      await incrementQuestionCount(fingerprint);
    } catch (error) {
      console.warn('[Answer Preview] Failed to increment counter:', error);
      // Continue anyway - non-critical
    }

    // Step 3: Fetch current stats
    const stats = await fetchAggregateStats();

    // Step 4: Call Claude with context
    const prompt = buildAnswerPrompt(question, stats);
    const answerData = await callClaudeHaiku(prompt);

    // Step 5: Return answer with remaining quota
    const questionsUsed = rateLimit.questions_used + 1;
    const questionsRemaining = Math.max(0, 3 - questionsUsed);

    return NextResponse.json({
      gated: false,
      answer: answerData,
      questions_remaining: questionsRemaining,
    } as AnswerResponse);
  } catch (error: any) {
    console.error(
      '[Answer Preview] Error:',
      error?.message || error,
    );
    return NextResponse.json(
      { error: 'Failed to generate answer' },
      { status: 500 },
    );
  }
}

/**
 * Generate default fingerprint from request IP and user agent
 */
function generateDefaultFingerprint(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-client-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Simple hash for fingerprinting (not cryptographically secure, just for tracking)
  const combined = `${ip}::${userAgent}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `visitor_${Math.abs(hash).toString(36)}`;
}

/**
 * Check visitor rate limit: 3 free questions per day
 */
async function checkRateLimit(
  visitor_fingerprint: string,
): Promise<{ exceeded: boolean; questions_used: number }> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/visitor_question_limits?` +
      `visitor_fingerprint.eq.${encodeURIComponent(visitor_fingerprint)}&` +
      `and(date.eq.${today})&select=questions_used`,
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
      console.warn('[Answer Preview] Failed to check rate limit');
      return { exceeded: false, questions_used: 0 };
    }

    const data: any[] = await res.json();
    const record = data[0];
    const questions_used = record?.questions_used || 0;

    return {
      exceeded: questions_used >= 3,
      questions_used,
    };
  } catch (error: any) {
    console.warn(
      '[Answer Preview] Error checking rate limit:',
      error?.message,
    );
    // Default to not exceeded (fail open)
    return { exceeded: false, questions_used: 0 };
  }
}

/**
 * Increment question count for a visitor
 */
async function incrementQuestionCount(visitor_fingerprint: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Upsert: try to update existing record, if none exists, insert new
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/visitor_question_limits`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          visitor_fingerprint,
          date: today,
          questions_used: 1, // Will be incremented server-side via trigger or RPC
        }),
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      console.warn(
        '[Answer Preview] Failed to increment question count:',
        res.status,
      );
    }
  } catch (error: any) {
    console.error(
      '[Answer Preview] Error incrementing counter:',
      error?.message,
    );
    // Non-critical - allow request to proceed
  }
}

/**
 * Fetch current aggregate stats
 */
async function fetchAggregateStats(): Promise<Record<string, number>> {
  try {
    const stats: Record<string, number> = {};

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
      '[Answer Preview] Error fetching stats:',
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
      '[Answer Preview] Error getting count for ${table}:',
      error?.message,
    );
    return 0;
  }
}

/**
 * Build prompt for Claude with current stats context
 */
function buildAnswerPrompt(question: string, stats: Record<string, number>): string {
  const statsText = Object.entries(stats)
    .map(([key, value]) => `- ${key}: ${value.toLocaleString()}`)
    .join('\n');

  return `You are KairoLogic AI answering a question about TX healthcare provider data. You have access to these real-time stats:

${statsText}

Answer this question with a brief, compelling teaser (2-3 sentences max). Include one specific number or stat from the list above. End with a hint that more detailed data is available. Do NOT fabricate data — only use the stats provided above.

Question: ${question}

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "summary": "string (2-3 sentence teaser answer with one real stat)",
  "stat_highlight": {
    "value": "string (the specific number/stat you mentioned)",
    "label": "string (human-readable label for that stat)"
  },
  "preview_rows": []
}`;
}

/**
 * Call Claude Haiku and parse answer
 */
async function callClaudeHaiku(prompt: string): Promise<{
  summary: string;
  stat_highlight?: StatHighlight;
  preview_rows?: unknown[];
}> {
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
        `[Answer Preview] Claude API error: ${response.status} ${errorText}`,
      );
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: any = await response.json();
    const textContent = data.content?.[0];

    if (!textContent || textContent.type !== 'text') {
      throw new Error('Unexpected Claude response format');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Answer Preview] No JSON found in Claude response');
      throw new Error('No JSON in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.summary) {
      throw new Error('Missing required field: summary');
    }

    return {
      summary: String(parsed.summary),
      stat_highlight: parsed.stat_highlight || undefined,
      preview_rows: parsed.preview_rows || undefined,
    };
  } catch (error: any) {
    console.error(
      '[Answer Preview] Error calling Claude:',
      error?.message || error,
    );
    throw error;
  }
}
