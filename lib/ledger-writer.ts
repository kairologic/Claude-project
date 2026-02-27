// lib/ledger-writer.ts
// ═══════════════════════════════════════════════════════════════
// KairoLogic Phase 2: Compliance Ledger Dual-Write Module
// 
// Writes scan results to the new compliance tables:
//   - compliance_findings
//   - compliance_ledger_events  
//   - infrastructure_snapshots
//   - registry updates (cdn_detected, cdn_provider, last_scan_at)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// ─── Types ─────────────────────────────────────────────────────

interface LedgerFinding {
  id: string;
  status: string;
  severity?: string;
  title: string;
  detail?: string;
  category?: string;
  evidence?: Record<string, any>;
  recommendedFix?: string;
  score?: number;
}

interface CDNDetection {
  detected: boolean;
  provider?: string;
  detectedVia?: string;
  confidence?: string;
}

interface ScanMeta {
  engine?: string;
  duration?: string;
  checksPass?: number;
  checksFail?: number;
  checksWarn?: number;
  ip?: string;
  country?: string;
  city?: string;
}

export interface LedgerWriteInput {
  npi: string;
  url: string;
  scanSessionId: string;
  riskScore: number;
  riskLevel: string;
  findings: LedgerFinding[];
  cdnDetection: CDNDetection;
  meta: ScanMeta;
  triggeredBy?: string;
  practiceGroupId?: string | null;
  responseHeaders?: Record<string, string>;
  mxRecords?: string[];
  thirdPartyScripts?: Array<{ domain: string; country?: string; category?: string }>;
}

// ─── Helpers ───────────────────────────────────────────────────

const VALID_CATEGORIES = ['data_sovereignty', 'ai_transparency', 'clinical_integrity', 'npi_integrity'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'advisory'];

function mapCategory(checkId: string, category?: string): string {
  if (category) {
    const c = category.toLowerCase().replace(/[- ]/g, '_');
    if (VALID_CATEGORIES.includes(c)) return c;
  }
  if (checkId.startsWith('DR-')) return 'data_sovereignty';
  if (checkId.startsWith('AI-')) return 'ai_transparency';
  if (checkId.startsWith('ER-') || checkId.startsWith('CI-')) return 'clinical_integrity';
  if (checkId.startsWith('NPI-') || checkId.startsWith('RST-')) return 'npi_integrity';
  return 'data_sovereignty';
}

function mapSeverity(finding: LedgerFinding): string {
  if (finding.severity) {
    const s = finding.severity.toLowerCase();
    if (VALID_SEVERITIES.includes(s)) return s;
  }
  if (finding.status === 'fail') return 'high';
  if (finding.status === 'warn') return 'medium';
  if (finding.status === 'advisory') return 'advisory';
  return 'low';
}

function isDomainLevel(checkId: string): boolean {
  return checkId.startsWith('DR-') || checkId.startsWith('AI-');
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── Main dual-write function ──────────────────────────────────

export async function writeLedgerData(input: LedgerWriteInput): Promise<{
  findingsWritten: number;
  ledgerEventId: string | null;
  snapshotId: string | null;
  practiceGroupId: string | null;
  errors: string[];
}> {
  const supabase = getSupabase();
  const errors: string[] = [];
  let findingsWritten = 0;
  let ledgerEventId: string | null = null;
  let snapshotId: string | null = null;
  const now = new Date().toISOString();

  // ─── 1. Resolve practice group ───────────────────────────────
  let practiceGroupId = input.practiceGroupId || null;
  if (!practiceGroupId) {
    try {
      const { data } = await supabase
        .from('registry')
        .select('practice_group_id')
        .eq('npi', input.npi)
        .single();
      practiceGroupId = (data as any)?.practice_group_id || null;
    } catch { /* no group — fine */ }
  }

  // ─── 2. Write compliance_findings ────────────────────────────
  for (const f of input.findings) {
    try {
      // Check for existing open finding (same NPI + check_id)
      const { data: existing } = await supabase
        .from('compliance_findings')
        .select('id')
        .eq('npi', input.npi)
        .eq('check_id', f.id)
        .eq('status', 'open')
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing finding
        const updateData: Record<string, any> = {
          last_detected_at: now,
          severity: mapSeverity(f),
          title: f.title,
          detail: f.detail || '',
          evidence: f.evidence || null,
          score: f.score ?? null,
        };
        if (input.scanSessionId) updateData.scan_session_id = input.scanSessionId;
        // If previously failing and now passes → remediated
        if (f.status === 'pass') {
          updateData.status = 'remediated';
          updateData.resolved_at = now;
        }
        const { error } = await supabase
          .from('compliance_findings')
          .update(updateData)
          .eq('id', existing[0].id);

        if (error) errors.push(`cf update ${f.id}: ${error.message}`);
        else findingsWritten++;
      } else if (f.status !== 'pass') {
        // Insert new finding (only for non-pass)
        const insertData: Record<string, any> = {
          npi: input.npi,
          practice_group_id: practiceGroupId,
          check_id: f.id,
          category: mapCategory(f.id, f.category),
          severity: mapSeverity(f),
          status: 'open',
          title: f.title,
          description: f.detail || '',
          detail: f.detail || '',
          evidence: f.evidence || null,
          remediation_steps: f.recommendedFix ? [f.recommendedFix] : null,
          score: f.score ?? null,
          is_domain_level: isDomainLevel(f.id),
          first_detected_at: now,
          last_detected_at: now,
        };
        if (input.scanSessionId) insertData.scan_session_id = input.scanSessionId;

        const { error } = await supabase
          .from('compliance_findings')
          .insert(insertData);

        if (error) errors.push(`cf insert ${f.id}: ${error.message}`);
        else findingsWritten++;
      }
    } catch (err: any) {
      errors.push(`cf ${f.id}: ${err.message}`);
    }
  }

  // ─── 3. Write compliance_ledger_events ───────────────────────
  try {
    const fails = input.findings.filter(f => f.status === 'fail');
    const warns = input.findings.filter(f => f.status === 'warn');

    const { data, error } = await supabase
      .from('compliance_ledger_events')
      .insert({
        npi: input.npi,
        practice_group_id: practiceGroupId,
        event_type: 'scan_completed',
        event_data: {
          scan_session_id: input.scanSessionId || null,
          risk_score: input.riskScore,
          risk_level: input.riskLevel,
          checks_total: input.findings.length,
          checks_pass: input.meta.checksPass ?? 0,
          checks_fail: input.meta.checksFail ?? 0,
          checks_warn: input.meta.checksWarn ?? 0,
          cdn_detected: input.cdnDetection.detected,
          cdn_provider: input.cdnDetection.provider || null,
          engine_version: input.meta.engine || 'SENTRY-3.3.0',
          triggered_by: input.triggeredBy || 'api',
          top_findings: fails.slice(0, 3).map(f => ({
            check_id: f.id, title: f.title, severity: mapSeverity(f),
          })),
        },
        severity: fails.length > 0 ? 'high' : warns.length > 0 ? 'medium' : 'info',
        source: input.triggeredBy === 'batch_scan' ? 'batch_scan' : 'api',
      })
      .select('id')
      .single();

    if (error) errors.push(`cle: ${error.message}`);
    else ledgerEventId = data?.id || null;
  } catch (err: any) {
    errors.push(`cle: ${err.message}`);
  }

  // ─── 4. Write infrastructure_snapshots ───────────────────────
  try {
    const domain = extractDomain(input.url);

    const { data, error } = await supabase
      .from('infrastructure_snapshots')
      .insert({
        practice_group_id: practiceGroupId,
        npi: input.npi,
        domain,
        hosting_country: input.meta.country || null,
        cdn_provider: input.cdnDetection.provider || null,
        cdn_detected_via: input.cdnDetection.detectedVia || null,
        cdn_confidence: input.cdnDetection.confidence || null,
        ip_address: input.meta.ip || null,
        ip_country: input.meta.country || null,
        ip_city: input.meta.city || null,
        mx_providers: input.mxRecords || null,
        third_party_scripts: input.thirdPartyScripts || null,
        response_headers: input.responseHeaders || null,
        scan_session_id: input.scanSessionId || null,
        snapshot_at: now,
      })
      .select('id')
      .single();

    if (error) errors.push(`is: ${error.message}`);
    else snapshotId = data?.id || null;
  } catch (err: any) {
    errors.push(`is: ${err.message}`);
  }

  // ─── 5. Update registry ──────────────────────────────────────
  try {
    await supabase
      .from('registry')
      .update({
        cdn_detected: input.cdnDetection.detected || false,
        cdn_provider: input.cdnDetection.provider || null,
        last_scan_at: now,
      })
      .eq('npi', input.npi);
  } catch (err: any) {
    errors.push(`registry: ${err.message}`);
  }

  // ─── 6. Update scan_sessions (only if we have an ID) ────────
  if (input.scanSessionId) {
    try {
      await supabase
        .from('scan_sessions')
        .update({
          cdn_detected: input.cdnDetection.detected || false,
          cdn_provider: input.cdnDetection.provider || null,
          cdn_detected_via: input.cdnDetection.detectedVia || null,
          engine_version: input.meta.engine || 'SENTRY-3.3.0',
          practice_group_id: practiceGroupId,
        })
        .eq('id', input.scanSessionId);
    } catch (err: any) {
      errors.push(`scan_sessions: ${err.message}`);
    }
  }

  return { findingsWritten, ledgerEventId, snapshotId, practiceGroupId, errors };
}
