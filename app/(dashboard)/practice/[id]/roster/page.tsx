/**
 * app/practice/[id]/roster/page.tsx
 *
 * Provider roster — v2 server component that fetches from v_provider_health view.
 * Now uses provider-centric data with health scores.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { safeQuery } from '@/lib/supabase/safe-query';
import ProviderRosterView from '@/components/dashboard/ProviderRosterView';

export default async function RosterPage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Parallel queries: providers + health data + org plan info
  const [providersResult, healthResult, practiceResult] = await Promise.all([
    safeQuery(
      admin
        .from('practice_providers')
        .select(
          'id, npi, provider_name, roster_status, active_mismatch_count, web_specialty, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, license_issue_type',
        )
        .eq('practice_website_id', practiceId)
        .eq('roster_status', 'active')
        .order('active_mismatch_count', { ascending: false, nullsFirst: false }),
      [],
    ),
    safeQuery(
      admin
        .from('v_provider_health')
        .select('npi, health_score, open_issues, specialty')
        .eq('practice_website_id', practiceId),
      [],
    ),
    safeQuery(
      admin.from('practice_websites').select('organization_id').eq('id', practiceId).limit(1),
      [],
    ),
  ]);

  // Determine provider cap from org plan
  let providerLimit = 0; // 0 = unlimited
  const orgId = practiceResult.data?.[0]?.organization_id;
  if (orgId) {
    const orgResult = await safeQuery(
      admin.from('organizations').select('plan_tier, max_providers').eq('id', orgId).limit(1),
      [],
    );
    const org = orgResult.data?.[0];
    if (org?.plan_tier === 'free' || org?.plan_tier === 'expired') {
      providerLimit = org.max_providers || 5;
    }
  }

  const providers = providersResult.data;
  const healthData = healthResult.data;

  const healthMap: Record<
    string,
    { health_score: number; open_issues: number; specialty: string | null }
  > = {};
  (healthData || []).forEach((h) => {
    healthMap[h.npi] = {
      health_score: h.health_score,
      open_issues: h.open_issues,
      specialty: h.specialty,
    };
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
      providerLimit={providerLimit}
    />
  );
}
