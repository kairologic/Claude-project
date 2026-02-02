-- ============================================================
-- KairoLogic Migration v12 - PART 1: Registry Enhancements
-- Run this FIRST, then run Part 2.
-- ============================================================

-- Add columns WITHOUT check constraints first (safe for existing rows)
ALTER TABLE registry ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS status_label TEXT DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'none';
ALTER TABLE registry ADD COLUMN IF NOT EXISTS latest_report_url TEXT DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS last_scan_timestamp TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registry_featured ON registry(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_registry_status_label ON registry(status_label);
CREATE INDEX IF NOT EXISTS idx_registry_report_status ON registry(report_status);

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'registry'
  AND column_name IN ('is_featured','status_label','report_status','latest_report_url','last_scan_timestamp','stripe_customer_id')
ORDER BY column_name;
