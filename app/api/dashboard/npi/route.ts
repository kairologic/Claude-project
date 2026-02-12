import { NextRequest, NextResponse } from 'next/server';

/**
 * Dashboard Data API
 * GET /api/dashboard/[npi]
 * 
 * Returns full provider data for the customer dashboard.
 * Requires valid session token in Authorization header.
 * 
 * Returns: provider info, scan history, violations, border map, drift alerts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 }, // Cache for 1 min
  });
}

async function validateSession(token: string, npi: string): Promise<boolean> {
  const res = await supabaseFetch(
    `dashboard_tokens?token=eq.${encodeURIComponent(token)}&npi=eq.${npi}&used_at=is.null&select=id,expires_at`
  );
  const sessions = await res.json();
  if (!sessions || sessions.length === 0) return false;
  return new Date(sessions[0].expires_at) > new Date();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { npi: string } }
) {
  try {
    const npi = params.npi;

    // Validate NPI format
    if (!npi || !/^\d{10}$/.test(npi)) {
      return NextResponse.json({ error: 'Invalid NPI' }, { status: 400 });
    }

    // Validate session token
    const authHeader = request.headers.get('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const valid = await validateSession(sessionToken, npi);
    if (!valid) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    // 1. Get provider from registry
    const regRes = await supabaseFetch(
      `registry?npi=eq.${npi}&select=*`
    );
    const providers = await regRes.json();

    if (!providers || providers.length === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const provider = providers[0];

    // 2. Get scan history
    const scanRes = await supabaseFetch(
      `scan_history?npi=eq.${npi}&select=*&order=scan_date.desc&limit=20`
    );
    const scanHistory = await scanRes.json();

    // 3. Get violations/evidence
    const violRes = await supabaseFetch(
      `violation_evidence?registry_id=eq.${provider.id}&select=*&order=captured_at.desc`
    );
    const violations = await violRes.json();

    // 4. Extract border map from latest scan
    let borderMap: any[] = [];
    if (provider.last_scan_result?.borderMap) {
      borderMap = provider.last_scan_result.borderMap;
    } else if (scanHistory?.length > 0 && scanHistory[0].violations?.borderMap) {
      borderMap = scanHistory[0].violations.borderMap;
    }

    // 5. Extract category scores from latest scan
    let categories: any = {};
    if (provider.last_scan_result?.categories) {
      categories = provider.last_scan_result.categories;
    } else if (scanHistory?.length > 0 && scanHistory[0].violations?.categories) {
      categories = scanHistory[0].violations.categories;
    }

    // 6. Build drift alerts from scan history comparisons
    const driftAlerts = buildDriftAlerts(scanHistory || [], violations || []);

    // 7. Calculate subscription/trial info
    const subscriptionInfo = getSubscriptionInfo(provider);

    return NextResponse.json({
      provider: {
        npi: provider.npi,
        name: provider.name,
        url: provider.url,
        city: provider.city,
        email: provider.email,
        risk_score: provider.risk_score,
        risk_level: provider.risk_level,
        widget_status: provider.widget_status,
        subscription_status: provider.subscription_status,
        last_scan_timestamp: provider.last_scan_timestamp,
        latest_report_url: provider.latest_report_url,
        updated_at: provider.updated_at,
      },
      categories,
      borderMap,
      scanHistory: (scanHistory || []).map((s: any) => ({
        id: s.id,
        scan_date: s.scan_date,
        risk_score: s.risk_score,
        risk_level: s.risk_level,
        scan_type: s.scan_type,
        findings_count: s.violations?.findings?.length || 0,
      })),
      violations: (violations || []).map((v: any) => ({
        id: v.id,
        violation_name: v.violation_name,
        violation_clause: v.violation_clause,
        technical_finding: v.technical_finding,
        recommended_fix: v.recommended_fix,
        fix_priority: v.fix_priority,
        captured_at: v.captured_at,
      })),
      driftAlerts,
      subscription: subscriptionInfo,
    });

  } catch (err) {
    console.error('[Dashboard API] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getSubscriptionInfo(provider: any) {
  const now = new Date();
  const trialEnd = provider.shield_trial_end ? new Date(provider.shield_trial_end) : null;
  const isTrialActive = trialEnd && trialEnd > now;
  const trialDaysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;

  return {
    tier: provider.subscription_tier || provider.subscription_status || 'none',
    status: provider.subscription_status || 'inactive',
    is_trial: isTrialActive || false,
    trial_end: provider.shield_trial_end || null,
    trial_days_remaining: trialDaysRemaining,
    stripe_customer_id: provider.stripe_customer_id || null,
  };
}

function buildDriftAlerts(scanHistory: any[], violations: any[]) {
  const alerts: any[] = [];

  // Compare consecutive scans for changes
  for (let i = 0; i < Math.min(scanHistory.length - 1, 5); i++) {
    const current = scanHistory[i];
    const previous = scanHistory[i + 1];

    if (!current || !previous) continue;

    const scoreDiff = (current.risk_score || 0) - (previous.risk_score || 0);

    // Score changed significantly
    if (Math.abs(scoreDiff) >= 5) {
      alerts.push({
        id: `drift-score-${current.id}`,
        type: scoreDiff > 0 ? 'improvement' : 'regression',
        severity: scoreDiff < -10 ? 'high' : scoreDiff < 0 ? 'medium' : 'low',
        title: scoreDiff > 0
          ? `Score improved +${scoreDiff} points`
          : `Score dropped ${scoreDiff} points`,
        description: scoreDiff > 0
          ? 'Compliance improvements detected after remediation'
          : 'New compliance issues detected — review findings',
        timestamp: current.scan_date,
        resolved: scoreDiff > 0,
      });
    }

    // New findings appeared
    const currentFindings = current.violations?.findings?.length || 0;
    const previousFindings = previous.violations?.findings?.length || 0;
    if (currentFindings > previousFindings) {
      alerts.push({
        id: `drift-findings-${current.id}`,
        type: 'new_finding',
        severity: 'medium',
        title: `${currentFindings - previousFindings} new finding(s) detected`,
        description: 'New scripts or connections found during scan',
        timestamp: current.scan_date,
        resolved: false,
      });
    }
  }

  // Add active violation-based alerts
  const activeViolations = violations.filter(v => v.fix_priority === 'Critical' || v.fix_priority === 'High');
  activeViolations.slice(0, 3).forEach(v => {
    alerts.push({
      id: `violation-${v.id}`,
      type: 'violation',
      severity: v.fix_priority === 'Critical' ? 'high' : 'medium',
      title: v.violation_name,
      description: v.technical_finding,
      timestamp: v.captured_at,
      resolved: false,
    });
  });

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
