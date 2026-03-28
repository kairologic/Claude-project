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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
    throw new Error(`DB ${options.method || 'GET'} ${path} failed: ${response.status} ${errorText}`);
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
  { task_order: 1, task_type: 'review_approve', title: 'Review & approve correction', description: 'Compare NPPES vs website data and select the correct value' },
  { task_order: 2, task_type: 'download_form', title: 'Download pre-filled NPPES form', description: 'PDF with corrected data pre-populated' },
  { task_order: 3, task_type: 'submit_nppes', title: 'Submit form to NPPES', description: 'Upload or mail correction form to CMS' },
  { task_order: 4, task_type: 'monitor_auto_confirm', title: 'Monitor & auto-confirm', description: 'Auto-checks weekly; closes workflow when NPPES reflects update' },
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
    const npis = providers.map(p => `"${p.npi}"`).join(',');
    const existingWfs: any[] = await db(
      `workflow_instances?practice_id=eq.${practiceWebsiteId}&provider_npi=in.(${npis})&status=neq.resolved&status=neq.cancelled&select=provider_npi`,
    );
    const hasWorkflow = new Set((existingWfs || []).map((w: any) => w.provider_npi));

    // 3. Get NPPES data for comparison
    const npiList = providers.map(p => `"${p.npi}"`).join(',');
    const nppesData: any[] = await db(
      `providers?npi=in.(${npiList})&select=npi,first_name,last_name,organization_name,entity_type_code,address_line_1,city,state,zip_code,phone`,
    );
    const nppesMap = new Map(nppesData.map(p => [p.npi, p]));

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
        nppesValue = [nppes.address_line_1, nppes.city, nppes.state, nppes.zip_code].filter(Boolean).join(', ');
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

      const providerName = provider.provider_name
        || [nppes.first_name, nppes.last_name].filter(Boolean).join(' ').trim()
        || nppes.organization_name
        || `NPI ${provider.npi}`;
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
      const taskRows = NPPES_UPDATE_TASKS.map(t => {
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
