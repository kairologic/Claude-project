-- KairoLogic Platform Database Migrations v2
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Registry Table - Add provider_type column
-- ============================================

ALTER TABLE registry ADD COLUMN IF NOT EXISTS provider_type INTEGER DEFAULT 2;
COMMENT ON COLUMN registry.provider_type IS '1 = Type 1 Provider, 2 = Type 2 Provider';

-- ============================================
-- 2. Scan Results Table (for storing actual scan findings)
-- ============================================

CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry_id TEXT REFERENCES registry(id),
  npi TEXT NOT NULL,
  url TEXT NOT NULL,
  scan_date TIMESTAMP DEFAULT NOW(),
  scan_type TEXT DEFAULT 'manual' CHECK (scan_type IN ('manual', 'auto', 'global')),
  
  -- Overall scores
  risk_score INTEGER,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- SB 1188 Data Sovereignty findings
  sb1188_findings JSONB,
  sb1188_pass_count INTEGER DEFAULT 0,
  sb1188_fail_count INTEGER DEFAULT 0,
  
  -- HB 149 AI Transparency findings  
  hb149_findings JSONB,
  hb149_pass_count INTEGER DEFAULT 0,
  hb149_fail_count INTEGER DEFAULT 0,
  
  -- Technical fixes needed
  technical_fixes JSONB,
  
  -- Raw scan data
  raw_scan_data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE scan_results IS 'Detailed scan results for each provider scan';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_results_registry ON scan_results(registry_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_npi ON scan_results(npi);
CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(scan_date DESC);

-- RLS
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert scan_results" ON scan_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select scan_results" ON scan_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon all scan_results" ON scan_results FOR ALL TO anon USING (true);

-- ============================================
-- 3. Violation Evidence Table (for detailed findings)
-- ============================================

CREATE TABLE IF NOT EXISTS violation_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry_id TEXT,
  scan_result_id UUID REFERENCES scan_results(id),
  violation_id TEXT NOT NULL,
  violation_name TEXT NOT NULL,
  violation_clause TEXT,
  regulation TEXT CHECK (regulation IN ('SB1188', 'HB149')),
  technical_finding TEXT,
  recommended_fix TEXT,
  fix_priority TEXT CHECK (fix_priority IN ('Critical', 'High', 'Medium', 'Low')),
  fix_complexity TEXT CHECK (fix_complexity IN ('High', 'Medium', 'Low')),
  evidence_data JSONB,
  captured_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE violation_evidence IS 'Detailed violation evidence with technical fixes';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_violation_evidence_registry ON violation_evidence(registry_id);
CREATE INDEX IF NOT EXISTS idx_violation_evidence_scan ON violation_evidence(scan_result_id);

-- RLS
ALTER TABLE violation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all violation_evidence" ON violation_evidence FOR ALL TO anon USING (true);

-- ============================================
-- 4. Page Content Table - Fix columns and add seed data
-- ============================================

-- Drop and recreate with correct columns
DROP TABLE IF EXISTS page_content CASCADE;

CREATE TABLE page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'json', 'markdown', 'image_url')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page, section)
);

COMMENT ON TABLE page_content IS 'CMS for managing website content';

-- RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select page_content" ON page_content FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon all page_content" ON page_content FOR ALL TO anon USING (true);

-- Seed data for Page Content
INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Homepage
('Homepage', 'hero_title', 'The Sentry Compliance Standard', 'text', 'Main hero title on homepage'),
('Homepage', 'hero_subtitle', 'Navigate Texas SB 1188 and HB 149 with confidence. Comprehensive compliance scanning for healthcare providers.', 'text', 'Hero subtitle/description'),
('Homepage', 'cta_primary', 'Run Free Scan', 'text', 'Primary call-to-action button text'),
('Homepage', 'cta_secondary', 'Learn More', 'text', 'Secondary call-to-action button text'),
('Homepage', 'feature_1_title', 'Data Sovereignty', 'text', 'Feature 1 title'),
('Homepage', 'feature_1_desc', 'Verify your patient data stays within US borders as required by Texas SB 1188.', 'text', 'Feature 1 description'),
('Homepage', 'feature_2_title', 'AI Transparency', 'text', 'Feature 2 title'),
('Homepage', 'feature_2_desc', 'Ensure compliant AI disclosures per Texas HB 149 requirements.', 'text', 'Feature 2 description'),
('Homepage', 'feature_3_title', 'Compliance Reports', 'text', 'Feature 3 title'),
('Homepage', 'feature_3_desc', 'Detailed technical reports with remediation guidance.', 'text', 'Feature 3 description'),

-- Header
('Header', 'logo_text', 'KairoLogic', 'text', 'Logo text in header'),
('Header', 'nav_home', 'Home', 'text', 'Navigation link'),
('Header', 'nav_services', 'Services', 'text', 'Navigation link'),
('Header', 'nav_compliance', 'Compliance', 'text', 'Navigation link'),
('Header', 'nav_registry', 'Registry', 'text', 'Navigation link'),
('Header', 'nav_contact', 'Contact', 'text', 'Navigation link'),

-- Footer
('Footer', 'company_name', 'KairoLogic', 'text', 'Company name in footer'),
('Footer', 'tagline', 'The Sentry Compliance Standard', 'text', 'Company tagline'),
('Footer', 'copyright', '© 2026 KairoLogic. All rights reserved.', 'text', 'Copyright text'),
('Footer', 'address', 'Austin, Texas', 'text', 'Company address'),
('Footer', 'email', 'compliance@kairologic.com', 'text', 'Contact email'),
('Footer', 'phone', '(512) 555-0149', 'text', 'Contact phone'),

-- Services Page
('Services', 'page_title', 'Our Services', 'text', 'Services page title'),
('Services', 'page_subtitle', 'Comprehensive compliance solutions for Texas healthcare providers', 'text', 'Services page subtitle'),
('Services', 'service_1_title', 'Compliance Scanning', 'text', 'Service 1 title'),
('Services', 'service_1_desc', 'Automated scanning of your digital infrastructure for SB 1188 and HB 149 compliance.', 'text', 'Service 1 description'),
('Services', 'service_1_price', '$149', 'text', 'Service 1 price'),
('Services', 'service_2_title', 'Detailed Reports', 'text', 'Service 2 title'),
('Services', 'service_2_desc', 'Technical findings with step-by-step remediation guidance from compliance experts.', 'text', 'Service 2 description'),
('Services', 'service_2_price', '$299', 'text', 'Service 2 price'),
('Services', 'service_3_title', 'Full Remediation', 'text', 'Service 3 title'),
('Services', 'service_3_desc', 'End-to-end compliance remediation including implementation support.', 'text', 'Service 3 description'),
('Services', 'service_3_price', '$999', 'text', 'Service 3 price'),

-- Compliance Page
('Compliance', 'page_title', 'Texas Healthcare Compliance', 'text', 'Compliance page title'),
('Compliance', 'sb1188_title', 'SB 1188 - Data Sovereignty', 'text', 'SB 1188 section title'),
('Compliance', 'sb1188_desc', 'Texas Senate Bill 1188 requires healthcare providers to ensure patient health information remains within US borders.', 'text', 'SB 1188 description'),
('Compliance', 'hb149_title', 'HB 149 - AI Transparency', 'text', 'HB 149 section title'),
('Compliance', 'hb149_desc', 'Texas House Bill 149 mandates clear and conspicuous disclosure when AI is used in patient care pathways.', 'text', 'HB 149 description'),

-- Contact Page
('Contact', 'page_title', 'Contact Us', 'text', 'Contact page title'),
('Contact', 'page_subtitle', 'Get in touch with our compliance team', 'text', 'Contact page subtitle'),
('Contact', 'form_name_label', 'Your Name', 'text', 'Form field label'),
('Contact', 'form_email_label', 'Email Address', 'text', 'Form field label'),
('Contact', 'form_message_label', 'Message', 'text', 'Form field label'),
('Contact', 'form_submit', 'Send Message', 'text', 'Submit button text')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- ============================================
-- 5. Assets Table - Add seed data
-- ============================================

INSERT INTO assets (name, type, content, metadata) VALUES
('AI Disclosure Banner HTML', 'code_snippet', 
'<div class="ai-disclosure" style="background: #FFF3CD; padding: 15px; margin: 20px 0; border-left: 4px solid #FFA500; border-radius: 4px;">
  <strong>⚠️ AI Disclosure:</strong> This practice uses AI-assisted tools to support clinical decision-making. 
  All AI-generated recommendations are reviewed by a licensed healthcare practitioner before being used in patient care.
</div>', 
'{"category": "compliance", "regulation": "HB149", "usage": "Add to homepage and patient portal"}'),

('Data Residency Notice HTML', 'code_snippet',
'<div class="data-notice" style="background: #D4EDDA; padding: 15px; margin: 20px 0; border-left: 4px solid #28A745; border-radius: 4px;">
  <strong>🔒 Data Security:</strong> Your health information is stored exclusively on servers located within the United States, 
  in compliance with Texas SB 1188 data sovereignty requirements.
</div>',
'{"category": "compliance", "regulation": "SB1188", "usage": "Add to privacy policy and patient portal"}'),

('Sentry Widget Embed Code', 'code_snippet',
'<script>
  (function(){
    var e=document.createElement("script");
    e.src="https://widget.kairologic.com/sentry.js";
    e.async=true;
    e.dataset.npi="YOUR_NPI_HERE";
    document.body.appendChild(e);
  })();
</script>',
'{"category": "widget", "usage": "Add before closing </body> tag"}')

ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Update Function for timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for page_content
DROP TRIGGER IF EXISTS update_page_content_updated_at ON page_content;
CREATE TRIGGER update_page_content_updated_at 
  BEFORE UPDATE ON page_content 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'KairoLogic database migration v2 completed! Page content seeded with sample data.';
END $$;
