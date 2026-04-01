/**
 * lib/verification/verification-hooks.ts
 *
 * Integration hooks for verification engine.
 * Called at the end of each sync job (NPPES, PECOS, Payer, State Board).
 * Handles:
 * - Fetching pending workflows for each system
 * - Comparing against latest synced data
 * - Updating verification status
 * - Creating alerts for state transitions
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import {
  getWorkflowsPendingVerification,
  compareValues,
  processVerificationResult,
  type ReVerificationJob,
  type ReVerificationResult,
} from './re-verify';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerificationSummary {
  checked: number;
  verified_fixed: number;
  still_mismatched: number;
  escalated: number;
}

// ─── Alert Creation ──────────────────────────────────────────────────────────

/**
 * Create an alert record for verification state transitions.
 */
async function createAlert(
  practiceId: string,
  title: string,
  description: string,
  severity: 'action' | 'warning' | 'info' | 'resolved',
  category: string,
  metadata?: Record<string, any>,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from('alerts').insert({
    practice_website_id: practiceId,
    title,
    description,
    severity,
    category,
    metadata: metadata || {},
    is_read: false,
    resolved_at: null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[createAlert] Error creating alert:', error);
  }
}

// ─── System-Specific Verification Hooks ──────────────────────────────────────

/**
 * Run verification for NPPES system.
 * Called after NPPES weekly sync completes.
 */
export async function runNppesVerification(practiceId?: string): Promise<VerificationSummary> {
  const admin = createAdminSupabaseClient();
  const summary: VerificationSummary = {
    checked: 0,
    verified_fixed: 0,
    still_mismatched: 0,
    escalated: 0,
  };

  try {
    // Get pending workflows for NPPES
    const jobs = await getWorkflowsPendingVerification('NPPES');
    if (jobs.length === 0) return summary;

    // Filter by practice if specified
    let filteredJobs = jobs;
    if (practiceId) {
      const { data: workflowData, error } = await admin
        .from('workflow_instances')
        .select('id')
        .eq('practice_id', practiceId)
        .in(
          'id',
          jobs.map((j) => j.workflow_id),
        );

      if (!error && workflowData) {
        const validIds = new Set(workflowData.map((w: any) => w.id));
        filteredJobs = jobs.filter((j) => validIds.has(j.workflow_id));
      }
    }

    // Fetch latest NPPES data for comparison
    const { data: nppesData, error: nppesError } = await admin
      .from('nppes_delta_events')
      .select('npi, field_name, new_value')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (nppesError) {
      console.error('[runNppesVerification] Error fetching NPPES data:', nppesError);
      return summary;
    }

    // Build lookup map by NPI
    const nppesMap = new Map<string, Map<string, string>>();
    (nppesData || []).forEach((record: any) => {
      if (!nppesMap.has(record.npi)) {
        nppesMap.set(record.npi, new Map());
      }
      nppesMap.get(record.npi)!.set(record.field_name, record.new_value);
    });

    // Process each job
    for (const job of filteredJobs) {
      summary.checked++;

      const npiFields = nppesMap.get(job.provider_npi);
      const currentValue = npiFields?.get(job.field) || null;

      const matched = compareValues(job.expected_value, currentValue, job.field);

      const result: ReVerificationResult = {
        workflow_id: job.workflow_id,
        matched,
        current_value: currentValue,
        expected_value: job.expected_value,
        checked_at: new Date().toISOString(),
      };

      await processVerificationResult(result);

      // Update summary
      if (matched) {
        summary.verified_fixed++;
        if (practiceId) {
          await createAlert(
            practiceId,
            'Correction Verified',
            `NPPES ${job.field} has been verified and corrected.`,
            'resolved',
            'verification',
            { workflow_id: job.workflow_id, system: 'NPPES', field: job.field },
          );
        }
      } else {
        summary.still_mismatched++;
      }

      // Check if escalated
      const { data: updatedWorkflow } = await admin
        .from('workflow_instances')
        .select('verification_status')
        .eq('id', job.workflow_id)
        .single();

      if (updatedWorkflow?.verification_status === 'escalated' && practiceId) {
        await createAlert(
          practiceId,
          'Verification Escalated',
          `NPPES ${job.field} failed verification after 3 attempts. Manual review required.`,
          'action',
          'verification',
          { workflow_id: job.workflow_id, system: 'NPPES', field: job.field },
        );
        summary.escalated++;
      }
    }
  } catch (err) {
    console.error('[runNppesVerification] Unexpected error:', err);
  }

  return summary;
}

/**
 * Run verification for PECOS system.
 * Called after PECOS monthly sync completes.
 */
export async function runPecosVerification(practiceId?: string): Promise<VerificationSummary> {
  const admin = createAdminSupabaseClient();
  const summary: VerificationSummary = {
    checked: 0,
    verified_fixed: 0,
    still_mismatched: 0,
    escalated: 0,
  };

  try {
    const jobs = await getWorkflowsPendingVerification('PECOS');
    if (jobs.length === 0) return summary;

    // Filter by practice if specified
    let filteredJobs = jobs;
    if (practiceId) {
      const { data: workflowData, error } = await admin
        .from('workflow_instances')
        .select('id')
        .eq('practice_id', practiceId)
        .in(
          'id',
          jobs.map((j) => j.workflow_id),
        );

      if (!error && workflowData) {
        const validIds = new Set(workflowData.map((w: any) => w.id));
        filteredJobs = jobs.filter((j) => validIds.has(j.workflow_id));
      }
    }

    // Fetch latest PECOS data
    const { data: pecosData, error: pecosError } = await admin
      .from('pecos_snapshot_agg')
      .select('npi, field_name, field_value')
      .order('last_updated_at', { ascending: false })
      .limit(1000);

    if (pecosError) {
      console.error('[runPecosVerification] Error fetching PECOS data:', pecosError);
      return summary;
    }

    // Build lookup map by NPI
    const pecosMap = new Map<string, Map<string, string>>();
    (pecosData || []).forEach((record: any) => {
      if (!pecosMap.has(record.npi)) {
        pecosMap.set(record.npi, new Map());
      }
      pecosMap.get(record.npi)!.set(record.field_name, record.field_value);
    });

    // Process each job
    for (const job of filteredJobs) {
      summary.checked++;

      const npiFields = pecosMap.get(job.provider_npi);
      const currentValue = npiFields?.get(job.field) || null;

      const matched = compareValues(job.expected_value, currentValue, job.field);

      const result: ReVerificationResult = {
        workflow_id: job.workflow_id,
        matched,
        current_value: currentValue,
        expected_value: job.expected_value,
        checked_at: new Date().toISOString(),
      };

      await processVerificationResult(result);

      if (matched) {
        summary.verified_fixed++;
        if (practiceId) {
          await createAlert(
            practiceId,
            'PECOS Correction Verified',
            `PECOS ${job.field} has been verified and corrected.`,
            'resolved',
            'verification',
            { workflow_id: job.workflow_id, system: 'PECOS', field: job.field },
          );
        }
      } else {
        summary.still_mismatched++;
      }

      const { data: updatedWorkflow } = await admin
        .from('workflow_instances')
        .select('verification_status')
        .eq('id', job.workflow_id)
        .single();

      if (updatedWorkflow?.verification_status === 'escalated' && practiceId) {
        await createAlert(
          practiceId,
          'PECOS Verification Escalated',
          `PECOS ${job.field} failed verification after 3 attempts. Manual review required.`,
          'action',
          'verification',
          { workflow_id: job.workflow_id, system: 'PECOS', field: job.field },
        );
        summary.escalated++;
      }
    }
  } catch (err) {
    console.error('[runPecosVerification] Unexpected error:', err);
  }

  return summary;
}

/**
 * Run verification for payer FHIR directory system.
 * Called after payer directory checks complete.
 */
export async function runPayerVerification(practiceId?: string): Promise<VerificationSummary> {
  const admin = createAdminSupabaseClient();
  const summary: VerificationSummary = {
    checked: 0,
    verified_fixed: 0,
    still_mismatched: 0,
    escalated: 0,
  };

  try {
    const jobs = await getWorkflowsPendingVerification('PAYER_DIRECTORY');
    if (jobs.length === 0) return summary;

    let filteredJobs = jobs;
    if (practiceId) {
      const { data: workflowData, error } = await admin
        .from('workflow_instances')
        .select('id')
        .eq('practice_id', practiceId)
        .in(
          'id',
          jobs.map((j) => j.workflow_id),
        );

      if (!error && workflowData) {
        const validIds = new Set(workflowData.map((w: any) => w.id));
        filteredJobs = jobs.filter((j) => validIds.has(j.workflow_id));
      }
    }

    // Fetch latest payer snapshot aggregation
    const { data: payerData, error: payerError } = await admin
      .from('payer_snapshot_agg')
      .select('provider_npi, field_name, field_value')
      .order('last_verified_at', { ascending: false })
      .limit(1000);

    if (payerError) {
      console.error('[runPayerVerification] Error fetching payer data:', payerError);
      return summary;
    }

    const payerMap = new Map<string, Map<string, string>>();
    (payerData || []).forEach((record: any) => {
      if (!payerMap.has(record.provider_npi)) {
        payerMap.set(record.provider_npi, new Map());
      }
      payerMap.get(record.provider_npi)!.set(record.field_name, record.field_value);
    });

    for (const job of filteredJobs) {
      summary.checked++;

      const npiFields = payerMap.get(job.provider_npi);
      const currentValue = npiFields?.get(job.field) || null;

      const matched = compareValues(job.expected_value, currentValue, job.field);

      const result: ReVerificationResult = {
        workflow_id: job.workflow_id,
        matched,
        current_value: currentValue,
        expected_value: job.expected_value,
        checked_at: new Date().toISOString(),
      };

      await processVerificationResult(result);

      if (matched) {
        summary.verified_fixed++;
        if (practiceId) {
          await createAlert(
            practiceId,
            'Payer Directory Correction Verified',
            `Payer directory ${job.field} has been verified and corrected.`,
            'resolved',
            'verification',
            { workflow_id: job.workflow_id, system: 'PAYER_DIRECTORY', field: job.field },
          );
        }
      } else {
        summary.still_mismatched++;
      }

      const { data: updatedWorkflow } = await admin
        .from('workflow_instances')
        .select('verification_status')
        .eq('id', job.workflow_id)
        .single();

      if (updatedWorkflow?.verification_status === 'escalated' && practiceId) {
        await createAlert(
          practiceId,
          'Payer Verification Escalated',
          `Payer directory ${job.field} failed verification after 3 attempts.`,
          'action',
          'verification',
          { workflow_id: job.workflow_id, system: 'PAYER_DIRECTORY', field: job.field },
        );
        summary.escalated++;
      }
    }
  } catch (err) {
    console.error('[runPayerVerification] Unexpected error:', err);
  }

  return summary;
}

/**
 * Run verification for state board system.
 * Called after state board data refresh completes.
 */
export async function runStateBoardVerification(practiceId?: string): Promise<VerificationSummary> {
  const admin = createAdminSupabaseClient();
  const summary: VerificationSummary = {
    checked: 0,
    verified_fixed: 0,
    still_mismatched: 0,
    escalated: 0,
  };

  try {
    const jobs = await getWorkflowsPendingVerification('STATE_BOARD');
    if (jobs.length === 0) return summary;

    let filteredJobs = jobs;
    if (practiceId) {
      const { data: workflowData, error } = await admin
        .from('workflow_instances')
        .select('id')
        .eq('practice_id', practiceId)
        .in(
          'id',
          jobs.map((j) => j.workflow_id),
        );

      if (!error && workflowData) {
        const validIds = new Set(workflowData.map((w: any) => w.id));
        filteredJobs = jobs.filter((j) => validIds.has(j.workflow_id));
      }
    }

    // Fetch latest state board data
    const { data: stateBoardData, error: stateError } = await admin
      .from('state_board_snapshot')
      .select('provider_license_number, field_name, field_value')
      .order('checked_at', { ascending: false })
      .limit(1000);

    if (stateError) {
      console.error('[runStateBoardVerification] Error fetching state board data:', stateError);
      return summary;
    }

    const stateMap = new Map<string, Map<string, string>>();
    (stateBoardData || []).forEach((record: any) => {
      const key = record.provider_license_number;
      if (!stateMap.has(key)) {
        stateMap.set(key, new Map());
      }
      stateMap.get(key)!.set(record.field_name, record.field_value);
    });

    for (const job of filteredJobs) {
      summary.checked++;

      // For state board, we might use provider_npi or license_number
      const npiFields = stateMap.get(job.provider_npi);
      const currentValue = npiFields?.get(job.field) || null;

      const matched = compareValues(job.expected_value, currentValue, job.field);

      const result: ReVerificationResult = {
        workflow_id: job.workflow_id,
        matched,
        current_value: currentValue,
        expected_value: job.expected_value,
        checked_at: new Date().toISOString(),
      };

      await processVerificationResult(result);

      if (matched) {
        summary.verified_fixed++;
        if (practiceId) {
          await createAlert(
            practiceId,
            'State Board Correction Verified',
            `State board ${job.field} has been verified and corrected.`,
            'resolved',
            'verification',
            { workflow_id: job.workflow_id, system: 'STATE_BOARD', field: job.field },
          );
        }
      } else {
        summary.still_mismatched++;
      }

      const { data: updatedWorkflow } = await admin
        .from('workflow_instances')
        .select('verification_status')
        .eq('id', job.workflow_id)
        .single();

      if (updatedWorkflow?.verification_status === 'escalated' && practiceId) {
        await createAlert(
          practiceId,
          'State Board Verification Escalated',
          `State board ${job.field} failed verification after 3 attempts.`,
          'action',
          'verification',
          { workflow_id: job.workflow_id, system: 'STATE_BOARD', field: job.field },
        );
        summary.escalated++;
      }
    }
  } catch (err) {
    console.error('[runStateBoardVerification] Unexpected error:', err);
  }

  return summary;
}
