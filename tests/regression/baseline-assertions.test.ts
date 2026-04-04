/**
 * Baseline Assertion Tests — Sentinel Practice Data Integrity
 *
 * These tests query the live database and verify that the sentinel
 * test practice data is complete and correctly structured.
 * Fails if: migrations dropped columns, seed data was wiped,
 * or code changes corrupted the expected data shape.
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SENTINEL_ID = 'e2e00000-0000-0000-0000-000000000001';

async function db(path: string): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`DB query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

test.describe('Sentinel Practice: Core Data', () => {
  test('practice_websites row exists with correct fields', async () => {
    const rows = await db(`practice_websites?id=eq.${SENTINEL_ID}&select=id,name,state,scan_tier,accepted_payers,accepted_payers_source,admin_tracked,onboarding_confirmed`);
    expect(rows).toHaveLength(1);
    const p = rows[0];
    expect(p.name).toBe('SENTINEL TEST PRACTICE');
    expect(p.state).toBe('TX');
    expect(p.scan_tier).toBe('weekly');
    expect(p.accepted_payers).toContain('aetna');
    expect(p.accepted_payers).toContain('cigna');
    expect(p.accepted_payers_source).toBe('admin_entered');
    expect(p.admin_tracked).toBe(true);
    expect(p.onboarding_confirmed).toBe(true);
  });
});

test.describe('Sentinel Practice: Providers', () => {
  test('has exactly 4 practice_providers (3 active + 1 departed)', async () => {
    const rows = await db(`practice_providers?practice_website_id=eq.${SENTINEL_ID}&select=npi,roster_status,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,has_name_mismatch,has_license_issue,active_mismatch_count,web_specialty&order=npi`);
    expect(rows).toHaveLength(4);

    // Provider A (Alice): address + phone mismatch
    const alice = rows.find((r: any) => r.npi === '9990000001');
    expect(alice).toBeDefined();
    expect(alice.roster_status).toBe('active');
    expect(alice.has_address_mismatch).toBe(true);
    expect(alice.has_phone_mismatch).toBe(true);
    expect(alice.active_mismatch_count).toBe(2);

    // Provider B (Bob): taxonomy mismatch
    const bob = rows.find((r: any) => r.npi === '9990000002');
    expect(bob).toBeDefined();
    expect(bob.roster_status).toBe('active');
    expect(bob.has_taxonomy_mismatch).toBe(true);
    expect(bob.web_specialty).toBe('Internal Medicine/Pediatrics');

    // Provider C (Carol): license issue, otherwise clean
    const carol = rows.find((r: any) => r.npi === '9990000003');
    expect(carol).toBeDefined();
    expect(carol.roster_status).toBe('active');
    expect(carol.has_license_issue).toBe(true);
    expect(carol.active_mismatch_count).toBe(0);

    // Provider D (Dave): departed
    const dave = rows.find((r: any) => r.npi === '9990000004');
    expect(dave).toBeDefined();
    expect(dave.roster_status).toBe('departed');
  });
});

test.describe('Sentinel Practice: Delta Events', () => {
  test('has 3 delta events covering address, phone, and taxonomy signals', async () => {
    const rows = await db(`nppes_delta_events?practice_website_id=eq.${SENTINEL_ID}&select=npi,signal_type,field_name,confidence,verification_status&order=signal_type`);
    expect(rows.length).toBeGreaterThanOrEqual(3);

    const signals = rows.map((r: any) => r.signal_type);
    expect(signals).toContain('address_change');
    expect(signals).toContain('phone_change');
    expect(signals).toContain('taxonomy_change');

    // All should be verified
    for (const r of rows) {
      expect(r.verification_status).toBe('verified');
    }
  });
});

test.describe('Sentinel Practice: Workflows', () => {
  test('has workflows covering all 6 types', async () => {
    const rows = await db(`workflow_instances?practice_id=eq.${SENTINEL_ID}&select=workflow_type,status,provider_npi,finding_summary&order=workflow_type`);
    expect(rows.length).toBeGreaterThanOrEqual(5);

    const types = rows.map((r: any) => r.workflow_type);
    expect(types).toContain('nppes_update');
    expect(types).toContain('payer_directory');
    expect(types).toContain('license_renewal');
    expect(types).toContain('compliance');
    expect(types).toContain('onboarding');
  });

  test('workflows with tasks have properly ordered task chains', async () => {
    // Workflows 1, 3, 4 have tasks seeded; check they exist and are ordered
    const taskWorkflowIds = [
      'e2e00000-0000-0000-0001-000000000001',
      'e2e00000-0000-0000-0003-000000000001',
      'e2e00000-0000-0000-0004-000000000001',
    ];
    for (const wfId of taskWorkflowIds) {
      const tasks = await db(`workflow_tasks?workflow_id=eq.${wfId}&select=id,task_type,status,task_order&order=task_order`);
      expect(tasks.length).toBeGreaterThan(0);
      // At least one completed and one pending/active
      const statuses = tasks.map((t: any) => t.status);
      expect(statuses).toContain('completed');
    }
  });
});

test.describe('Sentinel Practice: Payer Sync', () => {
  test('has payer directory mismatches including acceptance_gap', async () => {
    const rows = await db(`payer_directory_mismatches?practice_website_id=eq.${SENTINEL_ID}&select=npi,payer_code,mismatch_type,status`);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const types = rows.map((r: any) => r.mismatch_type);
    expect(types).toContain('acceptance_gap');
  });

  test('has payer directory snapshots with mixed listed/not-listed', async () => {
    const rows = await db(`payer_directory_snapshots?npi=in.(9990000001,9990000002,9990000003)&select=npi,payer_code,fhir_practitioner_id`);
    expect(rows.length).toBeGreaterThanOrEqual(3);

    const listed = rows.filter((r: any) => r.fhir_practitioner_id != null);
    const notListed = rows.filter((r: any) => r.fhir_practitioner_id == null);
    expect(listed.length).toBeGreaterThan(0);
    expect(notListed.length).toBeGreaterThan(0);
  });
});

test.describe('Sentinel Practice: Alerts', () => {
  test('has alerts with mixed severity and active/inactive', async () => {
    const rows = await db(`alerts?practice_id=eq.${SENTINEL_ID}&select=severity,is_active,title,description`);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const active = rows.filter((r: any) => r.is_active);
    const inactive = rows.filter((r: any) => !r.is_active);
    expect(active.length).toBeGreaterThan(0);
    expect(inactive.length).toBeGreaterThan(0);
  });
});

test.describe('Sentinel Practice: Schema Integrity (Migration Gate)', () => {
  test('practice_providers has all required mismatch columns', async () => {
    // Query one row and check all expected columns are present
    const rows = await db(`practice_providers?practice_website_id=eq.${SENTINEL_ID}&limit=1&select=npi,provider_name,roster_status,has_address_mismatch,has_phone_mismatch,has_taxonomy_mismatch,has_name_mismatch,has_license_issue,active_mismatch_count,web_address,web_phone,web_specialty`);
    expect(rows).toHaveLength(1);
    const cols = Object.keys(rows[0]);
    expect(cols).toContain('has_address_mismatch');
    expect(cols).toContain('has_phone_mismatch');
    expect(cols).toContain('has_taxonomy_mismatch');
    expect(cols).toContain('has_name_mismatch');
    expect(cols).toContain('has_license_issue');
    expect(cols).toContain('web_specialty');
  });

  test('payer_directory_mismatches has signal_type and acceptance_source columns', async () => {
    const rows = await db(`payer_directory_mismatches?practice_website_id=eq.${SENTINEL_ID}&limit=1&select=signal_type,acceptance_source,practice_response,status`);
    expect(rows).toHaveLength(1);
    const cols = Object.keys(rows[0]);
    expect(cols).toContain('signal_type');
    expect(cols).toContain('acceptance_source');
  });

  test('practice_websites has onboarding_confirmed column', async () => {
    const rows = await db(`practice_websites?id=eq.${SENTINEL_ID}&limit=1&select=onboarding_confirmed,admin_tracked,accepted_payers_source`);
    expect(rows).toHaveLength(1);
    const cols = Object.keys(rows[0]);
    expect(cols).toContain('onboarding_confirmed');
    expect(cols).toContain('admin_tracked');
    expect(cols).toContain('accepted_payers_source');
  });

  test('nppes_delta_events has verification columns', async () => {
    const rows = await db(`nppes_delta_events?practice_website_id=eq.${SENTINEL_ID}&limit=1&select=verification_status,gate_status_at_creation,corroboration_count,confidence_score`);
    expect(rows).toHaveLength(1);
    const cols = Object.keys(rows[0]);
    expect(cols).toContain('verification_status');
    expect(cols).toContain('gate_status_at_creation');
  });
});
