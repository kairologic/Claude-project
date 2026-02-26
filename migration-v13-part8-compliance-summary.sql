-- ============================================================
-- KairoLogic Migration v13 - PART 8: Provider Compliance Summary
-- Creates the "hot path" materialized summary table that the
-- provider dashboard queries instead of JOINing scan_sessions
-- and check_results directly.
--
-- This table is updated by the scan engine after each scan
-- and by the scheduled automation system (Part 2).
-- Run AFTER Part 7.
--
-- Review item addressed:
--   [Improvement #5] provider_compliance_current summary table
-- ============================================================

-- -----------------------------------------------
-- Table: provider_compliance_current
-- Denormalized summary of each provider's current
-- compliance status. One row per provider.
-- Updated after each scan completes.
--
-- Dashboard queries hit THIS table instead of
-- joining scan history + check results.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS provider_compliance_current (
    npi TEXT PRIMARY KEY REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,
    state TEXT,                              -- Provider's state code for filtered queries

    -- Latest scan reference
    latest_scan_id UUID,
    latest_scan_date TIMESTAMPTZ,
    latest_scan_type TEXT,                   -- 'manual' | 'auto' | 'global'

    -- Composite score
    composite_score INTEGER DEFAULT 0,       -- Overall compliance score (0-100)
    risk_level TEXT DEFAULT 'unknown',       -- 'Sovereign' | 'Drift' | 'Violation' | 'unknown'

    -- Per-framework status (JSONB for flexibility)
    frameworks_status JSONB DEFAULT '{}'::jsonb,
      -- Keyed by framework_id:
      -- {"TX-SB1188": {"score": 85, "status": "compliant", "last_checked": "2026-02-01T00:00:00Z"},
      --  "TX-HB149": {"score": 70, "status": "non_compliant", "last_checked": "2026-02-01T00:00:00Z"}}

    -- Category breakdown scores
    data_sovereignty_score INTEGER,
    ai_transparency_score INTEGER,
    clinical_integrity_score INTEGER,
    npi_integrity_score INTEGER,

    -- Enrichment status (for future Tier 1/2 data sources)
    sanctions_status TEXT DEFAULT 'unchecked',
      -- Values: unchecked | clear | flagged | excluded
    license_status TEXT DEFAULT 'unchecked',
      -- Values: unchecked | active | expired | revoked | not_found

    -- Alert summary
    has_active_alerts BOOLEAN DEFAULT FALSE,
    alert_count INTEGER DEFAULT 0,
    critical_alert_count INTEGER DEFAULT 0,

    -- Findings summary from latest scan
    total_findings INTEGER DEFAULT 0,
    critical_findings INTEGER DEFAULT 0,
    high_findings INTEGER DEFAULT 0,
    medium_findings INTEGER DEFAULT 0,
    low_findings INTEGER DEFAULT 0,

    -- Certification status (denormalized from registry for fast queries)
    certification_status TEXT DEFAULT 'none',
    consecutive_compliant_months INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Indexes
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pcc_state ON provider_compliance_current(state);
CREATE INDEX IF NOT EXISTS idx_pcc_risk_level ON provider_compliance_current(risk_level);
CREATE INDEX IF NOT EXISTS idx_pcc_composite_score ON provider_compliance_current(composite_score);
CREATE INDEX IF NOT EXISTS idx_pcc_has_alerts ON provider_compliance_current(has_active_alerts)
  WHERE has_active_alerts = TRUE;
CREATE INDEX IF NOT EXISTS idx_pcc_sanctions ON provider_compliance_current(sanctions_status)
  WHERE sanctions_status IN ('flagged', 'excluded');
CREATE INDEX IF NOT EXISTS idx_pcc_updated ON provider_compliance_current(updated_at DESC);

-- -----------------------------------------------
-- Row Level Security
-- Read-only for anon. Writes via service_role from scan engine.
-- -----------------------------------------------
ALTER TABLE provider_compliance_current ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read provider_compliance_current"
    ON provider_compliance_current FOR SELECT TO anon USING (true);

-- -----------------------------------------------
-- Auto-update timestamp trigger (shared function from Part 1)
-- -----------------------------------------------
CREATE TRIGGER trigger_pcc_updated
    BEFORE UPDATE ON provider_compliance_current
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

-- -----------------------------------------------
-- Verify table
-- -----------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'provider_compliance_current'
ORDER BY ordinal_position;
