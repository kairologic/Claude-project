/**
 * GET /api/cron/credentialing-monitor
 *
 * Vercel Cron — runs daily. Scans all active monitor tasks across
 * credentialing workflows and auto-completes them when data sources confirm.
 *
 * Monitor types handled:
 *  - monitor_auto_confirm  (Layer 2: NPPES address correction verified)
 *  - monitor_nppes         (Layer 3 onboarding: NPPES lists provider at practice)
 *  - monitor_payer_directory (Layer 3 onboarding: payer directory shows provider)
 *  - monitor_phantom       (Layer 3 departure: provider removed from directories)
 *
 * Security: Vercel cron sends Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kairologic.net';

// ─── Supabase REST helpers ──────────────────────────────────────────────────

async function supabaseGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    console.error(`[CronMonitor] GET ${table} failed: ${res.status} ${await res.text()}`);
    return [];
  }
  return res.json();
}

async function supabasePatch(table: string, query: string, body: Record<string, any>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[CronMonitor] PATCH ${table} failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

async function supabaseInsert(table: string, body: Record<string, any>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[CronMonitor] INSERT ${table} failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface MonitorTask {
  id: string;
  workflow_id: string;
  task_type: string;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface WorkflowInstance {
  id: string;
  workflow_type: string;
  status: string;
  provider_npi: string;
  provider_name: string;
  practice_id: string;   // = practice_website_id
  approved_value?: string;
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check: Vercel cron sends CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const log: string[] = [];
  let tasksChecked = 0;
  let tasksCompleted = 0;
  let emailsSent = 0;

  try {
    // ── 1. Fetch all active monitor tasks ────────────────────────────────
    const monitorTypes = [
      'monitor_auto_confirm',
      'monitor_nppes',
      'monitor_payer_directory',
      'monitor_phantom',
    ];

    const tasks: MonitorTask[] = await supabaseGet(
      'workflow_tasks',
      `status=eq.active&task_type=in.(${monitorTypes.join(',')})&select=id,workflow_id,task_type,status,metadata,created_at`
    );

    if (tasks.length === 0) {
      return NextResponse.json({ message: 'No active monitor tasks', duration_ms: Date.now() - startTime });
    }

    log.push(`Found ${tasks.length} active monitor tasks`);

    // ── 2. Fetch parent workflows for context ────────────────────────────
    const workflowIds = Array.from(new Set(tasks.map(t => t.workflow_id)));
    const workflows: WorkflowInstance[] = await supabaseGet(
      'workflow_instances',
      `id=in.(${workflowIds.join(',')})&select=id,workflow_type,status,provider_npi,provider_name,practice_id,approved_value`
    );
    const wfMap = new Map(workflows.map(w => [w.id, w]));

    // ── 3. Process each task ─────────────────────────────────────────────
    for (const task of tasks) {
      const wf = wfMap.get(task.workflow_id);
      if (!wf || wf.status === 'cancelled' || wf.status === 'resolved') {
        log.push(`  Skip ${task.id} — workflow ${wf?.status || 'missing'}`);
        continue;
      }

      tasksChecked++;

      try {
        switch (task.task_type) {
          case 'monitor_auto_confirm':
            await processMonitorAutoConfirm(task, wf, log);
            break;
          case 'monitor_nppes':
            await processMonitorNppes(task, wf, log);
            break;
          case 'monitor_payer_directory':
            await processMonitorPayerDirectory(task, wf, log);
            break;
          case 'monitor_phantom':
            await processMonitorPhantom(task, wf, log);
            break;
        }
      } catch (err) {
        log.push(`  ERROR processing task ${task.id}: ${err}`);
      }
    }

    return NextResponse.json({
      message: 'Credentialing monitor sweep complete',
      tasks_found: tasks.length,
      tasks_checked: tasksChecked,
      tasks_completed: tasksCompleted,
      emails_sent: emailsSent,
      log,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[CronMonitor] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Handler: monitor_auto_confirm  (Layer 2 NPPES correction workflows)
  // ═══════════════════════════════════════════════════════════════════════════

  async function processMonitorAutoConfirm(task: MonitorTask, wf: WorkflowInstance, log: string[]) {
    // Only proceed if submit_nppes step is completed (user already submitted)
    const siblingTasks = await supabaseGet(
      'workflow_tasks',
      `workflow_id=eq.${wf.id}&select=id,task_type,status`
    );
    const submitTask = siblingTasks.find((t: any) => t.task_type === 'submit_nppes' || t.task_type === 'download_submit');
    if (submitTask && submitTask.status !== 'completed') {
      log.push(`  Skip ${task.id} (${wf.provider_npi}) — submit_nppes not yet completed`);
      return;
    }

    const expectedValue = task.metadata?.expected_value || wf.approved_value;
    if (!expectedValue) {
      log.push(`  Skip ${task.id} — no expected_value on task or workflow`);
      return;
    }

    // Fetch current NPPES data for this provider
    const providers = await supabaseGet(
      'providers',
      `npi=eq.${wf.provider_npi}&select=npi,address_line_1,city,state,zip_code,phone&limit=1`
    );
    if (providers.length === 0) {
      log.push(`  Skip ${task.id} — provider ${wf.provider_npi} not found in providers table`);
      return;
    }

    const provider = providers[0];
    const nppsAddress = normalizeAddress(`${provider.address_line_1}, ${provider.city}, ${provider.state} ${provider.zip_code}`);
    const expected = normalizeAddress(expectedValue);

    if (nppsAddress.includes(expected) || expected.includes(nppsAddress) || fuzzyAddressMatch(nppsAddress, expected)) {
      // MATCH — auto-complete the task and resolve the workflow
      log.push(`  ✓ MATCH: ${task.id} — NPPES now shows "${nppsAddress}" ≈ expected "${expected}"`);

      await completeTask(task.id, {
        ...task.metadata,
        confirmation_source: 'auto_scan',
        confirmed_value: nppsAddress,
        scan_date: new Date().toISOString(),
      });

      // Mark workflow as resolved
      await supabasePatch(
        'workflow_instances',
        `id=eq.${wf.id}`,
        {
          status: 'resolved',
          completed_reason: 'auto_confirmed',
          completed_at: new Date().toISOString(),
        }
      );

      await logWorkflowEvent(wf.id, 'auto_confirmed', 'NPPES update confirmed by automated scan', {
        confirmed_value: nppsAddress,
        scan_date: new Date().toISOString(),
      });

      tasksCompleted++;
    } else {
      // No match yet — update last check timestamp
      log.push(`  ✗ No match: ${task.id} — NPPES="${nppsAddress}" vs expected="${expected}"`);
      await updateCheckTimestamp(task.id, task.metadata);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Handler: monitor_nppes  (Layer 3 onboarding — provider listed at practice)
  // ═══════════════════════════════════════════════════════════════════════════

  async function processMonitorNppes(task: MonitorTask, wf: WorkflowInstance, log: string[]) {
    // Get practice address to compare against
    const practices = await supabaseGet(
      'practice_websites',
      `id=eq.${wf.practice_id}&select=name,address,city,state&limit=1`
    );
    if (practices.length === 0) {
      log.push(`  Skip ${task.id} — practice ${wf.practice_id} not found`);
      return;
    }

    const practice = practices[0];
    const practiceAddr = normalizeAddress(`${practice.address}, ${practice.city}, ${practice.state}`);

    // Fetch NPPES data
    const providers = await supabaseGet(
      'providers',
      `npi=eq.${wf.provider_npi}&select=npi,address_line_1,city,state,zip_code&limit=1`
    );
    if (providers.length === 0) {
      log.push(`  Skip ${task.id} — provider not in DB`);
      return;
    }

    const p = providers[0];
    const nppsAddr = normalizeAddress(`${p.address_line_1}, ${p.city}, ${p.state}`);

    if (fuzzyAddressMatch(nppsAddr, practiceAddr)) {
      log.push(`  ✓ NPPES match for onboarding: ${wf.provider_npi} @ ${practice.name}`);

      await completeTask(task.id, {
        ...task.metadata,
        confirmation_source: 'auto_scan',
        confirmed_address: `${p.address_line_1}, ${p.city}, ${p.state} ${p.zip_code}`,
        scan_date: new Date().toISOString(),
      });

      await logWorkflowEvent(wf.id, 'nppes_confirmed', 'NPPES address matches practice — auto-completed', {
        provider_address: nppsAddr,
        practice_address: practiceAddr,
      });

      tasksCompleted++;

      // Check if all workflow tasks are now done
      await checkWorkflowCompletion(wf, 'credentialing_onboarding', log);
    } else {
      log.push(`  ✗ NPPES mismatch: ${wf.provider_npi} — "${nppsAddr}" vs practice "${practiceAddr}"`);
      await updateCheckTimestamp(task.id, task.metadata);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Handler: monitor_payer_directory  (Layer 3 onboarding — payer lists provider)
  // ═══════════════════════════════════════════════════════════════════════════

  async function processMonitorPayerDirectory(task: MonitorTask, wf: WorkflowInstance, log: string[]) {
    const payerCode = task.metadata?.payer || task.metadata?.source;
    if (!payerCode) {
      log.push(`  Skip ${task.id} — no payer code in metadata`);
      return;
    }

    // Get practice info for address matching
    const practices = await supabaseGet(
      'practice_websites',
      `id=eq.${wf.practice_id}&select=name,address,city,state&limit=1`
    );
    const practice = practices[0];

    // Check payer_directory_snapshots for this NPI + payer
    const snapshots = await supabaseGet(
      'payer_directory_snapshots',
      `npi=eq.${wf.provider_npi}&payer_code=eq.${payerCode}&select=npi,payer_code,listed_address_line1,listed_city,listed_state,listed_phone,snapshot_date&order=snapshot_date.desc&limit=1`
    );

    if (snapshots.length === 0) {
      log.push(`  ✗ No snapshot for ${wf.provider_npi} @ ${payerCode}`);
      await updateCheckTimestamp(task.id, task.metadata);
      return;
    }

    const snap = snapshots[0];
    const snapAddr = normalizeAddress(`${snap.listed_address_line1}, ${snap.listed_city}, ${snap.listed_state}`);
    const practiceAddr = practice
      ? normalizeAddress(`${practice.address}, ${practice.city}, ${practice.state}`)
      : '';

    // For onboarding: provider should be listed AT the practice address
    if (practice && fuzzyAddressMatch(snapAddr, practiceAddr)) {
      const payerLabel = payerCode.toUpperCase();
      log.push(`  ✓ ${payerLabel} directory confirmed: ${wf.provider_npi} listed at practice address`);

      await completeTask(task.id, {
        ...task.metadata,
        confirmation_source: 'auto_scan',
        confirmed_address: `${snap.listed_address_line1}, ${snap.listed_city}, ${snap.listed_state}`,
        snapshot_date: snap.snapshot_date,
        scan_date: new Date().toISOString(),
      });

      await logWorkflowEvent(wf.id, 'payer_confirmed', `${payerLabel} directory listing confirmed`, {
        payer: payerCode,
        address: snapAddr,
      });

      tasksCompleted++;

      // Send payer_confirmed email
      await sendCredentialingEmail({
        event: 'payer_confirmed',
        provider_name: wf.provider_name,
        provider_npi: wf.provider_npi,
        practice_name: practice.name,
        practice_id: wf.practice_id,
        details: { payer_name: payerLabel },
      });
      emailsSent++;

      // Check if all workflow tasks are now done
      await checkWorkflowCompletion(wf, 'credentialing_onboarding', log);
    } else {
      log.push(`  ✗ ${payerCode} address mismatch for ${wf.provider_npi}: "${snapAddr}" vs "${practiceAddr}"`);
      await updateCheckTimestamp(task.id, task.metadata);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Handler: monitor_phantom  (Layer 3 departure — check provider REMOVED)
  // ═══════════════════════════════════════════════════════════════════════════

  async function processMonitorPhantom(task: MonitorTask, wf: WorkflowInstance, log: string[]) {
    const sources: string[] = task.metadata?.sources || [];
    if (sources.length === 0) {
      log.push(`  Skip ${task.id} — no sources in phantom task metadata`);
      return;
    }

    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get practice info
    const practices = await supabaseGet(
      'practice_websites',
      `id=eq.${wf.practice_id}&select=name,address,city,state&limit=1`
    );
    const practice = practices[0];
    const practiceAddr = practice
      ? normalizeAddress(`${practice.address}, ${practice.city}, ${practice.state}`)
      : '';

    // Check each source — provider should NOT be listed at practice address anymore
    const stillListed: string[] = [];
    const cleared: string[] = [];

    for (const source of sources) {
      if (source === 'nppes') {
        const providers = await supabaseGet(
          'providers',
          `npi=eq.${wf.provider_npi}&select=address_line_1,city,state&limit=1`
        );
        if (providers.length > 0) {
          const addr = normalizeAddress(`${providers[0].address_line_1}, ${providers[0].city}, ${providers[0].state}`);
          if (fuzzyAddressMatch(addr, practiceAddr)) {
            stillListed.push('NPPES');
          } else {
            cleared.push('NPPES');
          }
        } else {
          cleared.push('NPPES');
        }
      } else {
        // Payer directory check
        const snapshots = await supabaseGet(
          'payer_directory_snapshots',
          `npi=eq.${wf.provider_npi}&payer_code=eq.${source}&select=listed_address_line1,listed_city,listed_state,snapshot_date&order=snapshot_date.desc&limit=1`
        );
        if (snapshots.length === 0) {
          cleared.push(source.toUpperCase());
        } else {
          const snap = snapshots[0];
          const snapAddr = normalizeAddress(`${snap.listed_address_line1}, ${snap.listed_city}, ${snap.listed_state}`);
          if (fuzzyAddressMatch(snapAddr, practiceAddr)) {
            stillListed.push(source.toUpperCase());
          } else {
            cleared.push(source.toUpperCase());
          }
        }
      }
    }

    log.push(`  Phantom check ${wf.provider_npi}: cleared=[${cleared}], still_listed=[${stillListed}], day ${daysSinceCreated}/90`);

    // Update metadata with latest scan results
    const updatedMeta: Record<string, any> = {
      ...task.metadata,
      last_check: new Date().toISOString(),
      check_count: (task.metadata.check_count || 0) + 1,
      last_cleared: cleared,
      last_still_listed: stillListed,
    };

    // ── Escalation emails at 30 and 60 day marks ──
    if (stillListed.length > 0) {
      const lastEscalation = task.metadata.last_escalation_day || 0;

      if (daysSinceCreated >= 30 && lastEscalation < 30) {
        log.push(`  → 30-day phantom alert for ${wf.provider_npi}`);
        await sendCredentialingEmail({
          event: 'phantom_listing',
          provider_name: wf.provider_name,
          provider_npi: wf.provider_npi,
          practice_name: practice?.name || '',
          practice_id: wf.practice_id,
          details: {
            payer_name: stillListed.join(', '),
            days_since: daysSinceCreated,
          },
        });
        updatedMeta.last_escalation_day = 30;
        emailsSent++;
      }

      if (daysSinceCreated >= 60 && lastEscalation < 60) {
        log.push(`  → 60-day phantom escalation for ${wf.provider_npi}`);
        await sendCredentialingEmail({
          event: 'phantom_escalation',
          provider_name: wf.provider_name,
          provider_npi: wf.provider_npi,
          practice_name: practice?.name || '',
          practice_id: wf.practice_id,
          details: {
            directory_count: stillListed.length,
            directories: stillListed.join(', '),
            days_since: daysSinceCreated,
          },
        });
        updatedMeta.last_escalation_day = 60;
        emailsSent++;
      }
    }

    // ── 90-day final or all-clear completion ──
    if (stillListed.length === 0 || daysSinceCreated >= 90) {
      const allClear = stillListed.length === 0;

      log.push(`  ${allClear ? '✓' : '⚠'} Phantom monitoring complete for ${wf.provider_npi} — ${allClear ? 'all clear' : `${stillListed.length} still listed`}`);

      await completeTask(task.id, {
        ...updatedMeta,
        confirmation_source: allClear ? 'auto_scan' : '90_day_expiry',
        final_status: allClear ? 'all_clear' : 'incomplete',
        remaining_listings: stillListed,
        completed_date: new Date().toISOString(),
      });

      await logWorkflowEvent(wf.id, 'phantom_monitoring_complete',
        allClear
          ? 'Provider removed from all directories'
          : `90-day monitoring ended. Still listed in: ${stillListed.join(', ')}`,
        { cleared, still_listed: stillListed, days_monitored: daysSinceCreated }
      );

      tasksCompleted++;

      // Send final email
      await sendCredentialingEmail({
        event: 'phantom_final',
        provider_name: wf.provider_name,
        provider_npi: wf.provider_npi,
        practice_name: practice?.name || '',
        practice_id: wf.practice_id,
        details: {
          all_clear: allClear,
          remaining_count: stillListed.length,
          directories_cleared: cleared.join(', '),
        },
      });
      emailsSent++;

      // Check if all departure tasks are done
      await checkWorkflowCompletion(wf, 'credentialing_departure', log);
    } else {
      // Not yet done — just update the metadata
      await supabasePatch('workflow_tasks', `id=eq.${task.id}`, { metadata: updatedMeta });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shared helpers
  // ═══════════════════════════════════════════════════════════════════════════

  async function completeTask(taskId: string, metadata: Record<string, any>) {
    await supabasePatch('workflow_tasks', `id=eq.${taskId}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      confirmation_source: metadata.confirmation_source || 'auto_scan',
      confirmed_at: new Date().toISOString(),
      metadata,
    });
  }

  async function updateCheckTimestamp(taskId: string, existingMeta: Record<string, any>) {
    await supabasePatch('workflow_tasks', `id=eq.${taskId}`, {
      metadata: {
        ...existingMeta,
        last_check: new Date().toISOString(),
        check_count: (existingMeta.check_count || 0) + 1,
      },
    });
  }

  async function logWorkflowEvent(workflowId: string, eventType: string, title: string, details: Record<string, any>) {
    await supabaseInsert('workflow_events', {
      workflow_id: workflowId,
      event_type: eventType,
      actor_type: 'system',
      title,
      details,
    });
  }

  async function checkWorkflowCompletion(wf: WorkflowInstance, expectedType: string, log: string[]) {
    if (wf.workflow_type !== expectedType) return;

    // Fetch all tasks for this workflow
    const allTasks = await supabaseGet(
      'workflow_tasks',
      `workflow_id=eq.${wf.id}&select=id,task_type,status`
    );

    const incomplete = allTasks.filter((t: any) => t.status !== 'completed' && t.status !== 'skipped');
    if (incomplete.length > 0) {
      log.push(`  Workflow ${wf.id} still has ${incomplete.length} incomplete tasks`);
      return;
    }

    log.push(`  ✓ All tasks complete — marking workflow ${wf.id} as resolved`);

    await supabasePatch('workflow_instances', `id=eq.${wf.id}`, {
      status: 'resolved',
      completed_reason: 'all_tasks_complete',
      completed_at: new Date().toISOString(),
    });

    await logWorkflowEvent(wf.id, 'workflow_completed', `${expectedType} workflow auto-completed — all tasks verified`, {});

    // Update practice_providers roster status
    if (expectedType === 'credentialing_onboarding') {
      await supabasePatch(
        'practice_providers',
        `practice_website_id=eq.${wf.practice_id}&npi=eq.${wf.provider_npi}`,
        { roster_status: 'active' }
      );

      // Send onboarding_complete email
      const practices = await supabaseGet(
        'practice_websites',
        `id=eq.${wf.practice_id}&select=name&limit=1`
      );
      await sendCredentialingEmail({
        event: 'onboarding_complete',
        provider_name: wf.provider_name,
        provider_npi: wf.provider_npi,
        practice_name: practices[0]?.name || '',
        practice_id: wf.practice_id,
      });
      emailsSent++;

    } else if (expectedType === 'credentialing_departure') {
      await supabasePatch(
        'practice_providers',
        `practice_website_id=eq.${wf.practice_id}&npi=eq.${wf.provider_npi}`,
        {
          roster_status: 'departed',
          departed_date: new Date().toISOString().split('T')[0],
        }
      );

      // Send departure_complete email
      const practices = await supabaseGet(
        'practice_websites',
        `id=eq.${wf.practice_id}&select=name&limit=1`
      );
      await sendCredentialingEmail({
        event: 'departure_complete',
        provider_name: wf.provider_name,
        provider_npi: wf.provider_npi,
        practice_name: practices[0]?.name || '',
        practice_id: wf.practice_id,
      });
      emailsSent++;
    }
  }

  async function sendCredentialingEmail(payload: {
    event: string;
    provider_name: string;
    provider_npi: string;
    practice_name: string;
    practice_id: string;
    details?: Record<string, any>;
  }) {
    try {
      const res = await fetch(`${APP_URL}/api/email/credentialing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          recipient_email: 'ravi@kairologic.net',
          recipient_name: 'Ravi',
        }),
      });
      if (!res.ok) {
        console.error(`[CronMonitor] Email API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      console.error(`[CronMonitor] Email send error:`, err);
    }
  }
}

// ─── Address normalization & matching ───────────────────────────────────────

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(suite|ste|unit|apt|#)\s*/gi, 'ste ')
    .replace(/\b(street|st)\b/gi, 'st')
    .replace(/\b(avenue|ave)\b/gi, 'ave')
    .replace(/\b(boulevard|blvd)\b/gi, 'blvd')
    .replace(/\b(drive|dr)\b/gi, 'dr')
    .replace(/\b(road|rd)\b/gi, 'rd')
    .replace(/\b(lane|ln)\b/gi, 'ln')
    .replace(/\b(north|n)\b/gi, 'n')
    .replace(/\b(south|s)\b/gi, 's')
    .replace(/\b(east|e)\b/gi, 'e')
    .replace(/\b(west|w)\b/gi, 'w')
    .trim();
}

function fuzzyAddressMatch(a: string, b: string): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);

  // Exact match after normalization
  if (na === nb) return true;

  // One contains the other (handles zip code differences)
  if (na.includes(nb) || nb.includes(na)) return true;

  // Extract street number + first word of street name and city for core comparison
  const coreA = extractAddressCore(na);
  const coreB = extractAddressCore(nb);
  if (coreA && coreB && coreA === coreB) return true;

  return false;
}

function extractAddressCore(normalized: string): string | null {
  // Match: number + street word + city
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length < 3) return null;

  // First part should be a number (street number)
  if (!/^\d+$/.test(parts[0])) return null;

  // Return: street_number + first_street_word + last two words (typically city + state)
  const streetNum = parts[0];
  const streetWord = parts[1];
  const tail = parts.slice(-2).join(' ');
  return `${streetNum} ${streetWord} ${tail}`;
}
