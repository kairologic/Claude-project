import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

interface DatasetCoverage {
  id: string;
  dataset_name: string;
  provider_count: number;
  is_surfaceable: boolean;
}

interface HeroQuestion {
  question_text: string;
  dataset_id?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MarketingSnippet {
  snippet_text: string;
  stat_value: string;
  stat_label: string;
  question_text: string;
  landing_slug: string;
}

interface HeroStats {
  total_providers: number;
  total_exclusions: number;
  states_covered: number;
  specialties_indexed: number;
}

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseRpc(functionName: string, args: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase RPC ${functionName}: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabasePost(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase POST ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseUpdate(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function callHaiku(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron auth
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Refresh dataset coverage
    console.log('Refreshing dataset coverage...');
    await supabaseRpc('refresh_dataset_coverage');

    // 2. Fetch surfaceable dataset_coverage rows
    console.log('Fetching surfaceable datasets...');
    const datasets: DatasetCoverage[] = await supabaseGet(
      'dataset_coverage?is_surfaceable=eq.true&select=id,dataset_name,provider_count'
    );

    if (!datasets || datasets.length === 0) {
      return NextResponse.json(
        { error: 'No surfaceable datasets found' },
        { status: 400 }
      );
    }

    // 3. Fetch hero stats
    console.log('Fetching hero stats...');
    const statsResponse: HeroStats[] = await supabaseGet(
      'hero_stats?select=total_providers,total_exclusions,states_covered,specialties_indexed&limit=1'
    );
    const stats = statsResponse?.[0] || {
      total_providers: 0,
      total_exclusions: 0,
      states_covered: 0,
      specialties_indexed: 0,
    };

    // 4. Generate hero questions
    console.log('Generating hero questions via Claude...');
    const datasetsList = datasets
      .map((d) => `- ${d.dataset_name} (${d.provider_count} providers)`)
      .join('\n');

    const questionsPrompt = `You are a data insights expert. Generate 20 compelling questions about Texas healthcare provider data. These questions should intrigue users and showcase data insights. Base questions on these datasets:

${datasetsList}

Current dataset stats:
- Total Providers: ${stats.total_providers}
- Total Exclusions: ${stats.total_exclusions}
- States Covered: ${stats.states_covered}
- Specialties Indexed: ${stats.specialties_indexed}

Return ONLY a valid JSON array of objects with this structure:
[
  {
    "question_text": "string - compelling question",
    "difficulty": "easy|medium|hard",
    "dataset_id": "uuid or null"
  },
  ...
]

Make questions specific to healthcare provider intelligence, licensing, credentials, and market analysis. Vary difficulty levels.`;

    const questionsResponse = await callHaiku(questionsPrompt);
    const questionsJson = JSON.parse(questionsResponse);
    const questions: HeroQuestion[] = questionsJson.slice(0, 20);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Failed to parse questions from Claude');
    }

    // 5. Deactivate old questions
    console.log('Deactivating old questions...');
    await supabaseUpdate('hero_questions', {
      is_active: false,
    });

    // 6. Insert new questions
    console.log('Inserting new questions...');
    const questionsToInsert = questions.map((q) => ({
      question_text: q.question_text,
      difficulty: q.difficulty,
      dataset_id: q.dataset_id,
      is_active: true,
      click_count: 0,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

    const insertedQuestions = await supabasePost('hero_questions', questionsToInsert);

    // 7. Generate marketing snippets
    console.log('Generating marketing snippets via Claude...');
    const snippetsPrompt = `You are a healthcare data marketing expert. Generate 3 LinkedIn-ready data insights about Texas healthcare providers. Each insight should be compelling, data-driven, and actionable.

Available datasets:
${datasetsList}

Current stats:
- Total Providers: ${stats.total_providers}
- Total Exclusions: ${stats.total_exclusions}
- States Covered: ${stats.states_covered}
- Specialties Indexed: ${stats.specialties_indexed}

Return ONLY a valid JSON array of objects with this structure:
[
  {
    "snippet_text": "LinkedIn-ready short insight (max 280 chars)",
    "stat_value": "numeric value to highlight",
    "stat_label": "label for the stat",
    "question_text": "deeper question this snippet raises",
    "landing_slug": "suggested slug like /explore/specialties or /explore/exclusions"
  },
  ...
]

Make each snippet shareable, data-backed, and relevant to healthcare provider market intelligence.`;

    const snippetsResponse = await callHaiku(snippetsPrompt);
    const snippetsJson = JSON.parse(snippetsResponse);
    const snippets: MarketingSnippet[] = snippetsJson.slice(0, 3);

    if (!Array.isArray(snippets) || snippets.length === 0) {
      throw new Error('Failed to parse snippets from Claude');
    }

    // 8. Insert marketing snippets
    console.log('Inserting marketing snippets...');
    const snippetsToInsert = snippets.map((s) => ({
      snippet_text: s.snippet_text,
      stat_value: s.stat_value,
      stat_label: s.stat_label,
      question_text: s.question_text,
      landing_slug: s.landing_slug,
      is_active: true,
      created_at: new Date().toISOString(),
    }));

    const insertedSnippets = await supabasePost('marketing_snippets', snippetsToInsert);

    // 9. Return summary
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      questionsGenerated: insertedQuestions?.length || 0,
      snippetsGenerated: insertedSnippets?.length || 0,
      datasetsUsed: datasets.length,
      stats,
    };

    console.log('Cron job complete:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Cron job failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
