/**
 * app/practice/[id]/roster/page.tsx
 *
 * Provider roster — v2 server component that fetches from v_provider_health view.
 * Now uses provider-centric data with health scores.
 * Includes onboarding card for practices that haven't confirmed their roster.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { safeQuery } from '@/lib/supabase/safe-query';
import ProviderRosterView from '@/components/dashboard/ProviderRosterView';
import RosterOnboardingWrapper from '@/components/dashboard/RosterOnboardingWrapper';

export default async function RosterPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Parallel queries: providers + health data + onboarding status
  const [providersResult, healthResult, practiceResult] = await Promise.all([
    safeQuery(
      admin
        .from('practice_providers')
        .select('id, npi, provider_name, roster_status, active_mismatch_count, web_specialty, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, license_issue_type, association_source')
        .eq('practice_website_id', practiceId)
        .neq('roster_status', 'onboarding')
        .order('active_mismatch_count', { ascending: false, nullsFirst: false }),
      []
    ),
    safeQuery(
      admin
        .from('v_provider_health')
        .select('npi, health_score, open_issues, specialty')
        .eq('practice_website_id', practiceId),
      []
    ),
    safeQuery(
      admin
        .from('practice_websites')
        .select('onboarding_confirmed')
        .eq('id', practiceId)
        .single(),
      { onboarding_confirmed: false }
    ),
  ]);

  const providers = providersResult.data;
  const healthData = healthResult.data;
  const onboardingConfirmed = practiceResult.data?.onboarding_confirmed ?? false;

  const healthMap: Record<string, { health_score: number; open_issues: number; specialty: string | null }> = {};
  (healthData || []).forEach(h => {
    healthMap[h.npi] = { health_score: h.health_score, open_issues: h.open_issues, specialty: h.specialty };
  });

  // workflowMap is no longer needed for click-through (we use ProviderDetailPanel now)
  // but keep it for backward compatibility with any remaining references
  const workflowMap: Record<string, string> = {};

  return (
    <>
      <RosterOnboardingWrapper
        practiceId={practiceId}
        providers={(providers || []).map(p => ({
          npi: p.npi,
          provider_name: p.provider_name,
          web_specialty: p.web_specialty,
          roster_status: p.roster_status,
          association_source: p.association_source || null,
        }))}
        onboardingConfirmed={onboardingConfirmed}
      />
      <ProviderRosterView
        providers={providers || []}
        practiceId={practiceId}
        workflowMap={workflowMap}
        healthMap={healthMap}
      />
    </>
  );
}
