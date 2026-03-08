import { NextRequest, NextResponse } from 'next/server';
import { getTrialState, checkFeatureAccess } from '@/lib/trial/trial-manager';

/**
 * Trial Status API
 * GET /api/trial/status?org_id=xxx
 * GET /api/trial/status?org_id=xxx&check=forms_single
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');
    const feature = url.searchParams.get('check');

    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    const state = await getTrialState(orgId);

    if (feature) {
      const access = await checkFeatureAccess(orgId, feature as any);
      return NextResponse.json({ ...state, feature_check: { feature, ...access } });
    }

    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get trial status' },
      { status: 500 },
    );
  }
}
