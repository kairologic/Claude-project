-- ════════════════════════════════════════════════════════════════
-- KairoLogic: Phase 1A Task 6 — Create ai_tools_detected table
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ════════════════════════════════════════════════════════════════
--
-- Stores all AI-vendor tools detected on provider/practice websites
-- during the enhanced TX crawl (Task 7) and ongoing scan cycles.
--
-- One row = one AI tool detected on one provider's site on one date.
-- Re-crawls on the same date overwrite via UNIQUE constraint.

-- ── 1. Main table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_tools_detected (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider linkage
  npi               TEXT          NOT NULL,   -- 10-digit NPI

  -- Tool identity
  tool_name         TEXT          NOT NULL,   -- e.g. "Klara Messaging"
  tool_vendor       TEXT          NOT NULL,   -- e.g. "Klara"
  tool_category     TEXT          NOT NULL,   -- clinical_ai | patient_communication | scheduling | ...

  -- Detection metadata
  detection_method  TEXT          NOT NULL,   -- script_url | dom_marker | inline_script | ...
  confidence_score  NUMERIC(3,2)  NOT NULL    -- 0.00 – 1.00
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  crawl_url         TEXT,                     -- page URL where tool was detected
  evidence          JSONB,                    -- matched_signals[], evidence_url

  -- Audit
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Dedup: one tool per NPI per calendar day (latest crawl wins)
  UNIQUE (npi, tool_name, (detected_at::date))
);

-- ── 2. Indexes ───────────────────────────────────────────────────

-- Primary access patterns: look up by NPI, by tool vendor, by category
CREATE INDEX IF NOT EXISTS idx_ai_tools_npi
  ON ai_tools_detected (npi);

CREATE INDEX IF NOT EXISTS idx_ai_tools_vendor
  ON ai_tools_detected (tool_vendor);

CREATE INDEX IF NOT EXISTS idx_ai_tools_category
  ON ai_tools_detected (tool_category);

CREATE INDEX IF NOT EXISTS idx_ai_tools_detected_at
  ON ai_tools_detected (detected_at DESC);

-- For frequency analysis: "which tools are most common?"
CREATE INDEX IF NOT EXISTS idx_ai_tools_name_date
  ON ai_tools_detected (tool_name, detected_at DESC);

-- ── 3. Updated-at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_ai_tools_detected_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ai_tools_updated_at ON ai_tools_detected;
CREATE TRIGGER trigger_ai_tools_updated_at
  BEFORE UPDATE ON ai_tools_detected
  FOR EACH ROW EXECUTE FUNCTION update_ai_tools_detected_updated_at();

-- ── 4. Add website_accepting_patients + accepted_payers columns ──
--    to practice_websites if they don't already exist
--    (Task 3 & 4 — surface website-derived accepting-patients signal)

ALTER TABLE practice_websites
  ADD COLUMN IF NOT EXISTS website_accepting_patients BOOLEAN,
  ADD COLUMN IF NOT EXISTS website_accepting_patients_extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_payers TEXT[]               DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_payers_extracted_at TIMESTAMPTZ;

-- ── 5. Add OIG exclusion columns to provider_licenses ────────────
--    (Task 2 — flag providers matched against LEIE)

ALTER TABLE provider_licenses
  ADD COLUMN IF NOT EXISTS has_oig_exclusion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oig_checked_at    TIMESTAMPTZ;

-- Create index for quick exclusion lookups
CREATE INDEX IF NOT EXISTS idx_provider_licenses_oig
  ON provider_licenses (has_oig_exclusion)
  WHERE has_oig_exclusion = TRUE;

-- ── 6. Create provider_exclusions table (OIG LEIE store) ─────────

CREATE TABLE IF NOT EXISTS provider_exclusions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  last_name       TEXT,
  first_name      TEXT,
  mid_name        TEXT,
  business_name   TEXT,
  entity_type     TEXT,         -- 'Individual' or 'Business'
  specialty       TEXT,

  -- Government identifiers
  upin            TEXT,
  npi             TEXT,         -- may be null for pre-NPI exclusions

  -- Personal
  dob             DATE,

  -- Address
  address         TEXT,
  city            TEXT,
  state           TEXT          CHECK (length(state) <= 2),
  zip             TEXT,

  -- Exclusion details
  excl_type       TEXT          NOT NULL,   -- OIG exclusion type code
  excl_date       DATE,
  rein_date       DATE,                     -- reinstatement date (null = still excluded)
  waiver_state    TEXT,
  waiver_date     DATE,

  -- Derived fields
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,  -- no rein_date = currently excluded

  -- Pipeline metadata
  source          TEXT          NOT NULL DEFAULT 'oig_leie',
  loaded_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Natural key: one row per exclusion event per person (OIG excl_type + excl_date + npi/name)
  UNIQUE NULLS NOT DISTINCT (npi, excl_type, excl_date)
);

CREATE INDEX IF NOT EXISTS idx_provider_exclusions_npi
  ON provider_exclusions (npi) WHERE npi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_exclusions_active
  ON provider_exclusions (is_active, state);

CREATE INDEX IF NOT EXISTS idx_provider_exclusions_name
  ON provider_exclusions (last_name, first_name);

-- RLS: service role only (exclusion data is sensitive)
ALTER TABLE provider_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools_detected   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to provider_exclusions"
  ON provider_exclusions
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ai_tools_detected"
  ON ai_tools_detected
  USING (auth.role() = 'service_role');

-- Allow authenticated dashboard reads for ai_tools_detected
CREATE POLICY "Authenticated read ai_tools_detected"
  ON ai_tools_detected FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

-- ── 7. Convenience view: AI tools summary by provider ────────────

CREATE OR REPLACE VIEW v_provider_ai_tools AS
SELECT
  npi,
  array_agg(DISTINCT tool_vendor ORDER BY tool_vendor) AS vendors,
  array_agg(DISTINCT tool_category ORDER BY tool_category) AS categories,
  count(*) AS tool_count,
  bool_or(tool_category IN ('clinical_ai', 'ambient_documentation')) AS has_clinical_ai,
  bool_or(tool_category = 'ehr_portal') AS has_patient_portal,
  max(detected_at) AS last_detected_at
FROM ai_tools_detected
WHERE detected_at >= now() - interval '90 days'  -- rolling 90-day window
GROUP BY npi;

-- ── Done ─────────────────────────────────────────────────────────
-- Verify:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('ai_tools_detected', 'provider_exclusions');
