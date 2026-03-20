/**
 * app/api/workflows/[id]/generate-form/route.ts
 *
 * POST: Generate a pre-filled NPPES correction report PDF.
 *
 * Called from WorkflowDetailPanel when the practice manager clicks
 * "Download PDF" on the download_form task (step 2).
 *
 * Auth: requires authenticated user with access to the practice.
 * Returns: application/pdf blob.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers';
import { generateNPPESForm } from '@/lib/workflows/generate-nppes-form';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const workflowId = params.id;

    // 1. Auth check
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the workflow instance
    const { data: workflow, error: wfErr } = await supabase
      .from('workflow_instances')
      .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, approved_value, approved_at, practice_id')
      .eq('id', workflowId)
      .single();

    if (wfErr || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // 3. Verify user has access to this practice
    const { data: practiceUser } = await supabase
      .from('practice_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('practice_id', workflow.practice_id)
      .single();

    if (!practiceUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Verify the workflow has been approved
    if (!workflow.approved_value) {
      return NextResponse.json({ error: 'Workflow not yet approved' }, { status: 400 });
    }

    // 5. Fetch provider record for full context
    const { data: provider } = await supabase
      .from('providers')
      .select('first_name, last_name, address_line_1, address_line_2, city, state, zip_code, phone, primary_taxonomy_code, taxonomy_desc')
      .eq('npi', workflow.provider_npi)
      .single();

    // 6. Fetch practice name
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('name')
      .eq('id', workflow.practice_id)
      .single();

    // 7. Determine approved source from review_approve task metadata
    const { data: reviewTask } = await supabase
      .from('workflow_tasks')
      .select('metadata')
      .eq('workflow_id', workflowId)
      .eq('task_type', 'review_approve')
      .single();

    const approvedSource = reviewTask?.metadata?.approved_source || 'custom';

    // 8. Generate PDF
    const pdfBytes = await generateNPPESForm({
      workflowId: workflow.id,
      providerName: workflow.provider_name || 'Unknown Provider',
      providerNpi: workflow.provider_npi || '',
      practiceName: practice?.name || 'Unknown Practice',
      field: workflow.finding_details?.field || 'unknown',
      websiteValue: workflow.finding_details?.website_value || '',
      nppesValue: workflow.finding_details?.nppes_value || '',
      approvedValue: workflow.approved_value,
      approvedSource,
      providerRecord: provider || undefined,
      generatedAt: new Date().toISOString(),
    });

    // 9. Store artifact reference (if workflow_artifacts table exists)
    try {
      await supabase.from('workflow_artifacts').insert({
        workflow_id: workflowId,
        artifact_type: 'nppes_correction_form',
        file_name: `NPPES_Update_${workflow.provider_name?.replace(/\s+/g, '_')}_${workflow.finding_details?.field}.pdf`,
        mime_type: 'application/pdf',
        file_size: pdfBytes.length,
        generated_by: user.id,
        metadata: {
          field: workflow.finding_details?.field,
          approved_value: workflow.approved_value,
          provider_npi: workflow.provider_npi,
        },
      });
    } catch {
      // Non-critical: artifact tracking is optional for MVP
      console.warn('workflow_artifacts insert skipped (table may not have expected columns)');
    }

    // 10. Return PDF
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="NPPES_Update_${workflow.provider_npi}_${workflow.finding_details?.field || 'correction'}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (err) {
    console.error('Generate form error:', err);
    return NextResponse.json(
      { error: 'Failed to generate form' },
      { status: 500 }
    );
  }
}
