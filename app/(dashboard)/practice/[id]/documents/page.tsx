/**
 * app/practice/[id]/documents/page.tsx
 *
 * Documents page — server component that fetches workflow artifacts
 * with workflow context for display.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import DocumentsView from '@/components/dashboard/DocumentsView';

export default async function DocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  const practiceId = params.id;
  const admin = createAdminSupabaseClient();

  // Fetch artifacts for this practice with workflow context
  const { data: artifacts } = await admin
    .from('workflow_artifacts')
    .select(`
      id, name, artifact_type, category, workflow_id, file_size_kb, created_at,
      workflow_instances!inner (
        workflow_type,
        provider_name
      )
    `)
    .eq('practice_id', practiceId)
    .order('created_at', { ascending: false });

  const documents = (artifacts || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    artifact_type: a.artifact_type,
    category: a.category,
    workflow_id: a.workflow_id,
    workflow_type: a.workflow_instances?.workflow_type || null,
    provider_name: a.workflow_instances?.provider_name || null,
    file_size_kb: a.file_size_kb,
    created_at: a.created_at,
  }));

  return (
    <DocumentsView
      documents={documents}
      practiceId={practiceId}
    />
  );
}
