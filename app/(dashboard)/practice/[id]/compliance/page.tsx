/**
 * app/practice/[id]/compliance/page.tsx
 *
 * Compliance Remediation page for state regulatory compliance workflows.
 * Displays compliance findings for SB 1188, HB 149, AB 3030.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import ComplianceView from '@/components/dashboard/ComplianceView';

export default async function CompliancePage({ params }: { params: { id: string } }) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  const { data: workflows } = await admin
    .from('workflow_instances')
    .select(
      'id, workflow_type, status, provider_name, provider_npi, finding_summary, finding_details, priority, created_at, overdue_at',
    )
    .eq('practice_id', practiceId)
    .eq('workflow_type', 'compliance')
    .order('priority', { ascending: true });

  return <ComplianceView practiceId={practiceId} workflows={workflows || []} />;
}
