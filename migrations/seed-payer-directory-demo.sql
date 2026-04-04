-- ═══════════════════════════════════════════════════════════════
-- Seed payer_directory data for demo (North Texas Med practice)
-- Run after tables exist: payer_directory_endpoints,
--   payer_directory_snapshots, payer_directory_mismatches
-- ═══════════════════════════════════════════════════════════════

-- 1. Payer endpoints (idempotent: skip if already exists)
INSERT INTO payer_directory_endpoints (payer_code, payer_name, fhir_base_url, auth_type, rate_limit_rpm, coverage_type, state_scope, is_active)
VALUES
  ('uhc',    'UnitedHealthcare', 'https://public.fhir.flex.optum.com/R4',        'api_key', 60, 'commercial', NULL,  true),
  ('aetna',  'Aetna',           'https://vteapif1.aetna.com/fhirdirectory/v2',   'none',    60, 'commercial', NULL,  true),
  ('cigna',  'Cigna',           'https://p-hi2.digitaledge.cigna.com/ProviderDirectory/rest/v13', 'none', 60, 'commercial', NULL, true),
  ('humana', 'Humana',          'https://fhir.humana.com/api/ProviderDirectory/v1', 'oauth2_client_credentials', 30, 'commercial', NULL, true),
  ('bcbs_tx','BCBS TX',         'https://api.bcbstx.com/fhir/provider-directory/v1', 'oauth2_client_credentials', 30, 'commercial', 'TX', false)
ON CONFLICT (payer_code) DO NOTHING;

-- 2. Seed snapshots + mismatches for practice providers
-- We'll grab up to 20 providers from the demo practice and create realistic data
DO $$
DECLARE
  v_practice_id UUID;
  v_prov RECORD;
  v_snap_id UUID;
  v_payers TEXT[] := ARRAY['uhc', 'aetna', 'cigna', 'humana'];
  v_payer TEXT;
  v_rand FLOAT;
  v_snap_date DATE := CURRENT_DATE - 3; -- 3 days ago
BEGIN
  -- Find the demo practice (North Texas Med)
  SELECT id INTO v_practice_id
  FROM practice_websites
  WHERE name ILIKE '%north texas%'
  LIMIT 1;

  IF v_practice_id IS NULL THEN
    RAISE NOTICE 'No North Texas practice found, skipping seed';
    RETURN;
  END IF;

  -- Loop each provider
  FOR v_prov IN (
    SELECT pp.npi, pp.provider_name,
           p.provider_first_line_business_practice_location_address AS addr,
           p.provider_business_practice_location_address_city_name AS city,
           p.provider_business_practice_location_address_state_name AS state,
           p.provider_business_practice_location_address_postal_code AS zip,
           p.provider_business_practice_location_address_telephone_number AS phone,
           p.healthcare_provider_taxonomy_code_1 AS taxonomy,
           p.provider_first_name AS first_name,
           p.provider_last_name_legal_name AS last_name
    FROM practice_providers pp
    LEFT JOIN providers p ON p.npi = pp.npi
    WHERE pp.practice_id = v_practice_id
    ORDER BY pp.provider_name
    LIMIT 20
  )
  LOOP
    -- For each active payer, seed a snapshot
    FOREACH v_payer IN ARRAY v_payers
    LOOP
      v_rand := random();

      -- 60% matched, 25% mismatch, 15% not listed
      IF v_rand < 0.15 THEN
        -- NOT LISTED: insert sparse snapshot + not_listed mismatch
        v_snap_id := gen_random_uuid();
        INSERT INTO payer_directory_snapshots (id, npi, payer_code, snapshot_date,
          listed_name_full, listed_address_line1, listed_city, listed_state, listed_zip,
          listed_phone, listed_specialty_display, listed_accepting_patients)
        VALUES (v_snap_id, v_prov.npi, v_payer, v_snap_date,
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

        INSERT INTO payer_directory_mismatches (id, npi, payer_code, snapshot_id,
          field_name, mismatch_type, nppes_value, payer_value, priority,
          fix_via_caqh, fix_instructions)
        VALUES (gen_random_uuid(), v_prov.npi, v_payer, v_snap_id,
          'listing', 'not_listed',
          v_prov.first_name || ' ' || v_prov.last_name, NULL, 1,
          true, 'Register provider in CAQH ProView to propagate to ' || v_payer);

      ELSIF v_rand < 0.40 THEN
        -- MISMATCH: insert snapshot with slightly different data
        v_snap_id := gen_random_uuid();
        INSERT INTO payer_directory_snapshots (id, npi, payer_code, snapshot_date,
          listed_name_full, listed_address_line1, listed_city, listed_state, listed_zip,
          listed_phone, listed_specialty_display, listed_accepting_patients)
        VALUES (v_snap_id, v_prov.npi, v_payer, v_snap_date,
          COALESCE(v_prov.first_name, '') || ' ' || COALESCE(v_prov.last_name, ''),
          -- Introduce address mismatch: change suite number
          CASE WHEN random() < 0.5 THEN COALESCE(v_prov.addr, '') || ' STE 200'
               ELSE COALESCE(v_prov.addr, '') END,
          v_prov.city, v_prov.state, LEFT(v_prov.zip, 5),
          -- Introduce phone mismatch 50% of time
          CASE WHEN random() < 0.5 THEN '8005551234' ELSE v_prov.phone END,
          -- Specialty stays same
          v_prov.taxonomy,
          true);

        -- Add address mismatch
        IF random() < 0.6 THEN
          INSERT INTO payer_directory_mismatches (id, npi, payer_code, snapshot_id,
            field_name, mismatch_type, nppes_value, payer_value, priority,
            fix_via_caqh, fix_instructions)
          VALUES (gen_random_uuid(), v_prov.npi, v_payer, v_snap_id,
            'address', 'value_differs',
            v_prov.addr, COALESCE(v_prov.addr, '') || ' STE 200', 2,
            true, 'Update address in CAQH ProView');
        END IF;

        -- Add phone mismatch
        IF random() < 0.4 THEN
          INSERT INTO payer_directory_mismatches (id, npi, payer_code, snapshot_id,
            field_name, mismatch_type, nppes_value, payer_value, priority,
            fix_via_caqh, fix_instructions)
          VALUES (gen_random_uuid(), v_prov.npi, v_payer, v_snap_id,
            'phone', 'value_differs',
            v_prov.phone, '8005551234', 3,
            true, 'Update phone in CAQH ProView');
        END IF;

      ELSE
        -- MATCHED: insert accurate snapshot, no mismatches
        v_snap_id := gen_random_uuid();
        INSERT INTO payer_directory_snapshots (id, npi, payer_code, snapshot_date,
          listed_name_full, listed_address_line1, listed_city, listed_state, listed_zip,
          listed_phone, listed_specialty_display, listed_accepting_patients)
        VALUES (v_snap_id, v_prov.npi, v_payer, v_snap_date,
          COALESCE(v_prov.first_name, '') || ' ' || COALESCE(v_prov.last_name, ''),
          v_prov.addr, v_prov.city, v_prov.state, LEFT(v_prov.zip, 5),
          v_prov.phone, v_prov.taxonomy, true);
      END IF;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Payer directory demo data seeded for practice %', v_practice_id;
END
$$;
