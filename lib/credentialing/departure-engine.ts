/**
 * lib/credentialing/departure-engine.ts
 *
 * Departure assessment engine (Layer 3).
 * Mirrors the onboarding assessment engine but for provider departure.
 * Checks which directories currently list the provider and generates
 * removal tasks + 90-day phantom monitoring.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPecosEnrollment } from './pecos-verification';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ListingStatus = 'listed' | 'not_listed' | 'not_checked';

export interface DepartureTask {
  task_order: number;
  task_type: string;
  title: string;
  description: string;
  status: 'active' | 'pending';
  metadata: {
    group: 'immediate' | 'submit_wait' | 'monitoring';
    portal_url?: string;
    payer_code?: string;
    expected_days?: number;
    monitoring_days?: number;
    [key: string]: any;
  };
}

export interface DepartureOutput {
  assessment: Record<string, ListingStatus>;
  tasks: DepartureTask[];
  summary: string;
  estimated_completion_weeks: number;
  directories_to_clear: number;
}

// ─── Payer config ────────────────────────────────────────────────────────────

const PAYER_CODES: Record<string, string> = {
  uhc: 'uhc',
  aetna: 'aetna',
  cigna: 'cigna',
  humana: 'humana',
  bcbstx: 'bcbs_tx',
  blueshieldca: 'bcbs_ca',
};

const CAQH_PAYERS = ['uhc', 'aetna']; // These pull from CAQH automatically

const PAYER_PORTALS: Record<string, { name: string; url: string; expectedDays: number }> = {
  cigna:  { name: 'Cigna',   url: 'https://cignaforhcp.cigna.com/', expectedDays: 30 },
  humana: { name: 'Humana',  url: 'https://www.humana.com/provider/', expectedDays: 30 },
  bcbstx: { name: 'BCBS TX', url: 'https://essentials.availity.com/', expectedDays: 21 },
  blueshieldca: { name: 'Blue Shield CA', url: 'https://www.blueshieldca.com/en/provider', expectedDays: 30 },
};

// ─── Departure assessment engine ─────────────────────────────────────────────

export async function runDepartureAssessment(
  supabase: SupabaseClient,
  npi: string,
  practiceId: string,
): Promise<DepartureOutput> {

  // 1. Fetch provider's NPPES data
  const { data: provider } = await supabase
    .from('providers')
    .select('npi, first_name, last_name, address_line_1, city, state, zip_code')
    .eq('npi', npi)
    .maybeSingle();

  // 2. Fetch practice address for comparison
  const { data: practice } = await supabase
    .from('practice_websites')
    .select('name, address, city, state')
    .eq('id', practiceId)
    .maybeSingle();

  // 3. Fetch latest payer directory snapshots
  const { data: payerSnapshots } = await supabase
    .from('payer_directory_snapshots')
    .select('payer_code, listed_address_line1, listed_city, listed_state, snapshot_date')
    .eq('npi', npi)
    .order('snapshot_date', { ascending: false });

  const latestByPayer: Record<string, any> = {};
  for (const snap of (payerSnapshots || [])) {
    if (!latestByPayer[snap.payer_code]) {
      latestByPayer[snap.payer_code] = snap;
    }
  }

  // ── Build assessment: which directories currently list this provider? ──

  const practiceAddr = (practice?.address || '').toLowerCase();
  const providerAddr = (provider?.address_line_1 || '').toLowerCase();

  // NPPES: does provider's NPI still reference this practice address?
  const nppesListed: ListingStatus = !provider
    ? 'not_checked'
    : practiceAddr && providerAddr && providerAddr.includes(practiceAddr.slice(0, 10))
      ? 'listed'
      : 'not_listed';

  // Per-payer: is provider listed at this practice address?
  function assessPayerListing(payerKey: string): ListingStatus {
    const dbCode = PAYER_CODES[payerKey];
    const snap = latestByPayer[dbCode];
    if (!snap) return 'not_listed';
    const snapAddr = (snap.listed_address_line1 || '').toLowerCase();
    if (practiceAddr && snapAddr && snapAddr.includes(practiceAddr.slice(0, 10))) {
      return 'listed';
    }
    return 'not_listed'; // Listed but at a different address — not our concern
  }

  const assessment: Record<string, ListingStatus> = {
    nppes: nppesListed,
    uhc: assessPayerListing('uhc'),
    aetna: assessPayerListing('aetna'),
    cigna: assessPayerListing('cigna'),
    humana: assessPayerListing('humana'),
    bcbstx: assessPayerListing('bcbstx'),
    pecos: (await verifyPecosEnrollment(supabase, npi, practice?.state)).enrolled ? 'listed' : 'not_listed',
    website: 'listed',    // Assume provider is on website until verified
  };

  // Count directories that need clearing
  const directoriesToClear = Object.values(assessment).filter(v => v === 'listed').length;

  // ── Generate departure tasks ───────────────────────────────────────────

  const tasks = generateDepartureTasks(assessment);

  return {
    assessment,
    tasks,
    summary: `Provider departure — ${directoriesToClear} directories to clear, ${tasks.length} tasks`,
    estimated_completion_weeks: Math.ceil(90 / 7), // 90-day monitoring is always the long pole
    directories_to_clear: directoriesToClear,
  };
}

// ─── Task generation ─────────────────────────────────────────────────────────

function generateDepartureTasks(
  assessment: Record<string, ListingStatus>,
): DepartureTask[] {
  const tasks: DepartureTask[] = [];
  let order = 1;

  // ── Group A: Immediate tasks ──────────────────────────────────────────

  // Always remove from website
  tasks.push({
    task_order: order++,
    task_type: 'remove_website',
    title: 'Remove provider from practice website',
    description: 'Remove provider listing, bio, and photo from "Our Team" and provider directory pages.',
    status: 'active',
    metadata: { group: 'immediate' },
  });

  // NPPES removal (only if listed at this practice)
  if (assessment.nppes === 'listed') {
    tasks.push({
      task_order: order++,
      task_type: 'correction_nppes',
      title: 'Remove practice address from NPPES',
      description: 'Update NPPES to remove this practice location from the provider NPI record.',
      status: 'pending',
      metadata: {
        group: 'immediate',
        portal_url: 'https://nppes.cms.hhs.gov/',
      },
    });
  }

  // CAQH update — CAQH-first optimization: updating CAQH de-lists from UHC + Aetna
  const caqhPullersListed = CAQH_PAYERS.filter(p => assessment[p] === 'listed');
  if (caqhPullersListed.length > 0) {
    tasks.push({
      task_order: order++,
      task_type: 'correction_caqh',
      title: 'Update CAQH ProView — departure',
      description: `Update CAQH to reflect provider departure from this practice.${caqhPullersListed.length > 0 ? ` This will automatically de-list from ${caqhPullersListed.map(p => p.toUpperCase()).join(' and ')}.` : ''}`,
      status: 'pending',
      metadata: {
        group: 'immediate',
        portal_url: 'https://proview.caqh.org/',
        fixes_payers: caqhPullersListed,
        caqh_first: true,
      },
    });
  }

  // ── Group B: Submit and wait ──────────────────────────────────────────

  // Direct payer removal notifications (Cigna, Humana, BCBS TX)
  for (const [payerKey, portal] of Object.entries(PAYER_PORTALS)) {
    if (assessment[payerKey] === 'listed') {
      tasks.push({
        task_order: order++,
        task_type: 'submit_payer_removal',
        title: `Notify ${portal.name} — provider departure`,
        description: `Contact ${portal.name} to remove provider from this practice's listing. Expected: ${portal.expectedDays} days.`,
        status: 'pending',
        metadata: {
          group: 'submit_wait',
          payer_code: payerKey,
          portal_url: portal.url,
          expected_days: portal.expectedDays,
        },
      });
    }
  }

  // PECOS termination (only if provider is confirmed enrolled)
  if (assessment.pecos === 'listed') {
    tasks.push({
      task_order: order++,
      task_type: 'submit_pecos_termination',
      title: 'Submit PECOS reassignment termination',
      description: 'Terminate provider Medicare reassignment to this practice TIN. Expected: 30-60 days.',
      status: 'pending',
      metadata: {
        group: 'submit_wait',
        portal_url: 'https://pecos.cms.hhs.gov/',
        expected_days: 45,
      },
    });
  }

  // ── Group C: 90-day phantom monitoring ─────────────────────────────────

  // Create monitors for every directory that was listed (or checked)
  const monitorSources: { key: string; label: string }[] = [];

  if (assessment.nppes === 'listed') {
    monitorSources.push({ key: 'nppes', label: 'NPPES' });
  }
  for (const p of CAQH_PAYERS) {
    if (assessment[p] === 'listed') {
      monitorSources.push({ key: p, label: p.toUpperCase() });
    }
  }
  for (const [payerKey, portal] of Object.entries(PAYER_PORTALS)) {
    if (assessment[payerKey] === 'listed') {
      monitorSources.push({ key: payerKey, label: portal.name });
    }
  }

  // One consolidated phantom monitoring task
  if (monitorSources.length > 0) {
    tasks.push({
      task_order: order++,
      task_type: 'monitor_phantom',
      title: '90-day phantom listing monitoring',
      description: `Automated — checks ${monitorSources.map(s => s.label).join(', ')} weekly for 90 days to verify provider removal. Auto-closes after 90 days if all clear.`,
      status: 'pending',
      metadata: {
        group: 'monitoring',
        is_automated: true,
        monitoring_days: 90,
        sources: monitorSources.map(s => s.key),
        expected_days: 90,
      },
    });
  }

  return tasks;
}
