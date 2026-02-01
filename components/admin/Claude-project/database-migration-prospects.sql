-- =====================================================
-- KairoLogic Prospects Table Migration
-- =====================================================
-- Tracks all inbound leads from:
--   - Risk scan completions
--   - Contact form submissions
--   - Calendar/consultation bookings
-- =====================================================

CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('scan', 'contact', 'calendar', 'discovery', 'manual')),
  source_detail TEXT,  -- e.g. subject line, scan score, appointment date
  
  -- Contact information
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  practice_name TEXT,
  npi TEXT,
  website_url TEXT,
  
  -- Form data (stored as JSON for flexibility)
  form_data JSONB DEFAULT '{}',
  
  -- Scan-specific fields
  scan_score INTEGER,
  scan_risk_level TEXT,
  scan_report_id TEXT,
  
  -- Calendar-specific fields
  appointment_date TEXT,
  appointment_time TEXT,
  meeting_url TEXT,
  
  -- Contact-specific fields
  subject TEXT,
  message TEXT,
  
  -- Admin management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'archived')),
  admin_notes TEXT,
  assigned_to TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  
  -- Linked records
  registry_id TEXT,  -- links to registry table if converted
  fillout_submission_id TEXT,  -- links to Fillout form if applicable
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospects_updated_at ON prospects;
CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_prospects_updated_at();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_npi ON prospects(npi);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_is_read ON prospects(is_read) WHERE is_read = false;

-- RLS: Allow anon access for inserts from public site
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert prospects" ON prospects;
CREATE POLICY "Allow anon insert prospects" ON prospects
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select prospects" ON prospects;
CREATE POLICY "Allow anon select prospects" ON prospects
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon update prospects" ON prospects;
CREATE POLICY "Allow anon update prospects" ON prospects
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete prospects" ON prospects;
CREATE POLICY "Allow anon delete prospects" ON prospects
  FOR DELETE TO anon USING (true);

COMMENT ON TABLE prospects IS 'Tracks all inbound leads from scans, contact forms, and calendar bookings';
COMMENT ON COLUMN prospects.source IS 'Origin: scan, contact, calendar, discovery, manual';
COMMENT ON COLUMN prospects.form_data IS 'Full JSON snapshot of submitted form fields';
COMMENT ON COLUMN prospects.status IS 'Pipeline stage: new → contacted → qualified → converted → archived';
