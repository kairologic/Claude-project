import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

type ReportType =
  | 'provider_roster'
  | 'data_accuracy'
  | 'payer_directory_status'
  | 'compliance_status'
  | 'credential_expiry'
  | 'workflow_activity'
  | 'payer_comparison';

/**
 * POST /api/reports/generate
 * Generate report based on report_type and filters
 * Body: { practice_id, report_type, filters? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { practice_id, report_type, filters = {} } = body;

    if (!practice_id || !report_type) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, report_type' },
        { status: 400 }
      );
    }

    const validReportTypes: ReportType[] = [
      'provider_roster',
      'data_accuracy',
      'payer_directory_status',
      'compliance_status',
      'credential_expiry',
      'workflow_activity',
      'payer_comparison',
    ];

    if (!validReportTypes.includes(report_type as ReportType)) {
      return NextResponse.json(
        { error: `Invalid report_type. Must be one of: ${validReportTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('id')
      .eq('id', practice_id)
      .single();

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    let data: any[] = [];
    let error: string | null = null;

    try {
      // Generate report based on type
      switch (report_type) {
        case 'provider_roster':
          data = await generateProviderRoster(supabase, practice_id, filters);
          break;

        case 'data_accuracy':
          data = await generateDataAccuracy(supabase, practice_id, filters);
          break;

        case 'payer_directory_status':
          data = await generatePayerDirectoryStatus(supabase, practice_id, filters);
          break;

        case 'compliance_status':
          data = await generateComplianceStatus(supabase, practice_id, filters);
          break;

        case 'credential_expiry':
          data = await generateCredentialExpiry(supabase, practice_id, filters);
          break;

        case 'workflow_activity':
          data = await generateWorkflowActivity(supabase, practice_id, filters);
          break;

        case 'payer_comparison':
          data = await generatePayerComparison(supabase, practice_id, filters);
          break;
      }
    } catch (err) {
      console.error('[Reports Generate POST] Error generating report:', err);
      error = 'Failed to generate report';
    }

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report_type,
      practice_id,
      generated_at: new Date().toISOString(),
      row_count: data.length,
      rows: data,
    });
  } catch (error) {
    console.error('[Reports Generate POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate provider roster report
 */
async function generateProviderRoster(supabase: any, practice_id: string, filters: any) {
  // Query workflow instances for providers in this practice
  const query = supabase
    .from('workflow_instances')
    .select('provider_npi, provider_name, status')
    .eq('practice_id', practice_id);

  // Apply filters if provided
  if (filters.status) {
    query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by provider and aggregate
  const grouped: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    const key = row.provider_npi || 'unknown';
    if (!grouped[key]) {
      grouped[key] = {
        provider_npi: row.provider_npi,
        provider_name: row.provider_name,
        status_counts: {},
        total_issues: 0,
      };
    }
    grouped[key].status_counts[row.status] = (grouped[key].status_counts[row.status] || 0) + 1;
    grouped[key].total_issues += 1;
  });

  return Object.values(grouped);
}

/**
 * Generate data accuracy report
 */
async function generateDataAccuracy(supabase: any, practice_id: string, filters: any) {
  // Query mismatches table
  const { data: mismatches, error } = await supabase
    .from('payer_directory_mismatches')
    .select('*')
    .eq('practice_id', practice_id);

  if (error) throw error;

  // Summarize by field and type
  const summary: Record<string, any> = {};
  (mismatches || []).forEach((row: any) => {
    const key = `${row.field_name}_${row.mismatch_type}`;
    if (!summary[key]) {
      summary[key] = {
        field_name: row.field_name,
        mismatch_type: row.mismatch_type,
        count: 0,
        severity: row.priority,
      };
    }
    summary[key].count += 1;
  });

  return Object.values(summary);
}

/**
 * Generate payer directory status report
 */
async function generatePayerDirectoryStatus(supabase: any, practice_id: string, filters: any) {
  const { data: endpoints, error: endpointsError } = await supabase
    .from('payer_directory_endpoints')
    .select('*')
    .eq('is_active', true);

  if (endpointsError) throw endpointsError;

  // For each payer, get latest snapshot info
  const results = await Promise.all(
    (endpoints || []).map(async (payer: any) => {
      const { data: latestSnapshot } = await supabase
        .from('payer_directory_snapshots')
        .select('snapshot_date, npi')
        .eq('payer_code', payer.payer_code)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      return {
        payer_code: payer.payer_code,
        payer_name: payer.payer_name,
        latest_sync: latestSnapshot?.snapshot_date || null,
        is_active: payer.is_active,
      };
    })
  );

  return results;
}

/**
 * Generate compliance status report
 */
async function generateComplianceStatus(supabase: any, practice_id: string, filters: any) {
  // Query workflow instances with compliance type
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('*')
    .eq('practice_id', practice_id)
    .eq('workflow_type', 'compliance');

  if (error) throw error;

  // Summarize by status
  const summary: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    const status = row.status;
    if (!summary[status]) {
      summary[status] = {
        status,
        count: 0,
        details: [],
      };
    }
    summary[status].count += 1;
    summary[status].details.push({
      workflow_id: row.id,
      finding_summary: row.finding_summary,
    });
  });

  return Object.values(summary);
}

/**
 * Generate credential expiry report
 */
async function generateCredentialExpiry(supabase: any, practice_id: string, filters: any) {
  // This would query credential/license data if available
  // For now, return empty result
  return [];
}

/**
 * Generate workflow activity report
 */
async function generateWorkflowActivity(supabase: any, practice_id: string, filters: any) {
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('workflow_type, status, created_at, completed_at')
    .eq('practice_id', practice_id);

  if (error) throw error;

  // Summarize by workflow type and status
  const summary: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    const key = `${row.workflow_type}_${row.status}`;
    if (!summary[key]) {
      summary[key] = {
        workflow_type: row.workflow_type,
        status: row.status,
        count: 0,
      };
    }
    summary[key].count += 1;
  });

  return Object.values(summary);
}

/**
 * Generate payer comparison report
 */
async function generatePayerComparison(supabase: any, practice_id: string, filters: any) {
  // Compare data across multiple payers for a practice
  const { data, error } = await supabase
    .from('payer_directory_snapshots')
    .select('*')
    .eq('practice_id', practice_id);

  if (error) throw error;

  // Group by payer and summarize
  const summary: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    const key = row.payer_code;
    if (!summary[key]) {
      summary[key] = {
        payer_code: row.payer_code,
        npis: new Set(),
        latest_date: null,
      };
    }
    if (row.npi) summary[key].npis.add(row.npi);
    if (!summary[key].latest_date || row.snapshot_date > summary[key].latest_date) {
      summary[key].latest_date = row.snapshot_date;
    }
  });

  // Convert Sets to counts
  return Object.values(summary).map((s: any) => ({
    payer_code: s.payer_code,
    npi_count: s.npis.size,
    latest_date: s.latest_date,
  }));
}
