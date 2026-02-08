import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/bulk-scan
 * =========================
 * Accepts a JSON array of providers (from CSV upload), scans each one,
 * and updates registry + scan_reports tables.
 *
 * Body: { providers: [{ npi, name, url, city?, zip?, email?, phone? }] }
 * 
 * This is a long-running endpoint. For 500 providers at ~4s each,
 * it takes ~33 minutes. Vercel Pro has a 300s (5min) timeout.
 * 
 * To handle this, we process in batches and return results for each batch.
 * The frontend calls this endpoint repeatedly with the remaining providers.
 * 
 * Query params:
 *   ?batch_size=10  (default 10, max 25 per call to stay under Vercel timeout)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SCAN_DELAY_MS = 2500; // Delay between scans to respect ip-api rate limits

interface ProviderInput {
  npi: string;
  name: string;
  url: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
}

interface ScanResultItem {
  npi: string;
  name: string;
  url: string;
  success: boolean;
  risk_score?: number;
  risk_level?: string;
  status_label?: string;
  report_id?: string;
  findings_count?: number;
  pass_count?: number;
  fail_count?: number;
  warn_count?: number;
  error?: string;
  duration_ms?: number;
}

// ── Supabase helpers ──
async function supabaseUpsert(table: string, data: Record<string, unknown>, conflictColumn: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function supabaseFindByNpi(npi: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
}

async function supabasePatch(table: string, filter: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function supabaseInsert(table: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch {
    return null;
  }
}

// ── Run a single scan via the internal /api/scan endpoint ──
async function runScan(npi: string, url: string, origin: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${origin}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npi, url }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Store report via /api/report ──
async function storeReport(
  npi: string,
  name: string,
  scanData: Record<string, unknown>,
  origin: string
): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npi,
        url: scanData.url,
        providerName: name,
        riskScore: scanData.riskScore,
        riskLevel: scanData.riskLevel,
        complianceStatus: scanData.complianceStatus,
        findings: scanData.findings || [],
        categoryScores: scanData.categoryScores,
        dataBorderMap: scanData.dataBorderMap,
        pageContext: scanData.pageContext,
        npiVerification: scanData.npiVerification,
        engineVersion: scanData.engineVersion,
        scanDuration: scanData.scanDuration,
        meta: scanData.meta,
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.reportId || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════
// ═══ ENDPOINT ═══
// ═══════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const providers: ProviderInput[] = body.providers || [];
    const batchSize = Math.min(parseInt(request.nextUrl.searchParams.get('batch_size') || '10'), 25);

    if (!providers.length) {
      return NextResponse.json({ error: 'No providers provided' }, { status: 400 });
    }

    // Take only the first batch_size providers
    const batch = providers.slice(0, batchSize);
    const origin = request.nextUrl.origin;
    const nowIso = new Date().toISOString();
    const results: ScanResultItem[] = [];

    for (let i = 0; i < batch.length; i++) {
      const p = batch[i];
      const startMs = Date.now();
      const result: ScanResultItem = {
        npi: p.npi,
        name: p.name,
        url: p.url,
        success: false,
      };

      // Skip if no URL
      if (!p.url || !p.url.trim()) {
        result.error = 'No URL provided';
        results.push(result);
        continue;
      }

      const targetUrl = p.url.startsWith('http') ? p.url : `https://${p.url}`;

      // ── 1. Upsert provider into registry ──
      let existing = await supabaseFindByNpi(p.npi);

      if (!existing) {
        // Insert new provider
        const newProvider = await supabaseInsert('registry', {
          id: `REG-${Date.now()}-${i}`,
          npi: p.npi,
          name: p.name,
          url: targetUrl,
          city: p.city || null,
          zip: p.zip || null,
          email: p.email || null,
          phone: p.phone || null,
          provider_type: 2,
          widget_status: 'hidden',
          subscription_status: 'trial',
          is_visible: true,
          risk_score: 0,
          scan_count: 0,
          created_at: nowIso,
          updated_at: nowIso,
        });
        if (newProvider) {
          existing = newProvider;
        }
      } else {
        // Update existing provider with any new data
        const updates: Record<string, unknown> = { updated_at: nowIso };
        if (targetUrl && !existing.url) updates.url = targetUrl;
        if (p.city && !existing.city) updates.city = p.city;
        if (p.zip && !existing.zip) updates.zip = p.zip;
        if (p.email && !existing.email) updates.email = p.email;
        if (p.phone && !existing.phone) updates.phone = p.phone;
        if (Object.keys(updates).length > 1) {
          await supabasePatch('registry', `npi=eq.${p.npi}`, updates);
        }
      }

      // ── 2. Run scan ──
      const scanData = await runScan(p.npi, targetUrl, origin);

      if (!scanData || scanData.error) {
        result.error = (scanData?.message as string) || (scanData?.error as string) || 'Scan failed';
        result.duration_ms = Date.now() - startMs;
        results.push(result);
        continue;
      }

      const riskScore = (scanData.riskScore as number) || 0;
      const riskLevel = (scanData.riskLevel as string) || 'critical';
      const complianceStatus = (scanData.complianceStatus as string) || 'Violation';
      const findings = (scanData.findings as Record<string, unknown>[]) || [];
      const passCount = findings.filter((f) => f.status === 'pass').length;
      const failCount = findings.filter((f) => f.status === 'fail').length;
      const warnCount = findings.filter((f) => f.status === 'warn').length;

      // ── 3. Store report ──
      const reportId = await storeReport(p.npi, p.name, scanData, origin);

      // ── 4. Update registry with scan results ──
      const statusLabel = riskScore >= 75 ? 'Verified Sovereign' : riskScore >= 50 ? 'Drift Detected' : 'Violation';
      const widgetStatus = riskScore >= 75 ? 'active' : riskScore >= 50 ? 'warning' : 'hidden';

      const registryUpdate: Record<string, unknown> = {
        url: targetUrl,
        risk_score: riskScore,
        risk_level: riskLevel,
        status_label: statusLabel,
        scan_count: ((existing?.scan_count as number) || 0) + 1,
        widget_status: widgetStatus,
        last_scan_result: scanData,
        last_scan_timestamp: nowIso,
        updated_at: nowIso,
      };
      if (reportId) {
        registryUpdate.report_status = 'generated';
        registryUpdate.latest_report_url = `/api/report?reportId=${reportId}`;
      }

      await supabasePatch('registry', `npi=eq.${p.npi}`, registryUpdate);

      // ── 5. Upsert prospect ──
      if (p.email || p.name) {
        await supabaseInsert('prospects', {
          source: 'bulk-scan',
          contact_name: p.name,
          email: p.email || null,
          status: riskScore >= 75 ? 'passive' : riskScore >= 50 ? 'nurture' : 'hot',
          priority: riskScore < 50 ? 'high' : riskScore < 75 ? 'medium' : 'low',
          admin_notes: `Bulk scan: Score ${riskScore} (${statusLabel}). ${failCount} issues found.`,
          form_data: {
            npi: p.npi,
            url: targetUrl,
            city: p.city,
            risk_score: riskScore,
            risk_level: riskLevel,
            status_label: statusLabel,
            findings_count: findings.length,
            pass_count: passCount,
            fail_count: failCount,
            warn_count: warnCount,
            scan_source: 'bulk-scan',
            report_id: reportId,
          },
        });
      }

      result.success = true;
      result.risk_score = riskScore;
      result.risk_level = riskLevel;
      result.status_label = statusLabel;
      result.report_id = reportId || undefined;
      result.findings_count = findings.length;
      result.pass_count = passCount;
      result.fail_count = failCount;
      result.warn_count = warnCount;
      result.duration_ms = Date.now() - startMs;
      results.push(result);

      // Rate limit delay between scans
      if (i < batch.length - 1) {
        await new Promise((r) => setTimeout(r, SCAN_DELAY_MS));
      }
    }

    // Summary
    const scanned = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const remaining = providers.length - batch.length;

    return NextResponse.json({
      batch_size: batch.length,
      scanned,
      failed,
      remaining,
      total: providers.length,
      results,
      // Return the remaining providers so the frontend can call again
      next_batch: remaining > 0 ? providers.slice(batchSize) : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Bulk scan failed', message: msg }, { status: 500 });
  }
}
