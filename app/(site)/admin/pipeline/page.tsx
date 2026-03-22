/**
 * app/admin/pipeline/page.tsx
 *
 * Server component for Pipeline Health Admin Dashboard (Section 6).
 * Fetches pipeline statistics from Supabase and renders the dashboard.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import PipelineHealthDashboard from '@/components/admin/PipelineHealthDashboard';

export const dynamic = 'force-dynamic'; // Always fresh data

export default async function PipelinePage() {
  const admin = createAdminSupabaseClient();

  // List of all major pipeline tables
  const tables = [
    'providers',
    'provider_pecos',
    'provider_licenses',
    'practice_websites',
    'practice_providers',
    'nppes_delta_events',
    'workflow_instances',
    'workflow_tasks',
    'alerts',
    'payer_directory_snapshots',
    'payer_directory_mismatches',
  ];

  // Fetch row counts for each table
  const counts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const { count } = await admin
        .from(table)
        .select('*', { count: 'exact', head: true });
      counts[table] = count || 0;
    } catch (error) {
      console.error(`Failed to count ${table}:`, error);
      counts[table] = 0;
    }
  }

  // Fetch data quality stats
  let nullCityCount = 0;
  try {
    const { count } = await admin
      .from('practice_websites')
      .select('*', { count: 'exact', head: true })
      .is('city', null);
    nullCityCount = count || 0;
  } catch (error) {
    console.error('Failed to fetch null city count:', error);
  }

  let activeMismatchCount = 0;
  try {
    const { count } = await admin
      .from('payer_directory_mismatches')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null);
    activeMismatchCount = count || 0;
  } catch (error) {
    console.error('Failed to fetch active mismatch count:', error);
  }

  // Fetch workflow stats (RPC may not exist, handle gracefully)
  let workflowStats = null;
  try {
    const { data } = await admin.rpc('get_workflow_kpis_all');
    workflowStats = data;
  } catch (error) {
    console.error('RPC get_workflow_kpis_all not available:', error);
  }

  return (
    <PipelineHealthDashboard
      tableCounts={counts}
      nullCityCount={nullCityCount}
      activeMismatchCount={activeMismatchCount}
      workflowStats={workflowStats}
    />
  );
}
