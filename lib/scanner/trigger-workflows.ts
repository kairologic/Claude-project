// lib/scanner/trigger-workflows.ts
// ═══ Workflow Trigger Module ═══
// Converts nppes_delta_events (or mismatch flags) into workflow_instances,
// workflow_tasks, alerts, and workflow_events.
//
// Extracted from scripts/trigger-workflows.ts to be reusable from:
//   - Scan scheduler (after delta detection)
//   - Cron jobs
//   - CLI scripts
//
// Covers two trigger modes:
//   1. Delta-triggered: from nppes_delta_events (verified mismatches)
//   2. Mismatch-triggered: from practice_providers mismatch flags
//      (for providers with address/phone mismatches but no delta events)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DB ${options.method || 'GET'} ${path} failed: ${response.status} ${errorText}`,
    );
  }

  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  return null;
}

// ── Signal type → human-readable summary ──────────────────

const SIGNAL_SUMMARIES: Record<string, string> = {
  address_change: 'Address mismatch detected',
  phone_change: 'Phone number mismatch detected',
  name_change: 'Name mismatch detected',
  specialty_change: 'Specialty mismatch detected',
  provider_moved: 'Provider may have relocated',
  departed_provider: 'Departed provider still listed',
};

// ── Task templates ────────────────────────────────────────

const NPPES_UPDATE_TASKS = [
  {
    task_order: 1,
    task_type: 'review_approve',
    title: 'Review & approve correction',
    description: 'Compare NPPES vs website data and select the correct value',
  },
  {
    task_order: 2,
    task_type: 'download_form',
    title: 'Download pre-filled NPPES form',
    description: 'PDF with corrected data pre-populated',
  },
  {
    task_order: 3,
    task_type: 'submit_nppes',
    title: 'Submit form to NPPES',
    description: 'Upload or mail correction form to CMS',
  },
  {
    task_order: 4,
    task_type: 'monitor_auto_confirm',
    title: 'Monitor & auto-confirm',
    description: 'Auto-checks weekly; closes workflow when NPPES reflects update',
  },
];

const PAYER_DIRECTORY_TASKS = [
  {
    task_order: 1,
    task_type: 'review_payer_finding',
    title: 'Review payer directory mismatch',
    description: 'Compare provider data across payer directories and NPPES',
  },
  {
    task_order: 2,
    task_type: 'update_caqh',
    title: 'Update CAQH ProView profile',
    description:
      'Log in to CAQH and correct the mismatched fields — payers that pull from CAQH will auto-update',
  },
  {
    task_order: 3,
    task_type: 'verify_payer',
    title: 'Verify payer directories updated',
    description: 'Confirm each affected payer directory now shows the corrected data',
  },
  {
    task_order: 4,
    task_type: 'confirm_payer',
    title: 'Monitor & auto-confirm sync',
    description: 'Auto-checks via FHIR weekly; closes workflow when all payers reflect the update',
  },
];

const RELEASE_TASKS = [
  {
    task_order: 1,
    task_type: 'remove_website',
    title: 'Remove provider from website',
    description: 'Remove or mark as departed on the public-facing provider directory',
    group: 'immediate',
  },
  {
    task_order: 2,
    task_type: 'update_nppes_release',
    title: 'Update NPPES practice address',
    description: "Remove the departing provider's association with this practice address in NPPES",
    group: 'immediate',
  },
  {
    task_order: 3,
    task_type: 'notify_payers',
    title: 'Notify payers of departure',
    description: 'Submit termination notice to each contracted payer and update CAQH',
    group: 'submit_wait',
  },
  {
    task_order: 4,
    task_type: 'update_pecos_release',
    title: 'Update PECOS enrollment',
    description: 'Submit change of information in PECOS to remove practice association',
    group: 'submit_wait',
  },
  {
    task_order: 5,
    task_type: 'monitor_removal',
    title: 'Monitor phantom listing removal',
    description:
      'Auto-checks weekly for 90 days to ensure provider no longer appears in directories',
    group: 'monitoring',
  },
];

// ── Public API ────────────────────────────────────────────

export interface TriggerResult {
  workflows_created: number;
  tasks_created: number;
  alerts_created: number;
  events_created: number;
}

/**
 * Generate workflows and alerts for providers with mismatch flags at a practice,
 * where no workflow yet exists. This bridges the gap between mismatch detection
 * and actionable dashboard items.
 *
 * Called after scan completion to ensure every detected mismatch has a workflow.
 */
export async function triggerWorkflowsForPractice(
  practiceWebsiteId: string,
): Promise<TriggerResult> {
  const result: TriggerResult = {
    workflows_created: 0,
    tasks_created: 0,
    alerts_created: 0,
    events_created: 0,
  };

  try {
    // 1. Get providers with active mismatches at this practice
    const providers: any[] = await db(
      `practice_providers?practice_website_id=eq.${practiceWebsiteId}&active_mismatch_count=gt.0&select=npi,provider_name,web_address,web_phone,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,has_name_mismatch`,
    );

    if (!providers || providers.length === 0) return result;

    // 2. Check which already have active workflows (dedup)
    const npis = providers.map((p) => `"${p.npi}"`).join(',');
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&provider_npi=in.(${npis})&status=neq.resolved&status=neq.cancelled&select=provider_npi`,
    );
    const hasWorkflow = new Set((existingWfs || []).map((w: any) => w.provider_npi));

    // 3. Get NPPES data for comparison
    const npiList = providers.map((p) => `"${p.npi}"`).join(',');
    const nppesData: any[] = await db(
      `providers?npi=in.(${npiList})&select=npi,first_name,last_name,organization_name,entity_type_code,address_line_1,city,state,zip_code,phone`,
    );
    const nppesMap = new Map(nppesData.map((p) => [p.npi, p]));

    // 4. Create workflows for providers that need them
    const now = new Date().toISOString();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 21);
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() + 14);

    for (const provider of providers) {
      if (hasWorkflow.has(provider.npi)) continue;

      const nppes = nppesMap.get(provider.npi);
      if (!nppes) continue;

      // Determine the primary mismatch type
      let field = '';
      let signalType = '';
      let nppesValue = '';
      let webValue = '';

      if (provider.has_address_mismatch) {
        field = 'address_line_1';
        signalType = 'address_change';
        nppesValue = [nppes.address_line_1, nppes.city, nppes.state, nppes.zip_code]
          .filter(Boolean)
          .join(', ');
        webValue = provider.web_address || '';
      } else if (provider.has_phone_mismatch) {
        field = 'phone';
        signalType = 'phone_change';
        nppesValue = nppes.phone || '';
        webValue = provider.web_phone || '';
      } else if (provider.has_taxonomy_mismatch) {
        field = 'taxonomy';
        signalType = 'specialty_change';
      } else if (provider.has_name_mismatch) {
        field = 'name';
        signalType = 'name_change';
      }

      const providerName =
        provider.provider_name ||
        [nppes.first_name, nppes.last_name].filter(Boolean).join(' ').trim() ||
        nppes.organization_name ||
        `NPI ${provider.npi}`;
      const summary = SIGNAL_SUMMARIES[signalType] || `Data mismatch detected (${field})`;

      // Insert workflow
      const wfRows = await db('workflow_instances', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          workflow_type: 'nppes_update',
          status: 'action_needed',
          priority: 2,
          provider_npi: provider.npi,
          provider_name: providerName,
          trigger_source: 'scan_scheduler',
          finding_summary: summary,
          finding_details: {
            field,
            signal_type: signalType,
            nppes_value: nppesValue,
            website_value: webValue,
            detection_source: 'practice_scan',
          },
          target_completion: targetDate.toISOString().split('T')[0],
          overdue_at: overdueDate.toISOString().split('T')[0],
          created_at: now,
        }),
      });

      if (!wfRows || wfRows.length === 0) continue;
      const wf = wfRows[0];
      result.workflows_created++;

      // Insert tasks
      const taskRows = NPPES_UPDATE_TASKS.map((t) => {
        let metadata: Record<string, any> = {};
        if (t.task_type === 'review_approve') {
          metadata = {
            comparison_data: {
              field,
              sources: [
                { source: 'Website', value: webValue },
                { source: 'NPPES', value: nppesValue },
              ],
            },
          };
        } else if (t.task_type === 'monitor_auto_confirm') {
          metadata = { check_schedule: 'weekly', check_day: 'monday', check_time_utc: '06:00' };
        }
        return {
          workflow_id: wf.id,
          task_order: t.task_order,
          task_type: t.task_type,
          title: t.title,
          description: t.description,
          status: t.task_order === 1 ? 'active' : 'pending',
          metadata,
          created_at: now,
        };
      });

      await db('workflow_tasks', {
        method: 'POST',
        body: JSON.stringify(taskRows),
        headers: { Prefer: 'return=minimal' },
      });
      result.tasks_created += taskRows.length;

      // Insert alert
      let desc = `${field} mismatch between NPPES and website. Review and approve correction.`;
      if (field === 'address_line_1') {
        desc = `NPPES shows "${nppesValue.substring(0, 50)}" but website shows "${webValue.substring(0, 50)}"`;
      } else if (field === 'phone') {
        desc = `Phone on website (${webValue.substring(0, 14)}) doesn't match NPPES (${nppesValue.substring(0, 14)})`;
      }

      await db('alerts', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          severity: 'action',
          title: `${providerName}: ${summary}`,
          description: desc,
          workflow_id: wf.id,
          provider_npi: provider.npi,
          provider_name: providerName,
          source: 'scan_scheduler',
          is_active: true,
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.alerts_created++;

      // Insert audit event
      await db('workflow_events', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'system',
          title: `${summary} — workflow created`,
          details: {
            provider_npi: provider.npi,
            provider_name: providerName,
            trigger_source: 'scan_scheduler',
            finding_details: { field, nppes_value: nppesValue, website_value: webValue },
          },
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.events_created++;
    }
  } catch (err) {
    console.error(`[TriggerWorkflows] Error for practice ${practiceWebsiteId}:`, err);
  }

  return result;
}

// ── WF2: Payer Directory Workflows ─────────────────────

export interface PayerMismatchInput {
  npi: string;
  provider_name: string;
  payer_code: string;
  payer_name: string;
  field: string;
  payer_value: string;
  nppes_value: string;
  caqh_fixable: boolean;
}

/**
 * Create payer_directory workflows from payer directory mismatches.
 * Groups mismatches by provider — one workflow per provider with all
 * affected payers referenced in the finding_details.
 */
export async function triggerPayerDirectoryWorkflows(
  practiceWebsiteId: string,
  mismatches?: PayerMismatchInput[],
): Promise<TriggerResult> {
  const result: TriggerResult = {
    workflows_created: 0,
    tasks_created: 0,
    alerts_created: 0,
    events_created: 0,
  };

  try {
    // If no mismatches passed, query from DB
    if (!mismatches || mismatches.length === 0) {
      const dbMismatches: any[] = await db(
        `payer_directory_mismatches?practice_website_id=eq.${practiceWebsiteId}&status=eq.open&select=npi,payer_code,field_name,mismatch_type,nppes_value,payer_value,fix_via_caqh`,
      );
      if (!dbMismatches || dbMismatches.length === 0) return result;
      mismatches = dbMismatches.map((m: any) => ({
        npi: m.npi,
        provider_name: m.npi === 'PRACTICE' ? '' : `NPI ${m.npi}`,
        payer_name: m.payer_code,
        field: m.field_name,
        payer_value: m.payer_value || '',
        nppes_value: m.nppes_value || '',
        caqh_fixable: m.fix_via_caqh || false,
      }));
    }

    if (mismatches.length === 0) return result;

    // Group mismatches by provider NPI
    const byProvider = new Map<string, PayerMismatchInput[]>();
    for (const m of mismatches) {
      const existing = byProvider.get(m.npi) || [];
      existing.push(m);
      byProvider.set(m.npi, existing);
    }

    // Check for existing active payer_directory workflows
    const npis = [...byProvider.keys()].map((n) => `"${n}"`).join(',');
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&workflow_type=eq.payer_directory&provider_npi=in.(${npis})&status=neq.resolved&status=neq.cancelled&select=provider_npi`,
    );
    const hasWorkflow = new Set((existingWfs || []).map((w: any) => w.provider_npi));

    const now = new Date().toISOString();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 28); // 4 weeks for payer updates
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() + 21);

    for (const [npi, providerMismatches] of byProvider) {
      if (hasWorkflow.has(npi)) continue;

      const providerName = providerMismatches[0].provider_name || `NPI ${npi}`;
      const payerNames = [...new Set(providerMismatches.map((m) => m.payer_name))];
      const caqhFixable = providerMismatches.some((m) => m.caqh_fixable);

      const summary =
        payerNames.length === 1
          ? `${payerNames[0]} directory mismatch`
          : `${payerNames.length} payer directory mismatches`;

      // Insert workflow
      const wfRows = await db('workflow_instances', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          workflow_type: 'payer_directory',
          status: 'action_needed',
          priority: caqhFixable ? 2 : 3,
          provider_npi: npi,
          provider_name: providerName,
          trigger_source: 'payer_sync',
          finding_summary: summary,
          finding_details: {
            payers_affected: payerNames,
            mismatch_count: providerMismatches.length,
            caqh_fixable: caqhFixable,
            mismatches: providerMismatches.map((m) => ({
              payer: m.payer_name,
              field: m.field,
              payer_value: m.payer_value,
              nppes_value: m.nppes_value,
            })),
          },
          target_completion: targetDate.toISOString().split('T')[0],
          overdue_at: overdueDate.toISOString().split('T')[0],
          created_at: now,
        }),
      });

      if (!wfRows || wfRows.length === 0) continue;
      const wf = wfRows[0];
      result.workflows_created++;

      // Insert tasks
      const taskRows = PAYER_DIRECTORY_TASKS.map((t) => ({
        workflow_id: wf.id,
        task_order: t.task_order,
        task_type: t.task_type,
        title: t.title,
        description: t.description,
        status: t.task_order === 1 ? 'active' : 'pending',
        metadata:
          t.task_type === 'review_payer_finding'
            ? {
                payers_affected: payerNames,
                mismatches: providerMismatches.map((m) => ({
                  payer: m.payer_name,
                  field: m.field,
                  payer_value: m.payer_value,
                  nppes_value: m.nppes_value,
                })),
              }
            : t.task_type === 'update_caqh'
              ? {
                  caqh_fixable: caqhFixable,
                  fields_to_update: [...new Set(providerMismatches.map((m) => m.field))],
                }
              : {},
        created_at: now,
      }));

      await db('workflow_tasks', {
        method: 'POST',
        body: JSON.stringify(taskRows),
        headers: { Prefer: 'return=minimal' },
      });
      result.tasks_created += taskRows.length;

      // Insert alert
      await db('alerts', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          severity: 'action',
          title: `${providerName}: ${summary}`,
          description: `Payer directory data doesn't match NPPES for ${payerNames.join(', ')}. ${caqhFixable ? 'CAQH update may auto-fix.' : 'Manual correction needed.'}`,
          workflow_id: wf.id,
          provider_npi: npi,
          provider_name: providerName,
          source: 'payer_sync',
          is_active: true,
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.alerts_created++;

      // Insert audit event
      await db('workflow_events', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'system',
          title: `Payer directory mismatch — workflow created`,
          details: {
            provider_npi: npi,
            provider_name: providerName,
            trigger_source: 'payer_sync',
            payers_affected: payerNames,
            mismatch_count: providerMismatches.length,
          },
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.events_created++;
    }
  } catch (err) {
    console.error(
      `[TriggerWorkflows] Payer directory error for practice ${practiceWebsiteId}:`,
      err,
    );
  }

  return result;
}

// ── WF4: Departure (Release) Workflow ──────────────────

/**
 * Create a release workflow when a provider is marked DEPARTED.
 * Called from scan-scheduler when departure is confirmed (14+ days missing).
 */
export async function triggerDepartureWorkflow(
  practiceWebsiteId: string,
  npi: string,
  providerName: string,
): Promise<TriggerResult> {
  const result: TriggerResult = {
    workflows_created: 0,
    tasks_created: 0,
    alerts_created: 0,
    events_created: 0,
  };

  try {
    // Check for existing active release workflow
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&workflow_type=eq.release&provider_npi=eq.${npi}&status=neq.resolved&status=neq.cancelled&select=id`,
    );
    if (existingWfs && existingWfs.length > 0) return result;

    const now = new Date().toISOString();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() + 14);

    const displayName = providerName || `NPI ${npi}`;

    // Insert workflow
    const wfRows = await db('workflow_instances', {
      method: 'POST',
      body: JSON.stringify({
        practice_id: practiceWebsiteId,
        workflow_type: 'release',
        status: 'action_needed',
        priority: 2,
        provider_npi: npi,
        provider_name: displayName,
        trigger_source: 'scan_scheduler',
        finding_summary: `${displayName} no longer listed on practice website`,
        finding_details: {
          signal_type: 'departed_provider',
          detection_source: 'scan_scheduler',
          departed_at: now,
        },
        target_completion: targetDate.toISOString().split('T')[0],
        overdue_at: overdueDate.toISOString().split('T')[0],
        created_at: now,
      }),
    });

    if (!wfRows || wfRows.length === 0) return result;
    const wf = wfRows[0];
    result.workflows_created++;

    // Insert tasks
    const taskRows = RELEASE_TASKS.map((t) => ({
      workflow_id: wf.id,
      task_order: t.task_order,
      task_type: t.task_type,
      title: t.title,
      description: t.description,
      status: t.task_order === 1 ? 'active' : 'pending',
      metadata:
        t.task_type === 'monitor_removal'
          ? {
              check_schedule: 'weekly',
              monitor_duration_days: 90,
              directories_to_check: ['nppes', 'caqh', 'payer_fhir'],
            }
          : {},
      created_at: now,
    }));

    await db('workflow_tasks', {
      method: 'POST',
      body: JSON.stringify(taskRows),
      headers: { Prefer: 'return=minimal' },
    });
    result.tasks_created += taskRows.length;

    // Insert alert
    await db('alerts', {
      method: 'POST',
      body: JSON.stringify({
        practice_id: practiceWebsiteId,
        severity: 'warning',
        title: `Provider departure detected: ${displayName}`,
        description: `${displayName} (NPI: ${npi}) is no longer listed on the practice website. Begin off-boarding: update NPPES, notify payers, and monitor phantom listing removal.`,
        workflow_id: wf.id,
        provider_npi: npi,
        provider_name: displayName,
        source: 'scan_scheduler',
        is_active: true,
        created_at: now,
      }),
      headers: { Prefer: 'return=minimal' },
    });
    result.alerts_created++;

    // Insert audit event
    await db('workflow_events', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: wf.id,
        event_type: 'created',
        actor_type: 'system',
        title: `Provider departure detected — release workflow created`,
        details: {
          provider_npi: npi,
          provider_name: displayName,
          trigger_source: 'scan_scheduler',
        },
        created_at: now,
      }),
      headers: { Prefer: 'return=minimal' },
    });
    result.events_created++;
  } catch (err) {
    console.error(
      `[TriggerWorkflows] Departure error for ${npi} at practice ${practiceWebsiteId}:`,
      err,
    );
  }

  return result;
}

// ── WF6: Compliance Remediation Workflows ──────────────

const COMPLIANCE_TASKS = [
  {
    task_order: 1,
    task_type: 'show_finding',
    title: 'Review compliance finding',
    description:
      'Review the specific statutory requirement and how the practice is out of compliance',
  },
  {
    task_order: 2,
    task_type: 'provide_template',
    title: 'Apply remediation template',
    description: 'Use the auto-generated template or guide to fix the compliance gap',
  },
  {
    task_order: 3,
    task_type: 'rescan_confirm',
    title: 'Rescan & confirm compliance',
    description: 'KairoLogic rescans the practice website and confirms the issue is resolved',
  },
];

export interface ComplianceFindingInput {
  check_id: string;
  name: string;
  status: 'fail' | 'warn';
  severity: string;
  category: string;
  detail: string;
  clause: string;
  recommended_fix?: string;
}

/**
 * Create compliance workflows from scan findings that need remediation.
 * Groups findings by category — one workflow per category with all
 * failing checks referenced in finding_details.
 */
export async function triggerComplianceWorkflows(
  practiceWebsiteId: string,
  findings: ComplianceFindingInput[],
): Promise<TriggerResult> {
  const result: TriggerResult = {
    workflows_created: 0,
    tasks_created: 0,
    alerts_created: 0,
    events_created: 0,
  };

  if (!findings || findings.length === 0) return result;

  try {
    // Group by category for one workflow per compliance category
    const byCategory = new Map<string, ComplianceFindingInput[]>();
    for (const f of findings) {
      const existing = byCategory.get(f.category) || [];
      existing.push(f);
      byCategory.set(f.category, existing);
    }

    // Check for existing active compliance workflows at this practice
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&workflow_type=eq.compliance&status=neq.resolved&status=neq.cancelled&select=id,finding_details`,
    );

    // Build a set of check_ids that already have active workflows
    const existingCheckIds = new Set<string>();
    for (const wf of existingWfs || []) {
      const details = wf.finding_details;
      if (details?.check_ids) {
        for (const id of details.check_ids) existingCheckIds.add(id);
      }
    }

    const now = new Date().toISOString();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() + 21);

    const CATEGORY_NAMES: Record<string, string> = {
      data_sovereignty: 'Data Sovereignty (SB 1188)',
      ai_transparency: 'AI Transparency (HB 149)',
      clinical_integrity: 'Clinical Integrity (SB 1188)',
    };

    for (const [category, catFindings] of byCategory) {
      // Filter out findings that already have active workflows
      const newFindings = catFindings.filter((f) => !existingCheckIds.has(f.check_id));
      if (newFindings.length === 0) continue;

      const hasCritical = newFindings.some((f) => f.severity === 'critical');
      const categoryName = CATEGORY_NAMES[category] || category;

      const summary =
        newFindings.length === 1
          ? `${newFindings[0].name}: ${newFindings[0].status === 'fail' ? 'FAIL' : 'WARNING'}`
          : `${newFindings.length} ${categoryName} findings`;

      // Insert workflow
      const wfRows = await db('workflow_instances', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          workflow_type: 'compliance',
          status: hasCritical ? 'action_needed' : 'in_progress',
          priority: hasCritical ? 1 : 2,
          trigger_source: 'compliance_scan',
          finding_summary: summary,
          finding_details: {
            category,
            category_name: categoryName,
            check_ids: newFindings.map((f) => f.check_id),
            findings: newFindings.map((f) => ({
              check_id: f.check_id,
              name: f.name,
              status: f.status,
              severity: f.severity,
              detail: f.detail,
              clause: f.clause,
              recommended_fix: f.recommended_fix,
            })),
          },
          target_completion: targetDate.toISOString().split('T')[0],
          overdue_at: overdueDate.toISOString().split('T')[0],
          created_at: now,
        }),
      });

      if (!wfRows || wfRows.length === 0) continue;
      const wf = wfRows[0];
      result.workflows_created++;

      // Insert tasks
      const taskRows = COMPLIANCE_TASKS.map((t) => ({
        workflow_id: wf.id,
        task_order: t.task_order,
        task_type: t.task_type,
        title: t.title,
        description: t.description,
        status: t.task_order === 1 ? 'active' : 'pending',
        metadata:
          t.task_type === 'show_finding'
            ? {
                findings: newFindings.map((f) => ({
                  check_id: f.check_id,
                  name: f.name,
                  severity: f.severity,
                  detail: f.detail,
                  clause: f.clause,
                })),
              }
            : t.task_type === 'provide_template'
              ? {
                  remediations: newFindings
                    .filter((f) => f.recommended_fix)
                    .map((f) => ({ check_id: f.check_id, fix: f.recommended_fix })),
                }
              : {},
        created_at: now,
      }));

      await db('workflow_tasks', {
        method: 'POST',
        body: JSON.stringify(taskRows),
        headers: { Prefer: 'return=minimal' },
      });
      result.tasks_created += taskRows.length;

      // Insert alert
      const topFinding = newFindings.find((f) => f.severity === 'critical') || newFindings[0];
      await db('alerts', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          severity: hasCritical ? 'critical' : 'action',
          title: `Compliance: ${summary}`,
          description: `${categoryName} — ${newFindings.length} finding(s). ${topFinding.detail.substring(0, 200)}`,
          workflow_id: wf.id,
          source: 'compliance_scan',
          is_active: true,
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.alerts_created++;

      // Insert audit event
      await db('workflow_events', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'system',
          title: `Compliance scan — ${summary}`,
          details: {
            category,
            finding_count: newFindings.length,
            check_ids: newFindings.map((f) => f.check_id),
          },
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.events_created++;
    }
  } catch (err) {
    console.error(`[TriggerWorkflows] Compliance error for practice ${practiceWebsiteId}:`, err);
  }

  return result;
}

// ── WF7: License Renewal Workflow ────────────────────────

const LICENSE_RENEWAL_TASKS = [
  {
    task_order: 1,
    task_type: 'review_finding',
    title: 'Review license status',
    description: 'Check TMB records for license expiration date and renewal requirements',
  },
  {
    task_order: 2,
    task_type: 'submit_renewal',
    title: 'Submit license renewal',
    description: 'File renewal application with the state medical board',
  },
  {
    task_order: 3,
    task_type: 'update_credentials',
    title: 'Update credentialing files',
    description: 'Update payer credentialing records with renewed license',
  },
  {
    task_order: 4,
    task_type: 'monitor_auto_confirm',
    title: 'Auto-confirm on next sync',
    description: 'System will verify renewal on next TMB/license sync',
  },
];

/**
 * Create license_renewal workflows for providers with has_license_issue = true.
 * Queries practice_providers for the given practice to find flagged providers.
 */
export async function triggerLicenseRenewalWorkflows(
  practiceWebsiteId: string,
): Promise<TriggerResult> {
  const result: TriggerResult = {
    workflows_created: 0,
    tasks_created: 0,
    alerts_created: 0,
    events_created: 0,
  };

  try {
    // Find providers with license issues
    const flagged: any[] = await db(
      `practice_providers?practice_website_id=eq.${practiceWebsiteId}&has_license_issue=eq.true&roster_status=eq.active&select=npi,provider_name,license_issue_type`,
    );

    if (!flagged || flagged.length === 0) return result;

    // Check for existing active license_renewal workflows
    const npis = flagged.map((p: any) => `"${p.npi}"`).join(',');
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&workflow_type=eq.license_renewal&provider_npi=in.(${npis})&status=neq.resolved&status=neq.cancelled&select=provider_npi`,
    );
    const hasWorkflow = new Set((existingWfs || []).map((w: any) => w.provider_npi));

    const now = new Date().toISOString();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() + 21);

    for (const provider of flagged) {
      if (hasWorkflow.has(provider.npi)) continue;

      const issueType = provider.license_issue_type || 'expiring_soon';
      const summary =
        issueType === 'expired'
          ? 'Medical license expired'
          : issueType === 'expiring_soon'
            ? 'Medical license expiring soon'
            : `License issue: ${issueType}`;

      // Insert workflow
      const wfRows = await db('workflow_instances', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          workflow_type: 'license_renewal',
          status: 'action_needed',
          priority: issueType === 'expired' ? 1 : 3,
          provider_npi: provider.npi,
          provider_name: provider.provider_name,
          trigger_source: 'license_check',
          finding_summary: summary,
          finding_details: {
            license_issue_type: issueType,
          },
          target_completion: targetDate.toISOString().split('T')[0],
          overdue_at: overdueDate.toISOString().split('T')[0],
          created_at: now,
        }),
      });

      if (!wfRows || wfRows.length === 0) continue;
      const wf = wfRows[0];
      result.workflows_created++;

      // Insert tasks
      const taskRows = LICENSE_RENEWAL_TASKS.map((t) => ({
        workflow_id: wf.id,
        task_order: t.task_order,
        task_type: t.task_type,
        title: t.title,
        description: t.description,
        status: t.task_order === 1 ? 'active' : 'pending',
        created_at: now,
      }));

      await db('workflow_tasks', {
        method: 'POST',
        body: JSON.stringify(taskRows),
        headers: { Prefer: 'return=minimal' },
      });
      result.tasks_created += taskRows.length;

      // Insert alert
      await db('alerts', {
        method: 'POST',
        body: JSON.stringify({
          practice_id: practiceWebsiteId,
          severity: issueType === 'expired' ? 'critical' : 'action',
          title: `${provider.provider_name}: ${summary}`,
          description: `License issue detected for ${provider.provider_name} (NPI: ${provider.npi}). ${issueType === 'expired' ? 'Immediate action required.' : 'Renewal should be submitted before expiration.'}`,
          workflow_id: wf.id,
          provider_npi: provider.npi,
          provider_name: provider.provider_name,
          source: 'license_check',
          is_active: true,
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.alerts_created++;

      // Insert audit event
      await db('workflow_events', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: wf.id,
          event_type: 'created',
          actor_type: 'system',
          title: `License renewal — workflow created`,
          details: {
            provider_npi: provider.npi,
            provider_name: provider.provider_name,
            license_issue_type: issueType,
          },
          created_at: now,
        }),
        headers: { Prefer: 'return=minimal' },
      });
      result.events_created++;
    }
  } catch (err) {
    console.error(
      `[TriggerWorkflows] License renewal error for practice ${practiceWebsiteId}:`,
      err,
    );
  }

  return result;
}
