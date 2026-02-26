-- ============================================================
-- KairoLogic Migration v13 - PART 2: Scheduled Automation
-- Creates tables for V2 scheduled scans, automated reports,
-- and certification score history tracking.
-- Run AFTER Part 1.
--
-- Review fixes applied:
--   [Critical #1] RLS: server-write only, anon read-only
--   [Critical #2] FK constraints to registry(npi)
--   [Improvement #8] certification_history.month_date as DATE
--   [Improvement #9] state column on all tables
--   [Improvement #10] Shared timestamp trigger function
--   [Improvement #13] include_checks defaults to empty array
-- ============================================================

-- -----------------------------------------------
-- Table: scan_schedules
-- Tracks recurring scan automation per provider.
-- Used by cron/Vercel cron for monthly re-scans.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS scan_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,
    state TEXT,                -- Provider's state code (e.g. 'TX', 'CA') for filtered queries

    -- Schedule configuration
    schedule_type TEXT NOT NULL DEFAULT 'monthly',
      -- Values: monthly | quarterly | annual | custom
    cron_expression TEXT DEFAULT '0 2 1 * *',  -- Default: 1st of month at 2am UTC
    is_active BOOLEAN DEFAULT TRUE,

    -- Execution tracking
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    last_run_status TEXT DEFAULT 'pending',
      -- Values: pending | running | success | failed
    last_error TEXT,

    -- Scope
    scan_depth TEXT DEFAULT 'standard',
      -- Values: standard | deep | forensic
    include_checks JSONB DEFAULT '[]'::jsonb,
      -- Populated from provider's assigned frameworks at insert time

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Table: scheduled_reports
-- Tracks automated report generation and delivery.
-- Monthly compliance reports, quarterly forensic reports,
-- and annual certification reports.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,
    state TEXT,                -- Provider's state code

    -- Report configuration
    report_type TEXT NOT NULL DEFAULT 'monthly_compliance',
      -- Values: monthly_compliance | quarterly_forensic | annual_certification
    schedule_type TEXT NOT NULL DEFAULT 'monthly',
      -- Values: monthly | quarterly | annual
    is_active BOOLEAN DEFAULT TRUE,

    -- Generation tracking
    last_generated_at TIMESTAMPTZ,
    next_generation_at TIMESTAMPTZ,
    generation_count INTEGER DEFAULT 0,
    last_report_id TEXT,  -- Links to scan_reports.report_id

    -- Delivery configuration
    auto_email BOOLEAN DEFAULT TRUE,
    delivery_email TEXT,
    last_delivered_at TIMESTAMPTZ,
    delivery_status TEXT DEFAULT 'pending',
      -- Values: pending | generated | delivered | failed

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Table: certification_history
-- Monthly score snapshots for trailing 12-month
-- certification eligibility calculation.
-- A provider needs 12 consecutive compliant months
-- (score >= 75) to earn annual certification seal.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS certification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,
    state TEXT,                -- Provider's state code

    -- Monthly snapshot (DATE type for proper date range queries)
    month_date DATE NOT NULL,  -- Always the 1st of the month: '2026-02-01'
    sovereignty_score INTEGER NOT NULL DEFAULT 0,
    compliance_status TEXT NOT NULL DEFAULT 'Drift',
      -- Values: Sovereign | Drift | Violation
    is_compliant BOOLEAN DEFAULT FALSE,  -- Score >= 75 threshold
    scan_report_id TEXT,  -- Links to scan_reports.report_id

    -- Category breakdown
    data_sovereignty_score INTEGER,
    ai_transparency_score INTEGER,
    clinical_integrity_score INTEGER,
    npi_integrity_score INTEGER,

    -- Findings summary
    total_findings INTEGER DEFAULT 0,
    critical_findings INTEGER DEFAULT 0,
    high_findings INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per provider per month
    UNIQUE(npi, month_date)
);

-- -----------------------------------------------
-- Indexes
-- -----------------------------------------------
-- scan_schedules
CREATE INDEX IF NOT EXISTS idx_scan_schedules_npi ON scan_schedules(npi);
CREATE INDEX IF NOT EXISTS idx_scan_schedules_state ON scan_schedules(state);
CREATE INDEX IF NOT EXISTS idx_scan_schedules_next_run ON scan_schedules(next_run_at)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scan_schedules_active ON scan_schedules(is_active)
  WHERE is_active = TRUE;

-- scheduled_reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_npi ON scheduled_reports(npi);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_state ON scheduled_reports(state);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_gen ON scheduled_reports(next_generation_at)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_type ON scheduled_reports(report_type);

-- certification_history
CREATE INDEX IF NOT EXISTS idx_cert_history_npi ON certification_history(npi);
CREATE INDEX IF NOT EXISTS idx_cert_history_state ON certification_history(state);
CREATE INDEX IF NOT EXISTS idx_cert_history_npi_month ON certification_history(npi, month_date DESC);
CREATE INDEX IF NOT EXISTS idx_cert_history_compliant ON certification_history(npi, is_compliant)
  WHERE is_compliant = TRUE;

-- -----------------------------------------------
-- Row Level Security
-- Provider-scoped tables: anon SELECT only.
-- Writes go through service_role from server-side.
-- -----------------------------------------------
ALTER TABLE scan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_history ENABLE ROW LEVEL SECURITY;

-- scan_schedules: read-only for anon
CREATE POLICY "Public read scan_schedules"
    ON scan_schedules FOR SELECT TO anon USING (true);

-- scheduled_reports: read-only for anon
CREATE POLICY "Public read scheduled_reports"
    ON scheduled_reports FOR SELECT TO anon USING (true);

-- certification_history: read-only for anon
CREATE POLICY "Public read certification_history"
    ON certification_history FOR SELECT TO anon USING (true);

-- -----------------------------------------------
-- Auto-update timestamp triggers (shared function from Part 1)
-- -----------------------------------------------
CREATE TRIGGER trigger_scan_schedules_updated
    BEFORE UPDATE ON scan_schedules
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

CREATE TRIGGER trigger_scheduled_reports_updated
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

-- -----------------------------------------------
-- Verify tables
-- -----------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('scan_schedules', 'scheduled_reports', 'certification_history')
ORDER BY table_name, ordinal_position;
