// app/api/scan/run/route.ts
// ═══ Scan Engine v2 API ═══
// POST /api/scan/run
// Body: { npi, url, tier? }

import { NextRequest, NextResponse } from 'next/server';
import { runScan } from '@/checks/engine';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { npi, url } = body;

    if (!npi) {
      return NextResponse.json({ error: 'NPI is required' }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Determine tier from registry
    let tier: 'free' | 'report' | 'shield' = body.tier || 'free';
    
    if (!body.tier) {
      // Look up subscription tier from registry
      const regRes = await supabaseFetch(
        `registry?npi=eq.${encodeURIComponent(npi)}&select=subscription_tier,subscription_status`
      );
      const providers = await regRes.json();
      
      if (providers?.[0]?.subscription_tier) {
        const dbTier = providers[0].subscription_tier;
        if (dbTier === 'shield' || dbTier === 'shield_trial') tier = 'shield';
        else if (dbTier === 'report') tier = 'report';
      }
    }

    console.log(`[API] Starting v2 scan for NPI ${npi} at ${url} (tier: ${tier})`);

    // Run the scan
    const session = await runScan(npi, url, tier, 'manual');

    return NextResponse.json({
      success: true,
      scan_id: session.id,
      score: session.composite_score,
      risk_level: session.risk_level,
      checks: {
        total: session.checks_total,
        passed: session.checks_passed,
        failed: session.checks_failed,
        warned: session.checks_warned,
      },
      results: session.results.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        status: r.status,
        score: r.score,
        title: r.title,
        detail: r.detail,
        severity: r.severity,
        tier: r.tier,
        // Only include evidence + remediation for paid tiers
        ...(tier !== 'free' && {
          evidence: r.evidence,
          remediationSteps: r.remediationSteps,
        }),
      })),
    });

  } catch (err) {
    console.error('[API Scan] Error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
