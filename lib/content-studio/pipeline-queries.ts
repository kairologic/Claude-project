/**
 * Pre-approved Supabase queries for Content Studio graphics and research.
 * All queries return AGGREGATE data only — no PII or individual provider details.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export type PipelineQueryName =
  | 'mismatch_summary'
  | 'scan_results_breakdown'
  | 'license_status_distribution'
  | 'nppes_delta_trends'
  | 'npi_resolution_stats'
  | 'provider_coverage'
  | 'disciplinary_summary';

interface QueryParams {
  state?: string;
  dateFrom?: string;
  dateTo?: string;
}

const QUERIES: Record<PipelineQueryName, (p: QueryParams) => string> = {
  mismatch_summary: (p) => `
    SELECT state, mismatch_tier, COUNT(*)::int as count
    FROM practice_websites
    WHERE mismatch_count > 0
    ${p.state ? `AND state = '${p.state}'` : ''}
    GROUP BY state, mismatch_tier
    ORDER BY count DESC
    LIMIT 20
  `,

  scan_results_breakdown: (p) => `
    SELECT
      CASE
        WHEN scan_status = 'healthy' THEN 'Healthy'
        WHEN scan_status = 'error' THEN 'Error'
        WHEN scan_status = 'unreachable' THEN 'Unreachable'
        ELSE 'Unknown'
      END as status,
      COUNT(*)::int as count
    FROM practice_websites
    ${p.state ? `WHERE state = '${p.state}'` : ''}
    GROUP BY scan_status
    ORDER BY count DESC
  `,

  license_status_distribution: (p) => `
    SELECT
      license_status as status,
      COUNT(*)::int as count
    FROM provider_licenses
    ${p.state ? `WHERE state = '${p.state}'` : ''}
    GROUP BY license_status
    ORDER BY count DESC
  `,

  nppes_delta_trends: (p) => `
    SELECT
      DATE_TRUNC('week', detected_at)::date as week,
      event_type,
      COUNT(*)::int as count
    FROM nppes_delta_events
    WHERE detected_at >= COALESCE('${p.dateFrom || ''}', (NOW() - INTERVAL '90 days'))::timestamptz
    GROUP BY week, event_type
    ORDER BY week ASC
  `,

  npi_resolution_stats: () => `
    SELECT
      resolution_method as method,
      COUNT(*)::int as count
    FROM practice_providers
    WHERE npi IS NOT NULL
    GROUP BY resolution_method
    ORDER BY count DESC
  `,

  provider_coverage: (p) => `
    SELECT
      COUNT(*)::int as total_providers,
      COUNT(CASE WHEN website_url IS NOT NULL THEN 1 END)::int as with_urls,
      COUNT(CASE WHEN pecos_match THEN 1 END)::int as with_pecos,
      COUNT(CASE WHEN license_verified THEN 1 END)::int as with_licenses
    FROM practice_providers
    ${p.state ? `WHERE state = '${p.state}'` : ''}
  `,

  disciplinary_summary: (p) => `
    SELECT
      action_category as category,
      COUNT(*)::int as count
    FROM provider_licenses
    WHERE license_status = 'disciplinary'
    ${p.state ? `AND state = '${p.state}'` : ''}
    GROUP BY action_category
    ORDER BY count DESC
    LIMIT 10
  `,
};

export async function runPipelineQuery(
  queryName: PipelineQueryName,
  params: QueryParams = {},
): Promise<{ data: Record<string, unknown>[] | null; error: string | null }> {
  try {
    const supabase = createAdminSupabaseClient();
    const sql = QUERIES[queryName](params);
    const { data, error } = await supabase.rpc('execute_query', { query_text: sql });
    if (error) return { data: null, error: error.message };
    return { data: data as Record<string, unknown>[], error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Get rich data findings from the provider intelligence pipeline for content ideation.
 * Returns aggregate insights from mismatches, payer directories, scan results, etc.
 * All data is aggregate — no PII or individual provider details.
 */
export async function getDataFindings(): Promise<Record<string, unknown>> {
  const supabase = createAdminSupabaseClient();
  try {
    // Run all insight queries in parallel
    const [stateBreakdown, scanHealth, payerMismatches, topSpecialties, mismatchRate] =
      await Promise.all([
        // Top states by mismatch volume
        supabase.rpc('execute_query', {
          query_text: `
          SELECT state, COUNT(*)::int as practices, SUM(mismatch_count)::int as total_mismatches,
            ROUND(AVG(mismatch_count)::numeric, 1) as avg_mismatches_per_practice,
            SUM(provider_count)::int as providers_affected
          FROM practice_websites
          WHERE mismatch_count > 0 AND state IS NOT NULL
          GROUP BY state ORDER BY total_mismatches DESC LIMIT 10
        `,
        }),
        // Scan health overview
        supabase.rpc('execute_query', {
          query_text: `
          SELECT scan_status, COUNT(*)::int as count,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) as pct
          FROM practice_websites
          WHERE scan_status IS NOT NULL
          GROUP BY scan_status ORDER BY count DESC
        `,
        }),
        // Payer directory mismatch types
        supabase.rpc('execute_query', {
          query_text: `
          SELECT field_name, mismatch_type, priority, COUNT(*)::int as count
          FROM payer_directory_mismatches
          GROUP BY field_name, mismatch_type, priority
          ORDER BY count DESC LIMIT 10
        `,
        }),
        // Most common practice specialties with mismatches
        supabase.rpc('execute_query', {
          query_text: `
          SELECT unnest(practice_specialties) as specialty, COUNT(*)::int as count
          FROM practice_websites
          WHERE mismatch_count > 0 AND practice_specialties IS NOT NULL
          GROUP BY specialty ORDER BY count DESC LIMIT 10
        `,
        }),
        // Overall mismatch rate
        supabase.rpc('execute_query', {
          query_text: `
          SELECT
            COUNT(*)::int as total_practices,
            COUNT(CASE WHEN mismatch_count > 0 THEN 1 END)::int as with_mismatches,
            ROUND(100.0 * COUNT(CASE WHEN mismatch_count > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as mismatch_pct,
            SUM(mismatch_count)::int as total_mismatches,
            MAX(mismatch_count)::int as worst_mismatch_count
          FROM practice_websites
        `,
        }),
      ]);

    return {
      state_breakdown: stateBreakdown.data || [],
      scan_health: scanHealth.data || [],
      payer_mismatches: payerMismatches.data || [],
      top_specialties_with_issues: topSpecialties.data || [],
      mismatch_rate: (mismatchRate.data as Record<string, unknown>[])?.[0] || {},
    };
  } catch {
    return {};
  }
}

export async function getOverviewStats(): Promise<Record<string, number>> {
  const supabase = createAdminSupabaseClient();
  try {
    const { data } = await supabase.rpc('execute_query', {
      query_text: `
        SELECT
          (SELECT COUNT(*)::int FROM practice_providers) as total_providers,
          (SELECT COUNT(*)::int FROM practice_websites) as total_practices,
          (SELECT COUNT(*)::int FROM practice_websites WHERE mismatch_count > 0) as practices_with_mismatches,
          (SELECT COUNT(*)::int FROM nppes_delta_events WHERE detected_at >= NOW() - INTERVAL '7 days') as recent_delta_events
      `,
    });
    return (data as Record<string, number>[])?.[0] || {};
  } catch {
    return {};
  }
}
