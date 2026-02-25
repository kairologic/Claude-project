-- ============================================================
-- KairoLogic Migration v13 - PART 4: Compliance Frameworks
-- Creates tables for V4 platform expansion: generic compliance
-- framework system, framework display configs for widgets,
-- and multi-page monitoring support.
-- Run AFTER Part 3.
-- ============================================================

-- -----------------------------------------------
-- Table: compliance_frameworks
-- Defines compliance frameworks that can be assigned
-- to providers. Enables multi-state, multi-industry
-- expansion beyond TX SB 1188 / HB 149.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    framework_id TEXT NOT NULL UNIQUE,  -- e.g. TX-SB1188, TX-HB149, HIPAA, GDPR, ADA-WCAG, SOC2
    name TEXT NOT NULL,
    description TEXT,
    jurisdiction TEXT,        -- e.g. Texas, Federal, EU, Global
    industry TEXT,            -- e.g. Healthcare, All, Finance
    category TEXT NOT NULL,   -- e.g. data_sovereignty, ai_transparency, accessibility, privacy
    is_active BOOLEAN DEFAULT TRUE,

    -- Legal references
    statute_reference TEXT,   -- e.g. "Texas Senate Bill 1188, 89th Legislature"
    effective_date DATE,
    penalty_description TEXT, -- e.g. "$250,000 per knowing violation"

    -- Check engine mapping
    check_plugins JSONB DEFAULT '[]'::jsonb,
      -- Array of check plugin IDs that apply to this framework
      -- e.g. ["NPI-01", "NPI-02", "RST-01"]

    -- Scoring
    weight NUMERIC(3,2) DEFAULT 1.00,  -- Weight in composite score calculation
    compliance_threshold INTEGER DEFAULT 75,  -- Minimum score to be compliant

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Table: framework_display_configs
-- Widget display configuration per framework.
-- Controls trust rows, banner text, legal refs
-- shown in the embeddable widget per framework.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS framework_display_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    framework_id TEXT NOT NULL REFERENCES compliance_frameworks(framework_id),

    -- Widget display
    banner_text TEXT NOT NULL,         -- e.g. "Data Sovereignty Verified"
    banner_color TEXT DEFAULT '#00234E',
    badge_icon TEXT DEFAULT 'shield',  -- Icon identifier
    badge_label TEXT NOT NULL,         -- e.g. "SB 1188 Compliant"

    -- Trust rows (rendered in widget trust pane)
    trust_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
      -- Array of {icon, label, description, status}
      -- e.g. [{"icon":"globe","label":"Data Residency","description":"All data routed within US borders","status":"verified"}]

    -- Legal references shown in widget
    legal_refs JSONB DEFAULT '[]'::jsonb,
      -- Array of {statute, title, url}
      -- e.g. [{"statute":"SB 1188","title":"Texas Data Sovereignty Act","url":"https://..."}]

    -- Display priority (lower = higher priority)
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Table: provider_frameworks
-- Maps providers to their assigned compliance
-- frameworks. A provider can have multiple frameworks.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS provider_frameworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL,
    registry_id TEXT,
    framework_id TEXT NOT NULL REFERENCES compliance_frameworks(framework_id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ,

    -- Per-framework score
    current_score INTEGER DEFAULT 0,
    compliance_status TEXT DEFAULT 'unknown',
      -- Values: compliant | non_compliant | unknown | exempt

    UNIQUE(npi, framework_id)
);

-- -----------------------------------------------
-- Table: provider_sites
-- Multi-URL support per provider (V4).
-- Currently single page per NPI; this enables
-- monitoring multiple pages/domains.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS provider_sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL,
    registry_id TEXT,

    -- Site details
    url TEXT NOT NULL,
    site_label TEXT,           -- e.g. "Main Website", "Patient Portal", "Booking Page"
    site_type TEXT DEFAULT 'website',
      -- Values: website | patient_portal | booking | telehealth | blog
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Scan tracking
    last_scan_at TIMESTAMPTZ,
    last_score INTEGER,
    scan_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(npi, url)
);

-- -----------------------------------------------
-- Indexes
-- -----------------------------------------------
-- compliance_frameworks
CREATE INDEX IF NOT EXISTS idx_frameworks_framework_id ON compliance_frameworks(framework_id);
CREATE INDEX IF NOT EXISTS idx_frameworks_category ON compliance_frameworks(category);
CREATE INDEX IF NOT EXISTS idx_frameworks_active ON compliance_frameworks(is_active)
  WHERE is_active = TRUE;

-- framework_display_configs
CREATE INDEX IF NOT EXISTS idx_fdc_framework_id ON framework_display_configs(framework_id);
CREATE INDEX IF NOT EXISTS idx_fdc_display_order ON framework_display_configs(display_order);

-- provider_frameworks
CREATE INDEX IF NOT EXISTS idx_pf_npi ON provider_frameworks(npi);
CREATE INDEX IF NOT EXISTS idx_pf_framework ON provider_frameworks(framework_id);
CREATE INDEX IF NOT EXISTS idx_pf_npi_active ON provider_frameworks(npi, is_active)
  WHERE is_active = TRUE;

-- provider_sites
CREATE INDEX IF NOT EXISTS idx_ps_npi ON provider_sites(npi);
CREATE INDEX IF NOT EXISTS idx_ps_npi_primary ON provider_sites(npi, is_primary)
  WHERE is_primary = TRUE;

-- -----------------------------------------------
-- Row Level Security
-- -----------------------------------------------
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_display_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_sites ENABLE ROW LEVEL SECURITY;

-- compliance_frameworks policies
CREATE POLICY "Allow anon select compliance_frameworks"
    ON compliance_frameworks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert compliance_frameworks"
    ON compliance_frameworks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update compliance_frameworks"
    ON compliance_frameworks FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- framework_display_configs policies
CREATE POLICY "Allow anon select framework_display_configs"
    ON framework_display_configs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert framework_display_configs"
    ON framework_display_configs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update framework_display_configs"
    ON framework_display_configs FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- provider_frameworks policies
CREATE POLICY "Allow anon select provider_frameworks"
    ON provider_frameworks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert provider_frameworks"
    ON provider_frameworks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update provider_frameworks"
    ON provider_frameworks FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- provider_sites policies
CREATE POLICY "Allow anon select provider_sites"
    ON provider_sites FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert provider_sites"
    ON provider_sites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update provider_sites"
    ON provider_sites FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- Auto-update timestamp triggers
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION update_compliance_frameworks_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compliance_frameworks_updated
    BEFORE UPDATE ON compliance_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_compliance_frameworks_timestamp();

CREATE OR REPLACE FUNCTION update_framework_display_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_framework_display_configs_updated
    BEFORE UPDATE ON framework_display_configs
    FOR EACH ROW EXECUTE FUNCTION update_framework_display_configs_timestamp();

CREATE OR REPLACE FUNCTION update_provider_sites_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_provider_sites_updated
    BEFORE UPDATE ON provider_sites
    FOR EACH ROW EXECUTE FUNCTION update_provider_sites_timestamp();

-- -----------------------------------------------
-- Verify tables
-- -----------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
    'compliance_frameworks', 'framework_display_configs',
    'provider_frameworks', 'provider_sites'
)
ORDER BY table_name, ordinal_position;
