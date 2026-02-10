import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/widget/drift
 * 
 * Widget reports one or more drift events when it detects
 * compliance content has changed from baseline.
 * 
 * Body: {
 *   npi, page_url, widget_mode, timestamp, user_agent,
 *   drifts: [{ category, drift_type, previous_hash, current_hash, content_before, content_after }]
 * }
 * 
 * GET /api/widget/drift?npi=XXX&status=new&limit=50
 * Returns drift events for admin dashboard or shield provider dashboard.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Severity mapping per category + drift type
const SEVERITY_MAP: Record<string, Record<string, string>> = {
  ai_disclosure:       { content_removed: 'critical', content_changed: 'high',   content_added: 'low' },
  privacy_policy:      { content_removed: 'high',     content_changed: 'medium', content_added: 'low' },
  third_party_scripts: { content_removed: 'medium',   content_changed: 'high',   content_added: 'high' },
  data_collection_forms:{ content_removed: 'medium',  content_changed: 'high',   content_added: 'medium' },
  cookie_consent:      { content_removed: 'medium',   content_changed: 'medium', content_added: 'low' },
  hipaa_references:    { content_removed: 'medium',   content_changed: 'low',    content_added: 'low' },
  meta_compliance:     { content_removed: 'low',      content_changed: 'low',    content_added: 'low' },
};

function getSeverity(category: string, driftType: string): string {
  return SEVERITY_MAP[category]?.[driftType] || 'medium';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { npi, page_url, widget_mode, drifts, timestamp, user_agent } = body;

    if (!npi || !drifts || !Array.isArray(drifts) || drifts.length === 0) {
      return NextResponse.json({ error: 'npi and drifts array required' }, { status: 400 });
    }

    const pageUrlNorm = page_url || '/';
    let inserted = 0;
    const insertedIds: string[] = [];

    for (const drift of drifts) {
      const severity = getSeverity(drift.category, drift.drift_type);

      const record = {
        npi,
        page_url: pageUrlNorm,
        category: drift.category,
        drift_type: drift.drift_type || 'content_changed',
        severity,
        status: 'new',
        previous_hash: drift.previous_hash || null,
        current_hash: drift.current_hash || null,
        content_before: (drift.content_before || '').substring(0, 2000),
        content_after: (drift.content_after || '').substring(0, 2000),
        metadata: {
          widget_mode: widget_mode || 'watch',
          user_agent: (user_agent || '').substring(0, 200),
          reported_at: timestamp || new Date().toISOString(),
          page_title: '', // widget could send this
        },
        created_at: new Date().toISOString(),
      };

      // Check for duplicate: same NPI + category + drift_type within last hour
      // This prevents the same drift from being reported by every page visitor
      const dedupeCheck = await fetch(
        `${SUPABASE_URL}/rest/v1/drift_events?npi=eq.${encodeURIComponent(npi)}` +
        `&category=eq.${encodeURIComponent(drift.category)}` +
        `&current_hash=eq.${encodeURIComponent(drift.current_hash || '')}` +
        `&status=eq.new` +
        `&created_at=gte.${new Date(Date.now() - 60 * 60 * 1000).toISOString()}` +
        `&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const existing = await dedupeCheck.json();
      if (existing && existing.length > 0) {
        // Already reported recently, skip
        continue;
      }

      // Insert drift event
      const res = await fetch(`${SUPABASE_URL}/rest/v1/drift_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        const data = await res.json();
        inserted++;
        if (data[0]?.id) insertedIds.push(data[0].id);

        // If critical/high severity, trigger alert
        if (severity === 'critical' || severity === 'high') {
          triggerAlert(npi, drift.category, severity, drift.drift_type, pageUrlNorm).catch(() => {});
        }
      } else {
        const errText = await res.text();
        console.error(`[Drift] Insert failed for ${drift.category}:`, errText);
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      deduplicated: drifts.length - inserted,
      ids: insertedIds,
    });
  } catch (err: any) {
    console.error('[Drift POST] Error:', err);
    return NextResponse.json({ error: 'Drift report failed' }, { status: 500 });
  }
}

// GET: Retrieve drift events for dashboards
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npi = searchParams.get('npi');
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let queryUrl = `${SUPABASE_URL}/rest/v1/drift_events?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;

    if (npi) queryUrl += `&npi=eq.${encodeURIComponent(npi)}`;
    if (status) queryUrl += `&status=eq.${encodeURIComponent(status)}`;
    if (severity) queryUrl += `&severity=eq.${encodeURIComponent(severity)}`;

    const res = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Failed to fetch drift events', detail: errText }, { status: 500 });
    }

    const events = await res.json();
    const totalCount = res.headers.get('content-range')?.split('/')[1] || events.length;

    return NextResponse.json({
      events,
      total: parseInt(String(totalCount)),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[Drift GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch drift events' }, { status: 500 });
  }
}

// PATCH: Update drift status (acknowledge, resolve, false_positive)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, resolved_by } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const validStatuses = ['acknowledged', 'resolved', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const updates: Record<string, any> = { status };
    if (status === 'resolved' || status === 'false_positive') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = resolved_by || 'admin';
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/drift_events?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Update failed', detail: errText }, { status: 500 });
    }

    const updated = await res.json();
    return NextResponse.json({ ok: true, event: updated[0] });
  } catch (err: any) {
    console.error('[Drift PATCH] Error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// ── Alert trigger ──
// Sends notification for critical/high drift events
async function triggerAlert(npi: string, category: string, severity: string, driftType: string, pageUrl: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://kairologic.net';

  // Fetch provider info for email
  const providerRes = await fetch(
    `${SUPABASE_URL}/rest/v1/registry?npi=eq.${encodeURIComponent(npi)}&limit=1&select=name,email,subscription_tier`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  const providers = await providerRes.json();
  const provider = providers?.[0];

  const categoryLabels: Record<string, string> = {
    ai_disclosure: 'AI Disclosure',
    privacy_policy: 'Privacy Policy',
    third_party_scripts: 'Third-Party Scripts',
    data_collection_forms: 'Data Collection Forms',
    cookie_consent: 'Cookie Consent',
    hipaa_references: 'HIPAA References',
    meta_compliance: 'Compliance Meta Tags',
  };

  const driftTypeLabels: Record<string, string> = {
    content_changed: 'content was modified',
    content_removed: 'content was removed',
    content_added: 'new content was detected',
    widget_removed: 'widget was removed',
  };

  // Always notify admin
  console.log(`[DRIFT ALERT] ${severity.toUpperCase()}: NPI ${npi} — ${categoryLabels[category] || category} ${driftTypeLabels[driftType] || driftType} on ${pageUrl}`);

  // Send admin email
  try {
    await fetch(`${origin}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_slug: 'immediate-summary',
        npi,
        variables: {
          email: 'compliance@kairologic.net',
          _force_internal: 'true',
          practice_name: provider?.name || `NPI: ${npi}`,
          status_label: `DRIFT: ${categoryLabels[category] || category} — ${driftTypeLabels[driftType] || driftType}`,
          top_violation_summary: `${severity.toUpperCase()} severity drift detected on ${pageUrl}. ${categoryLabels[category] || category} ${driftTypeLabels[driftType] || driftType}.`,
        },
      }),
    });
  } catch (e) {
    console.error('[Drift Alert] Admin email failed:', e);
  }

  // If Shield subscriber, also notify provider
  if (provider?.subscription_tier === 'shield' && provider?.email) {
    try {
      await fetch(`${origin}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: 'immediate-summary',
          npi,
          variables: {
            email: provider.email,
            practice_name: provider.name || `NPI: ${npi}`,
            status_label: `Compliance Drift Detected: ${categoryLabels[category] || category}`,
            top_violation_summary: `Your website's ${categoryLabels[category] || category} ${driftTypeLabels[driftType] || driftType}. Please review your compliance dashboard for details.`,
          },
        }),
      });
    } catch (e) {
      console.error('[Drift Alert] Provider email failed:', e);
    }
  }
}
