-- ============================================================
-- KairoLogic Migration v12 - PART 2: Email Templates
-- Run this AFTER Part 1 succeeds.
-- ============================================================

-- Create the table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'provider',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_email_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_updated ON email_templates;
CREATE TRIGGER email_templates_updated
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_templates_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON email_templates(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read email_templates" ON email_templates;
CREATE POLICY "Allow read email_templates" ON email_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert email_templates" ON email_templates;
CREATE POLICY "Allow insert email_templates" ON email_templates
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update email_templates" ON email_templates;
CREATE POLICY "Allow update email_templates" ON email_templates
  FOR UPDATE USING (true);

-- Verify table exists
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'email_templates' ORDER BY ordinal_position;

