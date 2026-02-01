-- ============================================================
-- KairoLogic: scan_reports Table Migration
-- Stores auto-generated PDF audit reports per provider per scan.
-- Each new scan generates a new report row with the full JSON
-- payload + a base64-encoded PDF blob for Supabase storage.
-- ============================================================

-- Create the scan_reports table
CREATE TABLE IF NOT EXISTS scan_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Provider linkage (NPI is the stable key across registry)
    npi TEXT NOT NULL,
    registry_id TEXT,  -- links to registry.id (same as NPI for scanned providers)
    
    -- Report metadata
    report_id TEXT NOT NULL UNIQUE,  -- e.g. KL-SAR-2026-0131-4A7F
    report_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    engine_version TEXT NOT NULL DEFAULT 'SENTRY-3.0.0',
    
    -- Scan results snapshot (full JSON from scan API)
    sovereignty_score INTEGER NOT NULL DEFAULT 0,
    compliance_status TEXT NOT NULL DEFAULT 'Drift',  -- Sovereign | Drift | Violation
    category_scores JSONB,        -- {data_sovereignty: {...}, ai_transparency: {...}, clinical_integrity: {...}}
    data_border_map JSONB,        -- [{domain, ip, country, ...}]
    findings JSONB NOT NULL,      -- Full array of ScanFinding[]
    page_context JSONB,           -- {type, hasPatientPortal, ...}
    npi_verification JSONB,       -- NPI lookup result
    scan_meta JSONB,              -- {engine, duration, checksRun, ...}
    
    -- Provider info at time of scan
    practice_name TEXT,
    website_url TEXT,
    
    -- PDF storage
    -- Option A: Base64 blob (works without Supabase Storage bucket)
    pdf_base64 TEXT,              -- Base64-encoded PDF content
    pdf_size_bytes INTEGER,
    
    -- Option B: Supabase Storage path (preferred for production)
    pdf_storage_path TEXT,        -- e.g. reports/1669203667/KL-SAR-2026-0131-4A7F.pdf
    pdf_signed_url TEXT,          -- Generated on-demand, expires in 60 min
    
    -- Delivery tracking
    emailed_at TIMESTAMPTZ,       -- When report was emailed to provider
    emailed_to TEXT,              -- Email address it was sent to
    downloaded_at TIMESTAMPTZ,    -- When admin downloaded the report
    payment_confirmed BOOLEAN DEFAULT FALSE,  -- Linked to Stripe payment
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_scan_reports_npi ON scan_reports (npi);
CREATE INDEX IF NOT EXISTS idx_scan_reports_registry_id ON scan_reports (registry_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_report_date ON scan_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_scan_reports_npi_date ON scan_reports (npi, report_date DESC);

-- Row Level Security
ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

-- Allow anon inserts (from scan API) and admin reads
CREATE POLICY "Allow anon insert scan_reports"
    ON scan_reports FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon select scan_reports"
    ON scan_reports FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon update scan_reports"
    ON scan_reports FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_scan_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scan_reports_updated_at
    BEFORE UPDATE ON scan_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_scan_reports_updated_at();

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase Dashboard > Storage)
-- Creates a private bucket for PDF reports with signed URL access
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('audit-reports', 'audit-reports', false);
--
-- CREATE POLICY "Allow anon upload to audit-reports"
--     ON storage.objects FOR INSERT
--     TO anon
--     WITH CHECK (bucket_id = 'audit-reports');
--
-- CREATE POLICY "Allow anon read from audit-reports"  
--     ON storage.objects FOR SELECT
--     TO anon
--     USING (bucket_id = 'audit-reports');
