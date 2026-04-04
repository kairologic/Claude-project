/**
 * app/practice/[id]/release/page.tsx
 *
 * Provider Release workflow page.
 * Server component that fetches active release workflows and provider roster.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import ProviderReleaseView from '@/components/dashboard/ProviderReleaseView';

export default async function ReleasePage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch existing release workflows
  const { data: workflows } = await admin
    .from('workflow_instances')
    .select(
      'id, workflow_type, status, provider_name, provider_npi, finding_summary, finding_details, priority, created_at, overdue_at',
    )
    .eq('practice_id', practiceId)
    .eq('workflow_type', 'release')
    .order('created_at', { ascending: false });

  // Fetch active providers for the departing selection dropdown
  const { data: roster } = await admin
    .from('practice_providers')
    .select('npi, provider_name, roster_status')
    .eq('practice_website_id', practiceId)
    .in('roster_status', ['active', 'onboarding']);

  return (
    <ProviderReleaseView
      practiceId={practiceId}
      workflows={workflows || []}
      activeProviders={roster || []}
    />
  );
}
