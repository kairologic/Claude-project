/**
 * app/practice/[id]/roster/page.tsx
 *
 * Provider roster — server component that fetches providers
 * from practice_providers and maps to their workflows.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import ProviderRosterView from '@/components/dashboard/ProviderRosterView';

export default async function RosterPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch providers for this practice
  const { data: providers } = await admin
    .from('practice_providers')
    .select('id, npi, provider_name, roster_status, active_mismatch_count, web_specialty, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, license_issue_type')
    .eq('practice_website_id', practiceId)
    .order('active_mismatch_count', { ascending: false, nullsFirst: false });

  // Build NPI → first workflow_id map (for click-through to detail)
  const uniqueNpis = [...new Set((providers || []).map(p => p.npi))];
  let workflowMap: Record<string, string> = {};

  if (uniqueNpis.length > 0) {
    const { data: workflows } = await admin
      .from('workflow_instances')
      .select('id, provider_npi')
      .eq('practice_id', practiceId)
      .in('provider_npi', uniqueNpis)
      .neq('status', 'resolved')
      .neq('status', 'cancelled')
      .order('priority', { ascending: false });

    // First workflow per NPI
    (workflows || []).forEach(wf => {
      if (wf.provider_npi && !workflowMap[wf.provider_npi]) {
        workflowMap[wf.provider_npi] = wf.id;
      }
    });
  }

  return (
    <ProviderRosterView
      providers={providers || []}
      practiceId={practiceId}
      workflowMap={workflowMap}
    />
  );
}
