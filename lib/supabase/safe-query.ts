/**
 * lib/supabase/safe-query.ts
 *
 * Safe wrapper for Supabase server-side queries.
 * Catches errors and returns typed fallback values instead of crashing.
 */

import type { PostgrestError } from '@supabase/supabase-js';

interface SafeQueryResult<T> {
  data: T;
  error: PostgrestError | null;
  ok: boolean;
}

/**
 * Wraps a Supabase query with error handling.
 * Returns the fallback value if the query fails instead of throwing.
 *
 * Usage:
 *   const { data, ok } = await safeQuery(
 *     supabase.from('workflows').select('*').eq('practice_id', id),
 *     [] // fallback
 *   );
 */
export async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallback: T,
): Promise<SafeQueryResult<T>> {
  try {
    const result = await query;
    if (result.error) {
      console.error('[safeQuery] Query error:', result.error.message);
      return { data: fallback, error: result.error, ok: false };
    }
    return { data: result.data ?? fallback, error: null, ok: true };
  } catch (err) {
    console.error('[safeQuery] Unexpected error:', err);
    return {
      data: fallback,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: '',
        hint: '',
        code: 'UNEXPECTED',
      } as PostgrestError,
      ok: false,
    };
  }
}

/**
 * Wraps a Supabase .single() query.
 * Returns null (or custom fallback) if not found or error.
 */
export async function safeQuerySingle<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallback: T | null = null,
): Promise<SafeQueryResult<T | null>> {
  try {
    const result = await query;
    if (result.error) {
      // PGRST116 = "not found" for .single() — not a real error
      if (result.error.code === 'PGRST116') {
        return { data: fallback, error: null, ok: true };
      }
      console.error('[safeQuerySingle] Query error:', result.error.message);
      return { data: fallback, error: result.error, ok: false };
    }
    return { data: result.data ?? fallback, error: null, ok: true };
  } catch (err) {
    console.error('[safeQuerySingle] Unexpected error:', err);
    return {
      data: fallback,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: '',
        hint: '',
        code: 'UNEXPECTED',
      } as PostgrestError,
      ok: false,
    };
  }
}

/**
 * Runs multiple queries in parallel with individual error handling.
 * Each query that fails returns its fallback instead of failing the batch.
 */
export async function safeQueryAll<T extends readonly unknown[]>(
  queries: { [K in keyof T]: { query: PromiseLike<{ data: T[K] | null; error: PostgrestError | null }>; fallback: T[K] } },
): Promise<{ [K in keyof T]: SafeQueryResult<T[K]> }> {
  const results = await Promise.all(
    queries.map(({ query, fallback }) => safeQuery(query, fallback)),
  );
  return results as { [K in keyof T]: SafeQueryResult<T[K]> };
}
