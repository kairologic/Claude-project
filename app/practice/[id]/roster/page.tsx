/**
 * app/practice/[id]/roster/page.tsx
 *
 * Provider roster — v2 server component that fetches from v_provider_health view.
 * Now uses provider-centric data with health scores.
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

  // Fetch from practice_providers (source of truth for mismatch flags)
  const { data: providers } = await admin
    .from('practice_providers')
    .select('id, npi, provider_name, roster_status, active_mismatch_count, web_specialty, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, license_issue_type')
    .eq('practice_website_id', practiceId)
    .neq('roster_status', 'onboarding')
    .order('active_mismatch_count', { ascending: false, nullsFirst: false });

  // Fetch health scores from v_provider_health
  const { data: healthData } = await admin
    .from('v_provider_health')
    .select('npi, health_score, open_issues, specialty')
    .eq('practice_website_id', practiceId);

  const healthMap: Record<string, { health_score: number; open_issues: number; specialty: string | null }> = {};
  (healthData || []).forEach(h => {
    healthMap[h.npi] = { health_score: h.health_score, open_issues: h.open_issues, specialty: h.specialty };
  });

  // workflowMap is no longer needed for click-through (we use ProviderDetailPanel now)
  // but keep it for backward compatibility with any remaining references
  const workflowMap: Record<string, string> = {};

  return (
    <ProviderRosterView
      providers={providers || []}
      practiceId={practiceId}
      workflowMap={workflowMap}
      healthMap={healthMap}
    />
  );
}
