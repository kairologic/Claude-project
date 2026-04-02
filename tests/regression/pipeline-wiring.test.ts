/**
 * Pipeline Wiring Smoke Tests
 *
 * These tests verify that critical pipeline connections exist in source code.
 * They catch the "function exists but isn't called" class of bugs by reading
 * the actual source files and asserting import/call patterns.
 *
 * These run in <1 second with zero DB dependency.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

test.describe('Pipeline Wiring: scan-scheduler.ts', () => {
  const src = readSource('lib/scanner/scan-scheduler.ts');

  test('imports runDeltaDetection from delta-engine', () => {
    expect(src).toMatch(/import.*runDeltaDetection.*from.*delta-engine/);
  });

  test('calls runDeltaDetection(site.id) in scan pipeline', () => {
    expect(src).toMatch(/runDeltaDetection\s*\(\s*site\.id\s*\)/);
  });

  test('imports all workflow triggers', () => {
    expect(src).toMatch(/triggerWorkflowsForPractice/);
    expect(src).toMatch(/triggerPayerDirectoryWorkflows/);
    expect(src).toMatch(/triggerLicenseRenewalWorkflows/);
    expect(src).toMatch(/triggerComplianceWorkflows/);
  });

  test('delta_count is in ScanResult interface (not hardcoded to 0)', () => {
    expect(src).toMatch(/delta_count:\s*result\.delta_count/);
    expect(src).not.toMatch(/delta_count:\s*0,\s*\/\/\s*updated by delta engine/);
  });
});

test.describe('Pipeline Wiring: practice-scan/route.ts', () => {
  const src = readSource('app/api/admin/practice-scan/route.ts');

  test('passes refresh: true to payer sync', () => {
    expect(src).toMatch(/refresh:\s*true/);
  });

  test('supports action "both" for scan + sync', () => {
    expect(src).toMatch(/action.*===.*'both'/);
  });
});

test.describe('Pipeline Wiring: practice-payer-sync/route.ts', () => {
  const src = readSource('app/api/admin/practice-payer-sync/route.ts');

  test('imports PayerDirectoryLookup for SCRAPE routing', () => {
    expect(src).toMatch(/import.*PayerDirectoryLookup.*from/);
  });

  test('routes SCRAPE: endpoints through PayerDirectoryLookup', () => {
    expect(src).toMatch(/fhir_base_url\.startsWith\s*\(\s*'SCRAPE:'\s*\)/);
  });

  test('has payer alias mapping for bcbs variants', () => {
    expect(src).toMatch(/PAYER_ALIASES/);
    expect(src).toMatch(/bcbs.*bcbs_tx/);
  });

  test('uses expandedAcceptedPayers for acceptance gap detection', () => {
    expect(src).toMatch(/expandedAcceptedPayers/);
  });
});

test.describe('Pipeline Wiring: dashboard practice page', () => {
  const src = readSource('app/(dashboard)/practice/[id]/page.tsx');

  test('queries payer_directory_mismatches from DB (not hardcoded)', () => {
    expect(src).toMatch(/payer_directory_mismatches/);
    expect(src).not.toMatch(/Payer sync status.*static for now/);
  });

  test('filters for PRACTICE-level mismatches', () => {
    expect(src).toMatch(/npi.*PRACTICE/);
  });
});

test.describe('Pipeline Wiring: trigger-workflows.ts', () => {
  const src = readSource('lib/scanner/trigger-workflows.ts');

  test('triggerPayerDirectoryWorkflows accepts optional mismatches (DB fallback)', () => {
    expect(src).toMatch(/mismatches\?\s*:/);
  });

  test('triggerLicenseRenewalWorkflows function exists', () => {
    expect(src).toMatch(/export async function triggerLicenseRenewalWorkflows/);
  });

  test('has payer_code in PayerMismatchInput interface', () => {
    expect(src).toMatch(/payer_code:\s*string/);
  });
});

test.describe('Pipeline Wiring: delta-engine.ts', () => {
  const src = readSource('lib/scanner/delta-engine.ts');

  test('exports runDeltaDetection function', () => {
    expect(src).toMatch(/export async function runDeltaDetection/);
  });

  test('assembles multi-source provider data for specialty comparison', () => {
    expect(src).toMatch(/web_specialty/);
    expect(src).toMatch(/nppes_taxonomy/);
  });

  test('sets has_taxonomy_mismatch flag', () => {
    expect(src).toMatch(/has_taxonomy_mismatch/);
  });

  test('creates delta events with verification_status', () => {
    expect(src).toMatch(/verification_status/);
    expect(src).toMatch(/stampDeltaEventVerification/);
  });
});
