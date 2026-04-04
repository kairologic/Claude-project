import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import ProviderOnboardingView from '@/components/dashboard/ProviderOnboardingView';

export default async function OnboardingPage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch existing onboarding workflows
  const { data: workflows } = await admin
    .from('workflow_instances')
    .select(
      'id, workflow_type, status, provider_name, provider_npi, finding_summary, priority, created_at, overdue_at',
    )
    .eq('practice_id', practiceId)
    .eq('workflow_type', 'onboarding')
    .order('created_at', { ascending: false });

  // Fetch current roster for duplicate checking
  const { data: roster } = await admin
    .from('practice_providers')
    .select('npi, provider_name, roster_status')
    .eq('practice_website_id', practiceId);

  return (
    <ProviderOnboardingView
      practiceId={practiceId}
      workflows={workflows || []}
      roster={roster || []}
    />
  );
}
