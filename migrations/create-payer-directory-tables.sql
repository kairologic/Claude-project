-- ═══════════════════════════════════════════════════════════════
-- Create payer directory tables (idempotent — safe to re-run)
-- Run BEFORE seed-payer-directory-demo.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Payer endpoint configuration
CREATE TABLE IF NOT EXISTS payer_directory_endpoints (
  payer_code TEXT PRIMARY KEY,
  payer_name TEXT NOT NULL,
  fhir_base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none',
  auth_config JSONB DEFAULT '{}'::jsonb,
  rate_limit_rpm INT NOT NULL DEFAULT 60,
  coverage_type TEXT NOT NULL DEFAULT 'commercial',
  state_scope TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Flattened FHIR snapshots (one row = one provider + one payer + one date)
CREATE TABLE IF NOT EXISTS payer_directory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT NOT NULL,
  payer_code TEXT NOT NULL REFERENCES payer_directory_endpoints(payer_code),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Provider identity
  listed_name_first TEXT,
  listed_name_last TEXT,
  listed_name_full TEXT,
  listed_credentials TEXT,
  listed_gender TEXT,

  -- Practice location
  listed_address_line1 TEXT,
  listed_address_line2 TEXT,
  listed_city TEXT,
  listed_state TEXT,
  listed_zip TEXT,

  -- Contact
  listed_phone TEXT,
  listed_fax TEXT,

  -- Clinical
  listed_specialty_code TEXT,
  listed_specialty_display TEXT,
  listed_accepting_patients BOOLEAN,

  -- Organization
  listed_org_name TEXT,
  listed_org_npi TEXT,

  -- Network
  listed_network_name TEXT,
  listed_plan_names JSONB,

  -- Enhanced directory fields (CAA 2023)
  listed_languages JSONB,
  listed_telehealth_available BOOLEAN,
  listed_office_hours JSONB,
  listed_disability_access TEXT,

  -- FHIR references
  fhir_practitioner_id TEXT,
  fhir_practitioner_role_id TEXT,
  fhir_location_id TEXT,
  fhir_organization_id TEXT,
  fhir_raw_bundle JSONB,

  -- Metadata
  sync_batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(npi, payer_code, snapshot_date)
);

-- 3. Detected mismatches (discrepancies between NPPES/website and payer directory)
CREATE TABLE IF NOT EXISTS payer_directory_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT NOT NULL,
  payer_code TEXT NOT NULL REFERENCES payer_directory_endpoints(payer_code),
  snapshot_id UUID REFERENCES payer_directory_snapshots(id),
  practice_website_id UUID,

  field_name TEXT NOT NULL,
  mismatch_type TEXT NOT NULL, -- value_differs, not_listed, wrong_location, specialty_mismatch
  nppes_value TEXT,
  website_value TEXT,
  payer_value TEXT,
  recommended_value TEXT,
  priority INT NOT NULL DEFAULT 3, -- 1=critical, 2=high, 3=medium, 4=low

  fix_via_caqh BOOLEAN DEFAULT false,
  fix_instructions TEXT,

  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Correction packets (grouped fix instructions)
CREATE TABLE IF NOT EXISTS correction_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT NOT NULL,
  practice_website_id UUID,
  packet_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb, -- CorrectionAction[]
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pds_npi_payer ON payer_directory_snapshots(npi, payer_code);
CREATE INDEX IF NOT EXISTS idx_pds_payer_date ON payer_directory_snapshots(payer_code, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_pdm_npi_payer ON payer_directory_mismatches(npi, payer_code);
CREATE INDEX IF NOT EXISTS idx_pdm_priority ON payer_directory_mismatches(priority) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cp_npi ON correction_packets(npi);

-- 6. RLS policies (match pattern from other tables)
ALTER TABLE payer_directory_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_directory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_directory_mismatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_packets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads (admin client bypasses RLS anyway)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pde_read_all') THEN
    EXECUTE 'CREATE POLICY pde_read_all ON payer_directory_endpoints FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pds_read_all') THEN
    EXECUTE 'CREATE POLICY pds_read_all ON payer_directory_snapshots FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pdm_read_all') THEN
    EXECUTE 'CREATE POLICY pdm_read_all ON payer_directory_mismatches FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cp_read_all') THEN
    EXECUTE 'CREATE POLICY cp_read_all ON correction_packets FOR SELECT TO authenticated USING (true)';
  END IF;
END
$$;
