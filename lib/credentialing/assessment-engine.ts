/**
 * lib/credentialing/assessment-engine.ts
 *
 * Credentialing assessment engine (Layer 3).
 * Runs an instant multi-source assessment for a provider joining a practice.
 *
 * Currently uses existing database data (providers table, payer_directory_snapshots,
 * practice_providers). When FHIR client is fully wired, the assessment will query
 * live APIs in parallel — the interface stays the same.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPecosEnrollment } from './pecos-verification';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SourceStatus =
  | 'listed_correct'     // listed with correct info
  | 'wrong_address'      // listed but address doesn't match practice
  | 'wrong_phone'        // listed but phone doesn't match
  | 'needs_update'       // exists but needs corrections
  | 'not_listed'         // not found in this source
  | 'not_checked'        // source not available / not queried
  | 'active'             // license is active
  | 'expired'            // license expired
  | 'needs_reassignment' // PECOS needs reassignment to this TIN
  | 'enrolled'           // PECOS enrolled correctly
  | 'possibly_stale';    // CAQH data may be stale (inferred)

export interface AssessmentResult {
  nppes: SourceStatus;
  uhc: SourceStatus;
  aetna: SourceStatus;
  cigna: SourceStatus;
  humana: SourceStatus;
  bcbstx: SourceStatus;
  blueshieldca: SourceStatus;
  pecos: SourceStatus;
  license: SourceStatus;
  website: SourceStatus;
  caqh_inferred: SourceStatus;
}

export interface CredentialingTask {
  task_order: number;
  task_type: string;
  title: string;
  description: string;
  status: 'active' | 'pending';
  metadata: Record<string, any>;
}

export interface AssessmentOutput {
  assessment: AssessmentResult;
  tasks: CredentialingTask[];
  estimated_completion_weeks: number;
  bottleneck: string | null;
  summary: string;
}

// ─── Payer config ────────────────────────────────────────────────────────────

const PAYER_CODES: Record<string, string> = {
  uhc: 'uhc',
  aetna: 'aetna',
  cigna: 'cigna',
  humana: 'humana',
  bcbstx: 'bcbs_tx',       // DB uses bcbs_tx, we display as bcbstx
  blueshieldca: 'bcbs_ca',  // DB uses bcbs_ca, we display as blueshieldca
};

const CAQH_PAYERS = ['uhc', 'aetna']; // These pull from CAQH automatically

// ─── Assessment engine ──────────────────────────────────────────────────────

export async function runCredentialingAssessment(
  supabase: SupabaseClient,
  npi: string,
  practiceId: string,
  practiceAddress?: string,
): Promise<AssessmentOutput> {

  // 1. Fetch provider's NPPES data
  const { data: provider } = await supabase
    .from('providers')
    .select('npi, first_name, last_name, address_line_1, city, state, zip_code, phone, taxonomy_desc')
    .eq('npi', npi)
    .maybeSingle();

  // 2. Fetch practice address for comparison
  const { data: practice } = await supabase
    .from('practice_websites')
    .select('name, address, city, state')
    .eq('id', practiceId)
    .maybeSingle();

  // 3. Fetch all payer directory snapshots for this NPI (latest per payer)
  const { data: payerSnapshots } = await supabase
    .from('payer_directory_snapshots')
    .select('payer_code, listed_address_line1, listed_city, listed_state, listed_phone, snapshot_date')
    .eq('npi', npi)
    .order('snapshot_date', { ascending: false });

  // Group snapshots by payer (latest only)
  const latestByPayer: Record<string, any> = {};
  for (const snap of (payerSnapshots || [])) {
    if (!latestByPayer[snap.payer_code]) {
      latestByPayer[snap.payer_code] = snap;
    }
  }

  // 4. Check if provider already has a practice_providers entry (license data)
  const { data: pp } = await supabase
    .from('practice_providers')
    .select('has_license_issue, license_issue_type, website_found')
    .eq('npi', npi)
    .eq('practice_website_id', practiceId)
    .maybeSingle();

  // ── Build assessment ──────────────────────────────────────────────────────

  const practiceAddr = (practice?.address || practiceAddress || '').toLowerCase();
  const providerAddr = (provider?.address_line_1 || '').toLowerCase();

  // NPPES: does provider's address match practice?
  const nppesStatus: SourceStatus = !provider
    ? 'not_checked'
    : practiceAddr && providerAddr && providerAddr.includes(practiceAddr.slice(0, 10))
      ? 'listed_correct'
      : 'needs_update';

  // Per-payer assessment
  function assessPayer(payerKey: string): SourceStatus {
    const dbCode = PAYER_CODES[payerKey];
    const snap = latestByPayer[dbCode];
    if (!snap) return 'not_listed';
    // Check if the listed address is the practice address
    const snapAddr = (snap.listed_address_line1 || '').toLowerCase();
    if (practiceAddr && snapAddr && snapAddr.includes(practiceAddr.slice(0, 10))) {
      return 'listed_correct';
    }
    return 'wrong_address';
  }

  const assessment: AssessmentResult = {
    nppes: nppesStatus,
    uhc: assessPayer('uhc'),
    aetna: assessPayer('aetna'),
    cigna: assessPayer('cigna'),
    humana: assessPayer('humana'),
    bcbstx: assessPayer('bcbstx'),
    blueshieldca: assessPayer('blueshieldca'),
    pecos: (await verifyPecosEnrollment(supabase, npi, practice?.state)).status,
    license: pp?.has_license_issue ? 'expired' : 'active',
    website: 'not_listed', // New provider won't be on website yet
    caqh_inferred: determineCaqhStaleness(latestByPayer),
  };

  // ── Generate tasks from assessment ────────────────────────────────────────

  const tasks = generateTasksFromAssessment(assessment, practice);
  const bottleneck = findBottleneck(tasks);
  const estWeeks = estimateCompletionWeeks(tasks);
  const taskCount = tasks.length;

  return {
    assessment,
    tasks,
    estimated_completion_weeks: estWeeks,
    bottleneck,
    summary: `New provider onboarding — ${taskCount} tasks generated`,
  };
}

// ─── CAQH staleness inference ────────────────────────────────────────────────

function determineCaqhStaleness(latestByPayer: Record<string, any>): SourceStatus {
  // If we have payer data from CAQH-pulling payers, check age
  const uhcSnap = latestByPayer['uhc'];
  const aetnaSnap = latestByPayer['aetna'];
  const newest = uhcSnap?.snapshot_date || aetnaSnap?.snapshot_date;
  if (!newest) return 'not_checked';
  const daysSince = Math.floor((Date.now() - new Date(newest).getTime()) / 86400000);
  if (daysSince > 120) return 'possibly_stale';
  return 'listed_correct';
}

// ─── Task generation with CAQH-first optimization ────────────────────────────

function generateTasksFromAssessment(
  assessment: AssessmentResult,
  practice: any,
): CredentialingTask[] {
  const tasks: CredentialingTask[] = [];
  let order = 1;

  // ── Group A: Immediate tasks ──────────────────────────────────────────────

  // NPPES correction
  if (assessment.nppes === 'needs_update') {
    tasks.push({
      task_order: order++,
      task_type: 'correction_nppes',
      title: 'Update NPPES with practice address',
      description: 'Submit address correction to NPPES portal — current address does not match practice',
      status: 'active', // First task is always active
      metadata: {
        group: 'immediate',
        portal_url: 'https://nppes.cms.hhs.gov/',
        artifact_type: 'nppes_correction_pdf',
        expected_field: 'address',
      },
    });
  }

  // CAQH update (CAQH-first optimization: one task fixes UHC + Aetna)
  const caqhPullPayers = CAQH_PAYERS.filter(p =>
    assessment[p as keyof AssessmentResult] === 'wrong_address' ||
    assessment[p as keyof AssessmentResult] === 'not_listed'
  );
  const needsCaqh = caqhPullPayers.length > 0 ||
    assessment.caqh_inferred === 'possibly_stale';

  if (needsCaqh) {
    tasks.push({
      task_order: order++,
      task_type: 'correction_caqh',
      title: 'Update CAQH ProView',
      description: `Add/update provider profile in CAQH with new practice info.${caqhPullPayers.length > 0 ? ` Updating CAQH will automatically fix ${caqhPullPayers.map(p => p.toUpperCase()).join(' and ')} listings.` : ''}`,
      status: tasks.length === 0 ? 'active' : 'pending',
      metadata: {
        group: 'immediate',
        portal_url: 'https://proview.caqh.org/',
        fixes_payers: caqhPullPayers,
        caqh_first: true,
      },
    });
  }

  // Website update (new provider always needs this)
  if (assessment.website === 'not_listed') {
    tasks.push({
      task_order: order++,
      task_type: 'update_website',
      title: 'Add provider to practice website',
      description: 'List provider with bio, photo, and specialty info on the practice website',
      status: tasks.length === 0 ? 'active' : 'pending',
      metadata: {
        group: 'immediate',
        website_url: practice?.url || null,
      },
    });
  }

  // ── Group B: Submit and wait ──────────────────────────────────────────────

  // PECOS enrollment / reassignment
  if (assessment.pecos === 'needs_reassignment') {
    tasks.push({
      task_order: order++,
      task_type: 'submit_pecos',
      title: 'Submit PECOS reassignment',
      description: 'Provider is Medicare-enrolled in a different state — reassign billing to this practice TIN. Expected: 30-60 days.',
      status: 'pending',
      metadata: {
        group: 'submit_wait',
        portal_url: 'https://pecos.cms.hhs.gov/',
        expected_days: 45,
      },
    });
  } else if (assessment.pecos === 'not_listed') {
    tasks.push({
      task_order: order++,
      task_type: 'submit_pecos',
      title: 'Enroll provider in Medicare (PECOS)',
      description: 'Provider NPI not found in PECOS enrollment data — submit Medicare enrollment application. Expected: 60-90 days.',
      status: 'pending',
      metadata: {
        group: 'submit_wait',
        portal_url: 'https://pecos.cms.hhs.gov/',
        expected_days: 75,
      },
    });
  }

  // Non-CAQH payer enrollments (Cigna, Humana, BCBS TX need direct applications)
  const directPayers: { key: string; name: string; url: string; expectedDays: number }[] = [
    { key: 'cigna', name: 'Cigna', url: 'https://cignaforhcp.cigna.com/', expectedDays: 60 },
    { key: 'humana', name: 'Humana', url: 'https://www.humana.com/provider/', expectedDays: 60 },
    { key: 'bcbstx', name: 'BCBS TX', url: 'https://essentials.availity.com/', expectedDays: 30 },
    { key: 'blueshieldca', name: 'Blue Shield CA', url: 'https://www.blueshieldca.com/en/provider', expectedDays: 45 },
  ];

  for (const payer of directPayers) {
    const status = assessment[payer.key as keyof AssessmentResult];
    if (status === 'not_listed' || status === 'wrong_address') {
      tasks.push({
        task_order: order++,
        task_type: 'submit_payer_enrollment',
        title: `Submit ${payer.name} credentialing application`,
        description: `Apply for provider enrollment with ${payer.name}. Expected: ${payer.expectedDays} days.`,
        status: 'pending',
        metadata: {
          group: 'submit_wait',
          payer: payer.key,
          portal_url: payer.url,
          expected_days: payer.expectedDays,
        },
      });
    }
  }

  // ── Group C: Automated monitoring ─────────────────────────────────────────

  // NPPES monitor (if correction needed)
  if (assessment.nppes === 'needs_update') {
    tasks.push({
      task_order: order++,
      task_type: 'monitor_nppes',
      title: 'Monitor NPPES for address update',
      description: 'Automated — checks NPPES weekly until address matches practice',
      status: 'pending',
      metadata: {
        group: 'monitoring',
        is_automated: true,
        source: 'nppes',
        expected_field: 'address',
      },
    });
  }

  // Payer directory monitors (for any payer that needs updating)
  const payersToMonitor: { key: string; label: string }[] = [];

  // CAQH-pull payers get monitors when CAQH is updated
  for (const p of caqhPullPayers) {
    payersToMonitor.push({ key: p, label: p.toUpperCase() });
  }

  // Direct payers get monitors when their applications are submitted
  for (const payer of directPayers) {
    const status = assessment[payer.key as keyof AssessmentResult];
    if (status === 'not_listed' || status === 'wrong_address') {
      payersToMonitor.push({ key: payer.key, label: payer.name });
    }
  }

  for (const payer of payersToMonitor) {
    tasks.push({
      task_order: order++,
      task_type: 'monitor_payer_directory',
      title: `Monitor ${payer.label} directory for update`,
      description: `Automated — checks ${payer.label} FHIR weekly for listing update`,
      status: 'pending',
      metadata: {
        group: 'monitoring',
        is_automated: true,
        source: payer.key,
        payer: payer.key,
      },
    });
  }

  return tasks;
}

// ─── Bottleneck detection ────────────────────────────────────────────────────

function findBottleneck(tasks: CredentialingTask[]): string | null {
  // Find the task with the longest expected_days
  let maxDays = 0;
  let bottleneck: string | null = null;

  for (const t of tasks) {
    const days = t.metadata?.expected_days || 0;
    if (days > maxDays) {
      maxDays = days;
      bottleneck = t.metadata?.payer || t.task_type;
    }
  }

  return bottleneck;
}

// ─── Completion estimate ─────────────────────────────────────────────────────

function estimateCompletionWeeks(tasks: CredentialingTask[]): number {
  const maxDays = Math.max(
    14, // minimum 2 weeks
    ...tasks.map(t => t.metadata?.expected_days || 0),
  );
  return Math.ceil(maxDays / 7);
}
