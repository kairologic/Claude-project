import { NextResponse } from 'next/server';

interface HeroQuestion {
  id: string;
  question_text: string;
  category: string;
  dataset_key: string;
}

interface HeroQuestionsResponse {
  questions: HeroQuestion[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/public/hero-questions
 * Returns 6 random pre-generated questions from hero_questions table
 * Increments impression_count for returned questions (fire-and-forget)
 */
export async function GET(): Promise<
  NextResponse<HeroQuestionsResponse | { error: string }>
> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[Hero Questions] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    // Fetch all active questions, then shuffle and take 6
    // (Supabase REST API doesn't support ORDER BY random())
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/hero_questions?` +
      `is_active=eq.true&expires_at=gt.${new Date().toISOString()}&` +
      `select=id,question_text,category,dataset_key`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      console.error(
        `[Hero Questions] Supabase error: ${res.status} ${res.statusText}`,
      );
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    const allQuestions: HeroQuestion[] = await res.json();

    // Fisher-Yates shuffle, then take first 6
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }
    const questions = allQuestions.slice(0, 6);

    // Fire-and-forget: increment impression_count for each returned question
    if (questions.length > 0) {
      const questionIds = questions.map((q) => q.id);
      incrementImpressions(questionIds).catch((err) => {
        console.warn('[Hero Questions] Failed to increment impressions:', err);
      });
    }

    return NextResponse.json(
      { questions },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (error: any) {
    console.error(
      '[Hero Questions] Error:',
      error?.message || error,
    );
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 },
    );
  }
}

/**
 * Increment impression_count for a list of question IDs
 * Fire-and-forget, does not block the response
 */
async function incrementImpressions(questionIds: string[]): Promise<void> {
  try {
    // Increment impression_count for each returned question via individual PATCHes
    // Using service role to bypass RLS (anon only has SELECT)
    await Promise.allSettled(
      questionIds.map((id) =>
        fetch(
          `${SUPABASE_URL}/rest/v1/rpc/increment_hero_impressions`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qid: id }),
          },
        ),
      ),
    );
  } catch (error: any) {
    console.warn(
      '[Hero Questions] Failed to increment impressions:',
      error?.message,
    );
  }
}
