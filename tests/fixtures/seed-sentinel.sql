-- SENTINEL TEST PRACTICE
-- ID: e2e00000-0000-0000-0000-000000000001
-- Designed to cover every workflow type, delta signal, mismatch flag, and compliance finding.
-- This data must NEVER be modified outside of this seed file.

-- Clean previous seed data (idempotent)
DELETE FROM workflow_events WHERE workflow_id IN (SELECT id FROM workflow_instances WHERE practice_id = 'e2e00000-0000-0000-0000-000000000001');
DELETE FROM workflow_tasks WHERE workflow_id IN (SELECT id FROM workflow_instances WHERE practice_id = 'e2e00000-0000-0000-0000-000000000001');
DELETE FROM workflow_instances WHERE practice_id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM alerts WHERE practice_id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM nppes_delta_events WHERE practice_website_id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM payer_directory_mismatches WHERE practice_website_id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM payer_directory_snapshots WHERE npi IN ('9990000001','9990000002','9990000003','9990000004');
DELETE FROM practice_providers WHERE practice_website_id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM practice_websites WHERE id = 'e2e00000-0000-0000-0000-000000000001';
DELETE FROM providers WHERE npi IN ('9990000001','9990000002','9990000003','9990000004');

-- Insert practice_websites
INSERT INTO practice_websites (id, name, url, state, scan_tier, scan_status, last_scan_at, accepted_payers, accepted_payers_source, admin_tracked, provider_count, onboarding_confirmed, created_at, updated_at)
VALUES (
  'e2e00000-0000-0000-0000-000000000001',
  'SENTINEL TEST PRACTICE',
  'https://sentinel-test.example.com',
  'TX',
  'weekly',
  'healthy',
  now(),
  ARRAY['aetna','cigna','uhc','bcbs']::text[],
  'admin_entered',
  true,
  3,
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  scan_tier = EXCLUDED.scan_tier,
  scan_status = EXCLUDED.scan_status,
  last_scan_at = EXCLUDED.last_scan_at,
  accepted_payers = EXCLUDED.accepted_payers,
  accepted_payers_source = EXCLUDED.accepted_payers_source,
  admin_tracked = EXCLUDED.admin_tracked,
  provider_count = EXCLUDED.provider_count,
  onboarding_confirmed = EXCLUDED.onboarding_confirmed,
  updated_at = now();

-- Insert providers (NPPES records)
INSERT INTO providers (npi, entity_type_code, first_name, last_name, credential, organization_name, primary_taxonomy_code, taxonomy_desc, address_line_1, address_line_2, city, state, zip_code, phone, fax, created_at, last_updated_at)
VALUES
  ('9990000001', '1', 'ALICE', 'SENTINEL', '', NULL, '207Q00000X', 'Family Medicine', '100 MAIN ST', '', 'AUSTIN', 'TX', '78701', '5120000001', '', now(), now()),
  ('9990000002', '1', 'BOB', 'SENTINEL', '', NULL, '207R00000X', 'Internal Medicine', '200 OAK AVE', '', 'DALLAS', 'TX', '75201', '2140000002', '', now(), now()),
  ('9990000003', '1', 'CAROL', 'SENTINEL', '', NULL, '207Q00000X', 'Family Medicine', '100 MAIN ST', '', 'AUSTIN', 'TX', '78701', '5120000003', '', now(), now()),
  ('9990000004', '1', 'DAVE', 'SENTINEL', '', NULL, '208000000X', 'Pediatrics', '300 ELM ST', '', 'HOUSTON', 'TX', '77001', '7130000004', '', now(), now())
ON CONFLICT (npi) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  primary_taxonomy_code = EXCLUDED.primary_taxonomy_code,
  taxonomy_desc = EXCLUDED.taxonomy_desc,
  address_line_1 = EXCLUDED.address_line_1,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  last_updated_at = now();

-- Insert practice_providers (roster with mismatches)
INSERT INTO practice_providers (
  practice_website_id, npi, provider_name, roster_status,
  has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue,
  active_mismatch_count,
  web_address, web_phone, web_specialty,
  created_at, updated_at
)
VALUES
  -- Alice: address + phone mismatch
  ('e2e00000-0000-0000-0000-000000000001', '9990000001', 'ALICE SENTINEL', 'active',
   true, true, false, false, false,
   2,
   '100 CONGRESS AVE, AUSTIN TX 78701', '5129999999', 'Family Medicine',
   now(), now()),
  -- Bob: taxonomy mismatch
  ('e2e00000-0000-0000-0000-000000000001', '9990000002', 'BOB SENTINEL', 'active',
   false, false, true, false, false,
   1,
   '200 OAK AVE, DALLAS TX 75201', '2140000002', 'Internal Medicine/Pediatrics',
   now(), now()),
  -- Carol: license issue, otherwise clean
  ('e2e00000-0000-0000-0000-000000000001', '9990000003', 'CAROL SENTINEL', 'active',
   false, false, false, false, true,
   0,
   '100 MAIN ST, AUSTIN TX 78701', '5120000003', 'Family Medicine',
   now(), now()),
  -- Dave: departed
  ('e2e00000-0000-0000-0000-000000000001', '9990000004', 'DAVE SENTINEL', 'departed',
   false, false, false, false, false,
   0,
   '300 ELM ST, HOUSTON TX 77001', '7130000004', 'Pediatrics',
   now(), now())
ON CONFLICT (practice_website_id, npi) DO UPDATE SET
  provider_name = EXCLUDED.provider_name,
  roster_status = EXCLUDED.roster_status,
  has_address_mismatch = EXCLUDED.has_address_mismatch,
  has_phone_mismatch = EXCLUDED.has_phone_mismatch,
  has_taxonomy_mismatch = EXCLUDED.has_taxonomy_mismatch,
  has_name_mismatch = EXCLUDED.has_name_mismatch,
  has_license_issue = EXCLUDED.has_license_issue,
  active_mismatch_count = EXCLUDED.active_mismatch_count,
  web_address = EXCLUDED.web_address,
  web_phone = EXCLUDED.web_phone,
  web_specialty = EXCLUDED.web_specialty,
  updated_at = now();

-- Insert nppes_delta_events (3 signals covering address, phone, taxonomy)
-- No composite unique constraint exists, so we rely on DELETE cleanup above
INSERT INTO nppes_delta_events (
  practice_website_id, npi, signal_type, field_name, old_value, new_value,
  confidence, detection_source, verification_status, gate_status_at_creation,
  corroboration_count, detected_at, created_at
)
VALUES
  -- Address change for Alice
  ('e2e00000-0000-0000-0000-000000000001', '9990000001',
   'address_change', 'address_line_1',
   '100 MAIN ST', '100 CONGRESS AVE, AUSTIN TX 78701',
   'MEDIUM', 'web_scan', 'verified', 'passed',
   1, now(), now()),
  -- Phone change for Alice
  ('e2e00000-0000-0000-0000-000000000001', '9990000001',
   'phone_change', 'phone',
   '5120000001', '5129999999',
   'MEDIUM', 'web_scan', 'verified', 'passed',
   1, now(), now()),
  -- Taxonomy change for Bob
  ('e2e00000-0000-0000-0000-000000000001', '9990000002',
   'taxonomy_change', 'specialty',
   'nppes: Internal Medicine', 'website: Internal Medicine/Pediatrics',
   'HIGH', 'web_scan', 'verified', 'passed',
   2, now(), now());

-- Insert workflow_instances (6 workflows covering all types)
INSERT INTO workflow_instances (
  id, practice_id, workflow_type, status, provider_npi, finding_summary, created_at, updated_at
)
VALUES
  -- 1. NPPES update workflow
  ('e2e00000-0000-0000-0001-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'nppes_update', 'action_needed', '9990000001',
   'Address mismatch detected', now(), now()),
  -- 2. Payer directory workflow
  ('e2e00000-0000-0000-0002-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'payer_directory', 'action_needed', '9990000001',
   'Not listed in Cigna directory', now(), now()),
  -- 3. License renewal workflow
  ('e2e00000-0000-0000-0003-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'license_renewal', 'action_needed', '9990000003',
   'License expiring within 90 days', now(), now()),
  -- 4. Compliance workflow
  ('e2e00000-0000-0000-0004-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'compliance', 'action_needed', NULL,
   'SB 1188 violation: foreign data routing', now(), now()),
  -- 5. Onboarding workflow
  ('e2e00000-0000-0000-0005-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'onboarding', 'resolved', '9990000003',
   'Provider onboarding complete', now(), now()),
  -- 6. Taxonomy change workflow (nppes_update variant)
  ('e2e00000-0000-0000-0006-000000000001', 'e2e00000-0000-0000-0000-000000000001',
   'nppes_update', 'action_needed', '9990000002',
   'Specialty mismatch detected', now(), now())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  finding_summary = EXCLUDED.finding_summary,
  updated_at = now();

-- Insert workflow_tasks for workflow 1 (nppes_update / Alice / address)
INSERT INTO workflow_tasks (
  id, workflow_id, task_order, task_type, title, status, created_at, updated_at
)
VALUES
  ('e2e00000-0000-0000-0001-000000000101', 'e2e00000-0000-0000-0001-000000000001', 1, 'review_finding', 'Review address mismatch finding', 'completed', now(), now()),
  ('e2e00000-0000-0000-0001-000000000102', 'e2e00000-0000-0000-0001-000000000001', 2, 'download_form', 'Download NPPES update form', 'active', now(), now()),
  ('e2e00000-0000-0000-0001-000000000103', 'e2e00000-0000-0000-0001-000000000001', 3, 'submit_nppes', 'Submit NPPES update', 'pending', now(), now()),
  ('e2e00000-0000-0000-0001-000000000104', 'e2e00000-0000-0000-0001-000000000001', 4, 'monitor_sync', 'Monitor NPPES sync confirmation', 'pending', now(), now())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

-- Insert workflow_tasks for workflow 3 (license_renewal / Carol)
INSERT INTO workflow_tasks (
  id, workflow_id, task_order, task_type, title, status, created_at, updated_at
)
VALUES
  ('e2e00000-0000-0000-0003-000000000301', 'e2e00000-0000-0000-0003-000000000001', 1, 'review_finding', 'Review license expiration finding', 'completed', now(), now()),
  ('e2e00000-0000-0000-0003-000000000302', 'e2e00000-0000-0000-0003-000000000001', 2, 'submit_renewal', 'Submit license renewal application', 'active', now(), now()),
  ('e2e00000-0000-0000-0003-000000000303', 'e2e00000-0000-0000-0003-000000000001', 3, 'update_credentials', 'Update credentialing records', 'pending', now(), now()),
  ('e2e00000-0000-0000-0003-000000000304', 'e2e00000-0000-0000-0003-000000000001', 4, 'monitor_auto_confirm', 'Monitor auto-confirmation', 'pending', now(), now())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

-- Insert workflow_tasks for workflow 4 (compliance)
INSERT INTO workflow_tasks (
  id, workflow_id, task_order, task_type, title, status, created_at, updated_at
)
VALUES
  ('e2e00000-0000-0000-0004-000000000401', 'e2e00000-0000-0000-0004-000000000001', 1, 'show_finding', 'Review compliance finding', 'completed', now(), now()),
  ('e2e00000-0000-0000-0004-000000000402', 'e2e00000-0000-0000-0004-000000000001', 2, 'provide_template', 'Provide remediation template', 'active', now(), now()),
  ('e2e00000-0000-0000-0004-000000000403', 'e2e00000-0000-0000-0004-000000000001', 3, 'rescan_confirm', 'Rescan and confirm resolution', 'pending', now(), now())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

-- Insert payer_directory_mismatches (3 mismatches)
-- No composite unique constraint exists, so we rely on DELETE cleanup above
INSERT INTO payer_directory_mismatches (
  practice_website_id, npi, payer_code, mismatch_type, status, field_name,
  first_detected_at, last_detected_at, detection_count, created_at, updated_at
)
VALUES
  -- Cigna acceptance gap at practice level
  ('e2e00000-0000-0000-0000-000000000001', 'PRACTICE', 'cigna',
   'acceptance_gap', 'open', 'payer_acceptance',
   now(), now(), 1, now(), now()),
  -- Alice address mismatch with Aetna
  ('e2e00000-0000-0000-0000-000000000001', '9990000001', 'aetna',
   'value_differs', 'open', 'address',
   now(), now(), 1, now(), now()),
  -- Bob not listed in UHC
  ('e2e00000-0000-0000-0000-000000000001', '9990000002', 'uhc',
   'not_listed', 'open', 'listing_status',
   now(), now(), 1, now(), now());

-- Insert payer_directory_snapshots (mixed listed/not-listed)
-- Unique index: payer_snapshot_unique ON (npi, payer_code, snapshot_date)
INSERT INTO payer_directory_snapshots (
  npi, payer_code, snapshot_date, fhir_practitioner_id, listed_name_full, consecutive_not_listed_count, created_at
)
VALUES
  -- Alice listed in Aetna
  ('9990000001', 'aetna', CURRENT_DATE, 'test-fhir-001', 'ALICE SENTINEL', 0, now()),
  -- Alice NOT listed in Cigna (3 consecutive)
  ('9990000001', 'cigna', CURRENT_DATE, NULL, NULL, 3, now()),
  -- Bob NOT listed in UHC (2 consecutive)
  ('9990000002', 'uhc', CURRENT_DATE, NULL, NULL, 2, now()),
  -- Carol listed in Aetna
  ('9990000003', 'aetna', CURRENT_DATE, 'test-fhir-003', 'CAROL SENTINEL', 0, now())
ON CONFLICT (npi, payer_code, snapshot_date) DO UPDATE SET
  fhir_practitioner_id = EXCLUDED.fhir_practitioner_id,
  listed_name_full = EXCLUDED.listed_name_full,
  consecutive_not_listed_count = EXCLUDED.consecutive_not_listed_count;

-- Insert alerts (mixed severity and active/inactive)
-- alerts table uses title + description, not message
INSERT INTO alerts (
  practice_id, severity, title, description, provider_npi, provider_name, source, is_active, created_at
)
VALUES
  -- Action alert (active)
  ('e2e00000-0000-0000-0000-000000000001', 'action',
   'Address mismatch', 'Address mismatch detected for Alice Sentinel (NPI 9990000001)',
   '9990000001', 'ALICE SENTINEL', 'delta_engine', true, now()),
  -- Warning alert (active)
  ('e2e00000-0000-0000-0000-000000000001', 'warning',
   'Specialty mismatch', 'Specialty mismatch detected for Bob Sentinel (NPI 9990000002)',
   '9990000002', 'BOB SENTINEL', 'delta_engine', true, now()),
  -- Info alert (inactive / resolved)
  ('e2e00000-0000-0000-0000-000000000001', 'info',
   'Onboarding complete', 'Provider onboarding complete for Carol Sentinel (NPI 9990000003)',
   '9990000003', 'CAROL SENTINEL', 'onboarding', false, now())
ON CONFLICT DO NOTHING;
