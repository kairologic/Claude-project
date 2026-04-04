-- ============================================================
-- BRUSHY CREEK FAMILY PHYSICIANS - BASELINE SNAPSHOT
-- Taken: 2026-03-29 (before test/validation changes)
-- Practice ID: 5d195c8b-7f3c-498e-b5cf-24a7c0f8a215
-- ============================================================
-- Run this script to revert Brushy Creek to its pre-testing state.

BEGIN;

-- 1. Restore practice_websites row
UPDATE practice_websites SET
  accepted_payers = ARRAY['aetna','cigna','uhc','humana','bcbs','tricare','medicare','curative'],
  accepted_payers_source = 'admin_entered',
  accepted_payers_extracted_at = '2026-03-29 14:38:52.932006+00',
  mismatch_count = 5,
  provider_count = 20,
  scan_status = 'healthy',
  admin_tracked = true
WHERE id = '5d195c8b-7f3c-498e-b5cf-24a7c0f8a215';

-- 2. Delete any mismatches created during testing, then restore baseline (empty)
DELETE FROM payer_directory_mismatches
WHERE practice_website_id = '5d195c8b-7f3c-498e-b5cf-24a7c0f8a215';
-- (No open mismatches at baseline - they were cleared in prior session)

-- 3. Delete any snapshots created during testing, then restore baseline snapshots
-- First delete all snapshots for Brushy Creek NPIs
DELETE FROM payer_directory_snapshots
WHERE npi IN (
  '1063489102','1073519088','1245420108','1285630863','1295737245',
  '1457468373','1457586307','1578542460','1629073929','1669474623',
  '1700963824','1730300211','1750589610','1801816715','1801865142',
  '1801919881','1811934649','1821175951','1831188572','1861494924'
);

-- Re-insert baseline snapshots (69 rows total)
-- Humana LISTED (11 providers with fhir_practitioner_id):
INSERT INTO payer_directory_snapshots (npi, payer_code, fhir_practitioner_id, listed_name_full, listed_phone, listed_address_line1, listed_city, listed_state, listed_zip, listed_specialty_display, consecutive_not_listed_count, snapshot_date, created_at)
VALUES
  ('1245420108','humana','403dd614191911bf03e288944b8211550285ec89099e4feca033c1642783524f','Daniel, Steven DO','5122441995','7200 Wyoming Springs Dr, Ste 600','Round Rock','TX','78681','Family Medicine Physician (PCP)',0,'2026-03-29','2026-03-29 04:33:19.402178+00'),
  ('1295737245','humana','c9b560eda7f640fa607232af0e8d5bdc7062836216c69b58a37023f01eafa445','Putney, Christopher G MD','5122441995','7200 Wyoming Springs Dr, Ste 600','Round Rock','TX','78681','Family Medicine Physician (PCP)',0,'2026-03-29','2026-03-29 04:33:23.431437+00'),
  ('1578542460','humana','9e0105ab2c6e9adf33b2039556a4712cc531c55953165558b6ccb71c7209deae','Longoria, Mario A MD','5122440111','7200 Wyoming Springs Dr, Ste 500','Round Rock','TX','78681','Surgery Physician',0,'2026-03-29','2026-03-29 04:33:38.5298+00'),
  ('1629073929','humana','64c9fc5eda14b98683f0e92268d70304aeab73d6a7484e7d0a57fa993213421b','Boyd Jr, James A MD','5122441995','7200 Wyoming Springs Dr, Ste 600','Round Rock','TX','78681','Family Medicine Physician (PCP)',0,'2026-03-29','2026-03-29 04:33:30.089006+00'),
  ('1669474623','humana','9aae6ce58741e823002bc269ce1f47199f189eeecbf63459ef038196d81467c9','Deshazo, Flint K MD','5122441995','7200 Wyoming Springs Dr, Ste 600','Round Rock','TX','78681','Family Medicine Physician (Specialist)',0,'2026-03-29','2026-03-29 04:33:27.537925+00'),
  ('1730300211','humana','27cd2593d9bd61c27d888e56db7e6a2216dba16ba3ef868a8d2e8d098a76158b','Runyan, Bratcher L MD','5122440111','7200 Wyoming Springs Dr, Ste 500','Round Rock','TX','78681','Surgery Physician',0,'2026-03-29','2026-03-29 04:33:15.243979+00'),
  ('1750589610','humana','95224754b7d4e53f369c4d8ebb721f0e5f745fce51ebc777c54a351822a98e2e','Meyers, Kevin P MD','8655885121','1311 Dowell Springs Blvd','Knoxville','TN','37909','Internal Medicine Physician (Specialist)',0,'2026-03-29','2026-03-29 04:33:17.212455+00'),
  ('1801816715','humana','883f8c3093418674ffdf25ed4eb8166d131b6d54bf3c050eefa2071bc6b5b826','Peckham, Russell M DO','5122605860','1515 Medical Pkwy, Ste 100','Cedar Park','TX','78613','Dermatology Physician',0,'2026-03-29','2026-03-29 04:33:45.018991+00'),
  ('1801865142','humana','3d086f59282f3416785ccf4c154ec920b01e1a0cfa56e6a95a9ed7264f0e08d2','Long, Chad J MD','5122442273','1401 Medical Pkwy, Ste 324','Cedar Park','TX','78613','Gastroenterology Physician',0,'2026-03-29','2026-03-29 04:33:42.677918+00'),
  ('1801919881','humana','90a4016e21c58177734728b247937043905b0a72504741e58e1a6a9d42f1a233','Hawthorne, Andy L MD','5122440111','7200 Wyoming Springs Dr, Ste 500','Round Rock','TX','78681','Surgery Physician',0,'2026-03-29','2026-03-29 04:33:12.625502+00'),
  ('1831188572','humana','5dd1549fbf3420e5fe61f1da1bf9bf1ae0bdd406c0ba2b82a729c1c2bd2acedd','Chambless, Terry C MD','5125881439','7200 Wyoming Springs Dr, Ste 1600','Round Rock','TX','78681','Internal Medicine Physician (PCP)',0,'2026-03-29','2026-03-29 04:33:36.400204+00');

-- Humana NOT LISTED (9 providers):
INSERT INTO payer_directory_snapshots (npi, payer_code, consecutive_not_listed_count, snapshot_date, created_at)
VALUES
  ('1063489102','humana',1,'2026-03-29','2026-03-29 04:33:40.381688+00'),
  ('1073519088','humana',1,'2026-03-29','2026-03-29 04:33:32.07366+00'),
  ('1285630863','humana',1,'2026-03-29','2026-03-29 04:33:34.121673+00'),
  ('1457468373','humana',1,'2026-03-29','2026-03-29 04:33:08.418281+00'),
  ('1457586307','humana',1,'2026-03-29','2026-03-29 04:33:21.283738+00'),
  ('1700963824','humana',1,'2026-03-29','2026-03-29 04:33:10.410086+00'),
  ('1811934649','humana',1,'2026-03-29','2026-03-29 04:33:06.206195+00'),
  ('1821175951','humana',1,'2026-03-29','2026-03-29 04:33:46.886068+00'),
  ('1861494924','humana',1,'2026-03-29','2026-03-29 04:33:25.284219+00');

-- Aetna NOT LISTED (all 20 providers):
INSERT INTO payer_directory_snapshots (npi, payer_code, consecutive_not_listed_count, snapshot_date, created_at)
VALUES
  ('1063489102','aetna',1,'2026-03-29','2026-03-29 04:33:40.666481+00'),
  ('1073519088','aetna',1,'2026-03-29','2026-03-29 04:33:32.368877+00'),
  ('1245420108','aetna',1,'2026-03-29','2026-03-29 04:33:19.696384+00'),
  ('1285630863','aetna',1,'2026-03-29','2026-03-29 04:33:34.410242+00'),
  ('1295737245','aetna',1,'2026-03-29','2026-03-29 04:33:23.72327+00'),
  ('1457468373','aetna',1,'2026-03-29','2026-03-29 04:33:08.705+00'),
  ('1457586307','aetna',1,'2026-03-29','2026-03-29 04:33:21.586371+00'),
  ('1578542460','aetna',1,'2026-03-29','2026-03-29 04:33:38.831303+00'),
  ('1629073929','aetna',1,'2026-03-29','2026-03-29 04:33:30.381087+00'),
  ('1669474623','aetna',1,'2026-03-29','2026-03-29 04:33:27.82603+00'),
  ('1700963824','aetna',1,'2026-03-29','2026-03-29 04:33:10.707869+00'),
  ('1730300211','aetna',1,'2026-03-29','2026-03-29 04:33:15.536892+00'),
  ('1750589610','aetna',1,'2026-03-29','2026-03-29 04:33:17.517814+00'),
  ('1801816715','aetna',1,'2026-03-29','2026-03-29 04:33:45.342362+00'),
  ('1801865142','aetna',1,'2026-03-29','2026-03-29 04:33:42.985713+00'),
  ('1801919881','aetna',1,'2026-03-29','2026-03-29 04:33:12.926308+00'),
  ('1811934649','aetna',1,'2026-03-29','2026-03-29 04:33:06.566943+00'),
  ('1821175951','aetna',1,'2026-03-29','2026-03-29 04:33:47.182287+00'),
  ('1831188572','aetna',1,'2026-03-29','2026-03-29 04:33:36.68516+00'),
  ('1861494924','aetna',1,'2026-03-29','2026-03-29 04:33:25.595898+00');

-- Cigna NOT LISTED (all 20 providers):
INSERT INTO payer_directory_snapshots (npi, payer_code, consecutive_not_listed_count, snapshot_date, created_at)
VALUES
  ('1063489102','cigna',1,'2026-03-29','2026-03-29 04:33:41.249327+00'),
  ('1073519088','cigna',1,'2026-03-29','2026-03-29 04:33:32.824935+00'),
  ('1245420108','cigna',1,'2026-03-29','2026-03-29 04:33:20.17969+00'),
  ('1285630863','cigna',1,'2026-03-29','2026-03-29 04:33:34.875418+00'),
  ('1295737245','cigna',1,'2026-03-29','2026-03-29 04:33:24.185499+00'),
  ('1457468373','cigna',1,'2026-03-29','2026-03-29 04:33:09.156605+00'),
  ('1457586307','cigna',1,'2026-03-29','2026-03-29 04:33:22.025405+00'),
  ('1578542460','cigna',1,'2026-03-29','2026-03-29 04:33:39.321073+00'),
  ('1629073929','cigna',1,'2026-03-29','2026-03-29 04:33:30.811205+00'),
  ('1669474623','cigna',1,'2026-03-29','2026-03-29 04:33:28.311739+00'),
  ('1700963824','cigna',1,'2026-03-29','2026-03-29 04:33:11.187406+00'),
  ('1730300211','cigna',1,'2026-03-29','2026-03-29 04:33:16.023109+00'),
  ('1750589610','cigna',1,'2026-03-29','2026-03-29 04:33:17.993889+00'),
  ('1801816715','cigna',1,'2026-03-29','2026-03-29 04:33:45.835962+00'),
  ('1801865142','cigna',1,'2026-03-29','2026-03-29 04:33:43.439544+00'),
  ('1801919881','cigna',1,'2026-03-29','2026-03-29 04:33:13.405503+00'),
  ('1811934649','cigna',1,'2026-03-29','2026-03-29 04:33:07.105101+00'),
  ('1821175951','cigna',1,'2026-03-29','2026-03-29 04:33:47.641701+00'),
  ('1831188572','cigna',1,'2026-03-29','2026-03-29 04:33:37.112235+00'),
  ('1861494924','cigna',1,'2026-03-29','2026-03-29 04:33:26.08873+00');

-- UHC NOT LISTED (9 providers — only some had UHC snapshots):
INSERT INTO payer_directory_snapshots (npi, payer_code, consecutive_not_listed_count, snapshot_date, created_at)
VALUES
  ('1063489102','uhc',1,'2026-03-29','2026-03-29 04:33:40.123303+00'),
  ('1073519088','uhc',1,'2026-03-29','2026-03-29 04:33:31.732803+00'),
  ('1457468373','uhc',1,'2026-03-29','2026-03-29 04:44:37.58347+00'),
  ('1457586307','uhc',1,'2026-03-29','2026-03-29 04:33:21.015901+00'),
  ('1700963824','uhc',1,'2026-03-29','2026-03-29 04:33:10.139192+00'),
  ('1750589610','uhc',1,'2026-03-29','2026-03-29 04:33:16.831626+00'),
  ('1811934649','uhc',1,'2026-03-29','2026-03-29 04:33:05.67162+00'),
  ('1821175951','uhc',1,'2026-03-29','2026-03-29 04:33:46.608804+00'),
  ('1861494924','uhc',1,'2026-03-29','2026-03-29 04:33:25.031756+00');

-- 4. Restore payer_directory_endpoints
UPDATE payer_directory_endpoints SET
  fhir_base_url = 'https://flex.optum.com/fhirpublic/R4',
  auth_type = 'none',
  is_active = true,
  last_error = NULL,
  search_mode = 'npi'
WHERE payer_code = 'uhc';

UPDATE payer_directory_endpoints SET
  fhir_base_url = 'https://fhir.cigna.com/ProviderDirectory/v1',
  auth_type = 'none',
  is_active = true,
  last_error = NULL,
  search_mode = 'name'
WHERE payer_code = 'cigna';

UPDATE payer_directory_endpoints SET
  fhir_base_url = 'https://fhir.humana.com/api',
  auth_type = 'none',
  is_active = true,
  last_error = NULL,
  search_mode = 'npi'
WHERE payer_code = 'humana';

UPDATE payer_directory_endpoints SET
  fhir_base_url = 'https://apif1.aetna.com/fhir/v1/providerdirectory',
  auth_type = 'oauth2_client_credentials',
  is_active = true,
  last_error = NULL,
  search_mode = 'npi'
WHERE payer_code = 'aetna';

COMMIT;

-- ============================================================
-- BASELINE SUMMARY (for quick reference):
-- ============================================================
-- Practice: BRUSHY CREEK FAMILY PHYSICIANS PA
-- 20 providers, accepted_payers: aetna,cigna,uhc,humana,bcbs,tricare,medicare,curative
-- accepted_payers_source: admin_entered
--
-- Payer snapshots (69 total):
--   Humana:  20 snapshots — 11 listed, 9 not listed
--   Aetna:   20 snapshots — 0 listed, 20 not listed (OAuth creds expired)
--   Cigna:   20 snapshots — 0 listed, 20 not listed (identifier search was broken)
--   UHC:      9 snapshots — 0 listed, 9 not listed (URL was wrong, now fixed)
--
-- Mismatches: 0 open (cleared in prior session)
-- ============================================================
