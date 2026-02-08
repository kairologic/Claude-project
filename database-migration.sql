-- KairoLogic Platform Database Migrations
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Enhance Registry Table
-- ============================================

ALTER TABLE registry ADD COLUMN IF NOT EXISTS widget_status TEXT DEFAULT 'active';
ALTER TABLE registry ADD COLUMN IF NOT EXISTS widget_id TEXT UNIQUE;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE registry ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS last_widget_check TIMESTAMP;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS contact_first_name TEXT;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS contact_last_name TEXT;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS last_scan_result JSONB;

COMMENT ON COLUMN registry.widget_status IS 'active, warning, hidden';
COMMENT ON COLUMN registry.subscription_status IS 'trial, active, inactive';

-- ============================================
-- 2. Email Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('scan_complete', 'purchase_success', 'consultation_booked', 'contact_form')),
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE email_templates IS 'Email templates for automated communications';

-- ============================================
-- 3. Page Content Table (CMS)
-- ============================================

CREATE TABLE IF NOT EXISTS page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'html', 'json')),
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_name, section_name)
);

COMMENT ON TABLE page_content IS 'CMS for managing website content';

-- ============================================
-- 4. Assets Table
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'code_snippet', 'document', 'video')),
  url TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE assets IS 'Digital assets library';

-- ============================================
-- 5. Calendar Slots Table
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  booked_by TEXT,
  booking_type TEXT CHECK (booking_type IN ('consultation', 'briefing')),
  google_meet_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, start_time)
);

COMMENT ON TABLE calendar_slots IS 'Calendar availability and bookings';

-- ============================================
-- 6. Purchases Table
-- ============================================

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry_id TEXT REFERENCES registry(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('pdf_report', 'consultation', 'full_service')),
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE purchases IS 'Purchase transactions';

-- ============================================
-- 7. Scan History Table
-- ============================================

CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry_id TEXT REFERENCES registry(id),
  npi TEXT NOT NULL,
  url TEXT NOT NULL,
  scan_date TIMESTAMP DEFAULT NOW(),
  risk_score INTEGER,
  risk_level TEXT,
  violations JSONB,
  critical_violations JSONB,
  scan_type TEXT DEFAULT 'manual' CHECK (scan_type IN ('manual', 'auto', 'global'))
);

COMMENT ON TABLE scan_history IS 'Historical scan records';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scan_history_registry ON scan_history(registry_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_date ON scan_history(scan_date DESC);

-- ============================================
-- 8. Email Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  subject TEXT,
  status TEXT CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE email_logs IS 'Email sending audit trail';

-- Create index for querying logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- ============================================
-- 9. RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon access for public operations
CREATE POLICY "Allow anon insert purchases" ON purchases FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select purchases" ON purchases FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select calendar_slots" ON calendar_slots FOR SELECT TO anon USING (is_available = true);
CREATE POLICY "Allow anon update calendar_slots" ON calendar_slots FOR UPDATE TO anon USING (is_available = true);

CREATE POLICY "Allow anon insert scan_history" ON scan_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select scan_history" ON scan_history FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select page_content" ON page_content FOR SELECT TO anon USING (true);

-- Admin full access (authenticated users)
CREATE POLICY "Allow authenticated all email_templates" ON email_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all page_content" ON page_content FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all assets" ON assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all calendar_slots" ON calendar_slots FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all purchases" ON purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all scan_history" ON scan_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated all email_logs" ON email_logs FOR ALL TO authenticated USING (true);

-- ============================================
-- 10. Default Email Templates
-- ============================================

INSERT INTO email_templates (name, subject, html_body, event_type, variables) VALUES
('scan_complete', 'Your Texas Compliance Scan Results - {{score}}% Score', 
'<html><body><h1>Scan Complete</h1><p>Your compliance score: {{score}}%</p><p>Risk Level: {{riskLevel}}</p><p><a href="{{scanUrl}}">View Full Results</a></p></body></html>',
'scan_complete', '["score", "riskLevel", "scanUrl", "providerName"]'),

('purchase_success', 'Payment Confirmed - {{productName}}',
'<html><body><h1>Thank You!</h1><p>Your payment of ${{amount}} for {{productName}} has been confirmed.</p><p>Receipt: {{receiptUrl}}</p></body></html>',
'purchase_success', '["productName", "amount", "receiptUrl", "customerName"]'),

('consultation_booked', 'Your Compliance Consultation is Confirmed',
'<html><body><h1>Consultation Confirmed</h1><p>Date: {{date}}</p><p>Time: {{time}}</p><p><a href="{{meetLink}}">Join Google Meet</a></p></body></html>',
'consultation_booked', '["date", "time", "meetLink", "customerName"]'),

('contact_form', 'New Contact Form Submission',
'<html><body><h1>New Inquiry</h1><p>From: {{name}}</p><p>Email: {{email}}</p><p>Message: {{message}}</p></body></html>',
'contact_form', '["name", "email", "message", "phone"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_page_content_updated_at BEFORE UPDATE ON page_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. Generate Widget IDs for Existing Records
-- ============================================

UPDATE registry 
SET widget_id = 'TX-' || npi || '-' || substr(md5(random()::text), 1, 5)
WHERE widget_id IS NULL AND npi IS NOT NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'KairoLogic database migration completed successfully!';
END $$;

