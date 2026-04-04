/**
 * GET /api/admin/practice-payer-summary?practice_id=xxx
 *
 * Returns aggregated payer directory status for the dashboard.
 * Shows one row per payer with verified/needs-review counts,
 * not individual provider-payer mismatches.
 *
 * Response shape:
 * {
 *   practice_id: string,
 *   practice_name: string,
 *   accepted_payers: string[],
 *   accepted_payers_source: string,
 *   total_providers: number,
 *   payer_summary: [
 *     {
 *       payer_code: "humana",
 *       payer_name: "Humana",
 *       verified_count: 18,
 *       needs_review_count: 2,
 *       total_checked: 20,
 *       connection_status: "working" | "code_fixed" | "url_corrected" | "needs_creds" | "inactive",
 *       has_open_mismatches: boolean,
 *       signal_type: "confirmed" | "indicative" | "endpoint_error",
 *     }
 *   ],
 *   signals: {
 *     license_issues: number,
 *     data_mismatches: number,
 *     payer_gaps: number,
 *     departures: number,
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';

// TODO: Add system-admin role check when role system is expanded

const GET_HANDLER = withAuth(async (request: NextRequest, ctx) => {
  try {
    const practice_id = request.nextUrl.searchParams.get('practice_id');
    if (!practice_id) {
      return NextResponse.json({ error: 'practice_id required' }, { status: 400 });
    }

    const supabase = ctx.supabase;

    // 1. Get practice info
    const { data: practices, error: practiceError } = await supabase
      .from('practice_websites')
      .select('id,name,url,accepted_payers,accepted_payers_source')
      .eq('id', practice_id);

    if (practiceError || !practices || practices.length === 0) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }
    const practice = practices[0];

    // 2. Get active providers
    const { data: providers } = await supabase
      .from('practice_providers')
      .select('npi,provider_name,has_license_issue,license_issue_type')
      .eq('practice_website_id', practice_id)
      .eq('roster_status', 'active');

    const npiList = (providers || []).map((p: any) => p.npi).filter(Boolean);

    // 3. Get active payer endpoints
    const { data: endpoints } = await supabase
      .from('payer_directory_endpoints')
      .select('payer_code,payer_name,auth_type')
      .eq('is_active', true);

    // 4. Get payer directory snapshots for these providers
    let snapshots: any[] = [];
    if (npiList.length > 0) {
      const { data: snapshotData } = await supabase
        .from('payer_directory_snapshots')
        .select('npi,payer_code,fhir_practitioner_id')
        .in('npi', npiList);
      snapshots = snapshotData || [];
    }

    // 5. Aggregate per payer
    const endpointMap = new Map<
      string,
      { payer_code: string; payer_name: string; auth_type: string }
    >((endpoints || []).map((e: any) => [e.payer_code, e]));
    const payerAgg = new Map<string, { verified: number; needsReview: number; total: number }>();

    for (const snap of snapshots) {
      const agg = payerAgg.get(snap.payer_code) || { verified: 0, needsReview: 0, total: 0 };
      agg.total++;
      if (snap.fhir_practitioner_id) {
        agg.verified++;
      } else {
        agg.needsReview++;
      }
      payerAgg.set(snap.payer_code, agg);
    }

    // 6. Get open mismatches count per payer
    let mismatches: any[] = [];
    if (npiList.length > 0) {
      const { data: mismatchData } = await supabase
        .from('payer_directory_mismatches')
        .select('payer_code,mismatch_type,signal_type')
        .eq('practice_website_id', practice_id)
        .eq('status', 'open');
      mismatches = mismatchData || [];
    }
    const mismatchByPayer = new Map<string, number>();
    for (const m of mismatches) {
      mismatchByPayer.set(m.payer_code, (mismatchByPayer.get(m.payer_code) || 0) + 1);
    }

    // 7. Build payer summary
    const payerSummary = [];
    const allPayerCodes = new Set([...payerAgg.keys(), ...(practice.accepted_payers || [])]);

    for (const payerCode of allPayerCodes) {
      const endpoint = endpointMap.get(payerCode);
      const agg = payerAgg.get(payerCode) || { verified: 0, needsReview: 0, total: 0 };

      // Determine connection status
      let connectionStatus = 'inactive';
      if (endpoint) {
        if (agg.total > 0 && agg.verified > 0) {
          connectionStatus = 'working';
        } else if (endpoint.auth_type === 'oauth2_client_credentials') {
          connectionStatus = 'needs_creds';
        } else {
          connectionStatus = 'pending_test';
        }
      }

      // Signal type: if we couldn't connect, flag as endpoint_error
      let signalType = 'indicative';
      if (connectionStatus === 'needs_creds' || connectionStatus === 'inactive') {
        signalType = 'endpoint_error';
      } else if (agg.total >= npiList.length && agg.verified > 0) {
        signalType = 'confirmed';
      }

      payerSummary.push({
        payer_code: payerCode,
        payer_name: endpoint?.payer_name || payerCode,
        verified_count: agg.verified,
        needs_review_count: agg.needsReview,
        total_checked: agg.total,
        total_providers: npiList.length,
        connection_status: connectionStatus,
        has_open_mismatches: (mismatchByPayer.get(payerCode) || 0) > 0,
        open_mismatch_count: mismatchByPayer.get(payerCode) || 0,
        signal_type: signalType,
      });
    }

    // Sort: working payers first, then by verified ratio descending
    payerSummary.sort((a, b) => {
      if (a.connection_status === 'working' && b.connection_status !== 'working') return -1;
      if (a.connection_status !== 'working' && b.connection_status === 'working') return 1;
      const ratioA = a.total_checked > 0 ? a.verified_count / a.total_checked : 0;
      const ratioB = b.total_checked > 0 ? b.verified_count / b.total_checked : 0;
      return ratioB - ratioA;
    });

    // 8. Aggregate signal counts across all types
    const licenseIssues = (providers || []).filter((p: any) => p.has_license_issue).length;
    const dataMismatches = mismatches.filter(
      (m: any) => m.mismatch_type === 'value_differs',
    ).length;
    const payerGaps = mismatches.filter(
      (m: any) => m.mismatch_type === 'acceptance_gap' || m.mismatch_type === 'not_listed',
    ).length;

    // Provider departures
    let departures = 0;
    try {
      const { data: departedData } = await supabase
        .from('practice_providers')
        .select('npi')
        .eq('practice_website_id', practice_id)
        .eq('roster_status', 'departed');
      departures = departedData?.length || 0;
    } catch {
      /* no departed column or empty */
    }

    return NextResponse.json({
      practice_id,
      practice_name: practice.name,
      accepted_payers: practice.accepted_payers || [],
      accepted_payers_source: practice.accepted_payers_source || 'none',
      total_providers: npiList.length,
      payer_summary: payerSummary,
      signals: {
        license_issues: licenseIssues,
        data_mismatches: dataMismatches,
        payer_gaps: payerGaps,
        departures,
      },
    });
  } catch (err) {
    console.error('[practice-payer-summary] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate summary' },
      { status: 500 },
    );
  }
});

export { GET_HANDLER as GET };
