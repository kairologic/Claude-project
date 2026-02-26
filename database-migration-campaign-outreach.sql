-- Campaign Outreach Table
-- Tracks email campaign recipients and their report codes for /report/{code} landing pages
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS campaign_outreach (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npi TEXT NOT NULL,
  report_code TEXT NOT NULL,
  email_sent_to TEXT,
  sent_at TIMESTAMPTZ,
  campaign_name TEXT DEFAULT 'sb1188-cold-v1',
  opened BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_outreach_code ON campaign_outreach(report_code);
CREATE INDEX idx_campaign_outreach_npi ON campaign_outreach(npi);

-- Enable RLS but allow anon read access for the landing page lookup
ALTER TABLE campaign_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read by report_code"
  ON campaign_outreach
  FOR SELECT
  USING (true);
