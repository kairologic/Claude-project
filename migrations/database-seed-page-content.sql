-- ============================================================================
-- KairoLogic Page Content CMS - Complete Seed Data
-- Run this script in Supabase SQL Editor to populate all page content
-- This allows editing via Admin > Content tab without code changes
-- ============================================================================

-- First, ensure the page_content table exists with proper structure
CREATE TABLE IF NOT EXISTS page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page VARCHAR(100) NOT NULL,
  section VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page, section)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_content_page ON page_content(page);
CREATE INDEX IF NOT EXISTS idx_page_content_section ON page_content(page, section);

-- Clear existing content (optional - comment out if you want to preserve existing)
-- TRUNCATE page_content;

-- ============================================================================
-- HOMEPAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Hero Section
('Homepage', 'hero_badge', '🟢 SOVEREIGN MODE: ATX-01 ACTIVE', 'text', 'Green status badge text in hero'),
('Homepage', 'hero_title', 'THE <span class="text-gold">SENTRY</span><br/>COMPLIANCE STANDARD', 'html', 'Main headline with gold accent'),
('Homepage', 'hero_subtitle', 'Navigate SB 1188 and HB 149 with unwavering confidence. Your sovereign health data fortress.', 'text', 'Hero description text'),
('Homepage', 'hero_cta_primary', 'RUN COMPLIANCE SCAN', 'text', 'Primary CTA button text'),
('Homepage', 'hero_cta_secondary', 'VIEW TEXAS REGISTRY', 'text', 'Secondary CTA button text'),

-- Trust Indicators
('Homepage', 'trust_stat_1_value', '480K+', 'text', 'First trust stat number'),
('Homepage', 'trust_stat_1_label', 'Texas Providers Monitored', 'text', 'First trust stat label'),
('Homepage', 'trust_stat_2_value', '100%', 'text', 'Second trust stat number'),
('Homepage', 'trust_stat_2_label', 'SB 1188 Compliant', 'text', 'Second trust stat label'),
('Homepage', 'trust_stat_3_value', '24/7', 'text', 'Third trust stat number'),
('Homepage', 'trust_stat_3_label', 'Real-Time Monitoring', 'text', 'Third trust stat label'),

-- Value Propositions Section
('Homepage', 'value_section_title', 'Why Choose <span class="text-gold">KairoLogic?</span>', 'html', 'Value props section heading'),
('Homepage', 'value_section_subtitle', 'The only platform built specifically for Texas healthcare compliance with sovereign data architecture.', 'text', 'Value props section description'),

-- Value Prop Cards
('Homepage', 'value_card_1_title', 'Sovereign Architecture', 'text', 'First value card title'),
('Homepage', 'value_card_1_description', 'Your PHI remains on domestic nodes. No foreign cloud dependencies. Pure Texas sovereignty.', 'text', 'First value card description'),
('Homepage', 'value_card_2_title', 'Legislative Guardian', 'text', 'Second value card title'),
('Homepage', 'value_card_2_description', 'Real-time monitoring of SB 1188 and HB 149 compliance requirements and penalties.', 'text', 'Second value card description'),
('Homepage', 'value_card_3_title', 'Texas Registry', 'text', 'Third value card title'),
('Homepage', 'value_card_3_description', 'Searchable directory of 480K+ Texas healthcare providers with compliance scoring.', 'text', 'Third value card description'),
('Homepage', 'value_card_4_title', 'Risk Analytics', 'text', 'Fourth value card title'),
('Homepage', 'value_card_4_description', 'Predictive compliance scoring and drift detection to prevent violations before they occur.', 'text', 'Fourth value card description'),

-- Legislative Notice Section
('Homepage', 'notice_title', 'Statutory Enforcement Period: ACTIVE', 'text', 'Notice section heading'),
('Homepage', 'notice_text_1', 'Texas SB 1188 and HB 149 mandate that all covered entities processing protected health information (PHI) must ensure data sovereignty and maintain domestic infrastructure nodes.', 'text', 'First notice paragraph'),
('Homepage', 'notice_text_2', 'Non-compliance carries civil penalties up to <span class="text-gold font-bold">$50,000 per violation</span>, with potential criminal prosecution for willful violations.', 'html', 'Second notice paragraph with penalty highlight'),
('Homepage', 'notice_cta', 'VIEW COMPLIANCE REQUIREMENTS', 'text', 'Notice section CTA button'),

-- CTA Section
('Homepage', 'cta_title', 'Ready to Secure Your Compliance?', 'text', 'Bottom CTA section heading'),
('Homepage', 'cta_subtitle', 'Run a free compliance scan or explore our registry of Texas healthcare providers.', 'text', 'Bottom CTA section description'),
('Homepage', 'cta_button_1', 'FREE COMPLIANCE SCAN', 'text', 'First CTA button'),
('Homepage', 'cta_button_2', 'VIEW SERVICE TIERS', 'text', 'Second CTA button')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- COMPLIANCE PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Hero Section
('Compliance', 'hero_badge', 'STATUTORY VANGUARD', 'text', 'Top badge text'),
('Compliance', 'hero_title', 'The Sentry Compliance Standard', 'text', 'Page main title'),
('Compliance', 'hero_subtitle', 'A comprehensive technical and legal framework designed specifically for the Texas healthcare ecosystem. We navigate the complexities of SB 1188 and HB 149 so you can focus on patient care.', 'text', 'Hero description'),

-- Texas Legislative Mandates Section Title
('Compliance', 'mandates_title', 'Texas Legislative Mandates', 'text', 'Section heading for SB/HB cards'),

-- SB 1188 Card
('Compliance', 'sb1188_label', 'Texas Senate Bill', 'text', 'SB 1188 card label'),
('Compliance', 'sb1188_number', 'SB 1188', 'text', 'Bill number display'),
('Compliance', 'sb1188_title', 'Data Sovereignty & Residency Requirements', 'text', 'SB 1188 card title'),

('Compliance', 'sb1188_item_1_title', '📊 Sovereign Regions', 'text', 'First SB1188 requirement title'),
('Compliance', 'sb1188_item_1_text', 'All PHI (Protected Health Information) must reside on servers physically located within US domestic boundaries. Offshore cloud storage and CDN edge caching outside the US are prohibited.', 'text', 'First SB1188 requirement description'),

('Compliance', 'sb1188_item_2_title', '🔄 CDN & Edge Cache Analysis', 'text', 'Second SB1188 requirement title'),
('Compliance', 'sb1188_item_2_text', 'Content Delivery Networks must be configured to serve Texas patients exclusively from US-based edge nodes. European or Asian cache propagation triggers non-compliance.', 'text', 'Second SB1188 requirement description'),

('Compliance', 'sb1188_item_3_title', '📧 MX Record Pathing', 'text', 'Third SB1188 requirement title'),
('Compliance', 'sb1188_item_3_text', 'Email infrastructure (MX records) routing patient communications through foreign mail servers constitutes a violation.', 'text', 'Third SB1188 requirement description'),

('Compliance', 'sb1188_item_4_title', '⚖️ Sub-Processor Audit', 'text', 'Fourth SB1188 requirement title'),
('Compliance', 'sb1188_item_4_text', 'Third-party service providers (payment processors, analytics, chatbots) must demonstrate US-only data residency.', 'text', 'Fourth SB1188 requirement description'),

('Compliance', 'sb1188_penalty_title', '⚠️ Penalty: Up to $250,000', 'text', 'SB1188 penalty headline'),
('Compliance', 'sb1188_penalty_text', 'Per violation for offshore data storage of PHI', 'text', 'SB1188 penalty description'),

-- HB 149 Card
('Compliance', 'hb149_label', 'Texas House Bill', 'text', 'HB 149 card label'),
('Compliance', 'hb149_number', 'HB 149', 'text', 'Bill number display'),
('Compliance', 'hb149_title', 'AI Transparency & Disclosure Requirements', 'text', 'HB 149 card title'),

('Compliance', 'hb149_item_1_title', '📢 Conspicuous AI Disclosure Text', 'text', 'First HB149 requirement title'),
('Compliance', 'hb149_item_1_text', 'Any AI-powered tools (chatbots, scheduling assistants, symptom checkers) must display clear, prominent disclosure text in at least 14px font. "Fine print" disclaimers do not satisfy the legal standard.', 'text', 'First HB149 requirement description'),

('Compliance', 'hb149_item_2_title', '🎨 Dark Pattern Detection', 'text', 'Second HB149 requirement title'),
('Compliance', 'hb149_item_2_text', 'UI techniques that obscure AI disclosures (low opacity, hidden z-index layers, micro-fonts) are explicitly prohibited and trigger penalties.', 'text', 'Second HB149 requirement description'),

('Compliance', 'hb149_item_3_title', '🩺 Diagnostic AI Disclaimer', 'text', 'Third HB149 requirement title'),
('Compliance', 'hb149_item_3_text', 'AI tools providing medical advice or diagnosis must include explicit disclaimers stating that final decisions require licensed practitioner review.', 'text', 'Third HB149 requirement description'),

('Compliance', 'hb149_item_4_title', '💬 Chatbot Notice Requirements', 'text', 'Fourth HB149 requirement title'),
('Compliance', 'hb149_item_4_text', 'AI chatbots must disclose their non-human nature at the start of every patient interaction.', 'text', 'Fourth HB149 requirement description'),

('Compliance', 'hb149_penalty_title', '⚠️ Penalty: Up to $250,000', 'text', 'HB149 penalty headline'),
('Compliance', 'hb149_penalty_text', 'Per violation for undisclosed or deceptive AI implementations', 'text', 'HB149 penalty description'),

-- Enforcement Timeline Section
('Compliance', 'timeline_title', 'Enforcement Timeline', 'text', 'Timeline section heading'),

('Compliance', 'timeline_1_date', 'Sept 2024', 'text', 'First timeline date'),
('Compliance', 'timeline_1_label', 'Laws Enacted', 'text', 'First timeline label'),
('Compliance', 'timeline_1_text', 'SB 1188 and HB 149 signed into Texas law. Grace period begins.', 'text', 'First timeline description'),

('Compliance', 'timeline_2_date', 'Jan 2025', 'text', 'Second timeline date'),
('Compliance', 'timeline_2_label', 'Enforcement Begins', 'text', 'Second timeline label'),
('Compliance', 'timeline_2_text', 'Active enforcement period begins. Penalties now apply for non-compliance.', 'text', 'Second timeline description'),

('Compliance', 'timeline_3_date', 'Q1 2025', 'text', 'Third timeline date'),
('Compliance', 'timeline_3_label', 'Audits Begin', 'text', 'Third timeline label'),
('Compliance', 'timeline_3_text', 'Texas Attorney General begins systematic compliance audits of healthcare providers.', 'text', 'Third timeline description'),

-- CTA Section
('Compliance', 'cta_title', 'Understand Your Compliance Status', 'text', 'Bottom CTA heading'),
('Compliance', 'cta_subtitle', 'Run a comprehensive Sentry Scan to identify potential violations across data sovereignty and AI transparency requirements.', 'text', 'Bottom CTA description'),
('Compliance', 'cta_button', 'Run Compliance Scan', 'text', 'CTA button text')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- SERVICES PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Hero Section
('Services', 'hero_badge', '🔒 SB 1188 ENFORCEMENT ACTIVE', 'text', 'Hero badge text'),
('Services', 'hero_title', 'SOVEREIGN ARCHITECTURE.', 'text', 'Hero main title'),
('Services', 'hero_subtitle', 'Choose the protocol tier that aligns with your technical velocity and internal IT capability.', 'text', 'Hero description'),

-- PDF Report Tier
('Services', 'tier1_icon', '📄', 'text', 'Tier 1 icon emoji'),
('Services', 'tier1_title', 'Full PDF Report', 'text', 'Tier 1 title'),
('Services', 'tier1_description', 'Comprehensive technical remediation plan with code-level fixes.', 'text', 'Tier 1 description'),
('Services', 'tier1_price', '$1,250', 'text', 'Tier 1 price'),
('Services', 'tier1_price_note', 'one-time', 'text', 'Tier 1 price frequency'),
('Services', 'tier1_features', '["Complete scan results (all 12 compliance checks)","Detailed violation evidence with statutory references","Step-by-step technical fixes","Priority-ranked remediation roadmap","Code snippets for DNS, CDN, and server configuration"]', 'json', 'Tier 1 feature list as JSON array'),
('Services', 'tier1_cta', 'Purchase Report', 'text', 'Tier 1 button text'),

-- Technical Consultation Tier
('Services', 'tier2_badge', 'RECOMMENDED', 'text', 'Tier 2 recommended badge'),
('Services', 'tier2_icon', '👨‍💻', 'text', 'Tier 2 icon emoji'),
('Services', 'tier2_title', 'Technical Consultation', 'text', 'Tier 2 title'),
('Services', 'tier2_description', '90-minute technical briefing with remediation strategy session.', 'text', 'Tier 2 description'),
('Services', 'tier2_price', '$3,000', 'text', 'Tier 2 price'),
('Services', 'tier2_price_note', 'one-time', 'text', 'Tier 2 price frequency'),
('Services', 'tier2_features', '["Everything in PDF Report","90-minute live video consultation","Custom remediation timeline","Infrastructure-specific guidance (AWS, GCP, Azure)","Q&A with compliance specialists","30-day email support"]', 'json', 'Tier 2 feature list as JSON array'),
('Services', 'tier2_cta', 'Schedule Consultation', 'text', 'Tier 2 button text'),

-- Full Service Tier
('Services', 'tier3_icon', '🛡', 'text', 'Tier 3 icon emoji'),
('Services', 'tier3_title', 'Full Service Implementation', 'text', 'Tier 3 title'),
('Services', 'tier3_description', 'White-glove compliance transformation with ongoing monitoring.', 'text', 'Tier 3 description'),
('Services', 'tier3_price', 'Custom Pricing', 'text', 'Tier 3 price display'),
('Services', 'tier3_price_note', 'Starting at $15,000', 'text', 'Tier 3 price note'),
('Services', 'tier3_features', '["Everything in Consultation","Complete technical implementation","CDN reconfiguration & DNS migration","AI disclosure implementation","Sentry Widget installation","Quarterly compliance audits","Ongoing monitoring & alerts"]', 'json', 'Tier 3 feature list as JSON array'),
('Services', 'tier3_cta', 'Request Quote', 'text', 'Tier 3 button text'),

-- Sentry Widget Section
('Services', 'widget_title', 'The Sentry Verified Widget', 'text', 'Widget section title'),
('Services', 'widget_description', 'Display your compliance status with a live, verifiable badge on your website footer. The Sentry Widget updates in real-time based on your latest scan results.', 'text', 'Widget section description'),
('Services', 'widget_features', '["Real-time compliance verification","Builds patient trust","Automatic status updates"]', 'json', 'Widget features as JSON array'),

-- Bottom CTA
('Services', 'cta_title', 'Start With a Free Scan', 'text', 'Bottom CTA title'),
('Services', 'cta_subtitle', 'Understand your current compliance status before choosing a service tier. Our comprehensive scan identifies all critical violations.', 'text', 'Bottom CTA description'),
('Services', 'cta_button', 'Run Free Compliance Scan', 'text', 'Bottom CTA button text')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- CONTACT PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Hero Section
('Contact', 'hero_title', 'Contact & Briefing', 'text', 'Page main title'),
('Contact', 'hero_subtitle', '"Direct channel for statutory remediation, legal inquiry, and practice-specific data residency audits."', 'text', 'Hero subtitle/tagline'),

-- Hub Details Card
('Contact', 'hub_title', 'Hub Details', 'text', 'Contact info card title'),
('Contact', 'email_label', 'EMAIL', 'text', 'Email field label'),
('Contact', 'email_address', 'compliance@kairologic.net', 'text', 'Contact email address'),
('Contact', 'hq_label', 'HQ', 'text', 'HQ field label'),
('Contact', 'hq_address', 'Austin, TX // ATX-01 Node', 'text', 'HQ address display'),

-- Remediation Card
('Contact', 'remediation_title', 'Remediation Required?', 'text', 'Remediation card title'),
('Contact', 'remediation_text', 'If you have received a ''Cure Notice'' from the Attorney General, prioritize scheduling a Technical Briefing.', 'text', 'Remediation card description'),
('Contact', 'remediation_cta', 'PRIORITIZE MY PRACTICE', 'text', 'Remediation card button'),

-- Form
('Contact', 'form_title', 'Send Message', 'text', 'Contact form title'),
('Contact', 'form_success_title', 'Message Sent!', 'text', 'Form success title'),
('Contact', 'form_success_text', 'We''ll respond within 24 hours', 'text', 'Form success description'),
('Contact', 'form_submit_button', 'Send Message', 'text', 'Form submit button text')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- SCAN PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
('Scan', 'hero_badge', '🔍 COMPLIANCE VERIFICATION', 'text', 'Hero badge text'),
('Scan', 'hero_title', 'Run Sentry Scan', 'text', 'Page main title'),
('Scan', 'hero_subtitle', 'Verify your compliance status in 60 seconds. Identify violations across SB 1188 and HB 149 requirements.', 'text', 'Hero description'),
('Scan', 'form_title', 'Provider Information', 'text', 'Form card title'),
('Scan', 'form_submit', 'Start Compliance Scan', 'text', 'Form submit button text'),
('Scan', 'checks_title', 'What We Check', 'text', 'Checks section title'),

-- Check categories
('Scan', 'check_1_title', 'Data Sovereignty (SB 1188)', 'text', 'First check category title'),
('Scan', 'check_1_items', '["IP geo-location","CDN & edge cache","MX record pathing","Sub-processor audit"]', 'json', 'First check category items'),
('Scan', 'check_2_title', 'AI Transparency (HB 149)', 'text', 'Second check category title'),
('Scan', 'check_2_items', '["AI disclosure text","Dark pattern detection","Diagnostic AI disclaimers","Chatbot notices"]', 'json', 'Second check category items'),
('Scan', 'check_3_title', 'EHR Integrity', 'text', 'Third check category title'),
('Scan', 'check_3_items', '["Biological sex fields","Parental access portal","Metabolic health tracking","Forbidden data fields"]', 'json', 'Third check category items'),
('Scan', 'check_4_title', 'What You Get', 'text', 'Fourth check category title'),
('Scan', 'check_4_items', '["Risk score & level","Critical violations","Email summary","Remediation options"]', 'json', 'Fourth check category items')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- REGISTRY PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
('Registry', 'hero_badge', '📊 TEXAS PROVIDER DIRECTORY', 'text', 'Hero badge text'),
('Registry', 'hero_title', 'Texas Provider Registry', 'text', 'Page main title'),
('Registry', 'hero_subtitle', 'Searchable directory of 480,000+ Texas healthcare providers with compliance status tracking.', 'text', 'Hero description'),
('Registry', 'search_placeholder', 'Search by name, NPI, or city...', 'text', 'Search input placeholder'),
('Registry', 'empty_state_title', 'No providers found', 'text', 'Empty state title'),
('Registry', 'empty_state_text', 'Try a different search term', 'text', 'Empty state description')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- HEADER & FOOTER (GLOBAL COMPONENTS)
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
-- Header
('Header', 'logo_text', 'KairoLogic', 'text', 'Logo text'),
('Header', 'logo_tagline', 'Statutory Vanguard', 'text', 'Logo tagline'),
('Header', 'nav_compliance', 'Compliance', 'text', 'Nav link 1'),
('Header', 'nav_services', 'Services', 'text', 'Nav link 2'),
('Header', 'nav_registry', 'Registry', 'text', 'Nav link 3'),
('Header', 'nav_insights', 'Insights', 'text', 'Nav link 4'),
('Header', 'nav_contact', 'Contact', 'text', 'Nav link 5'),
('Header', 'cta_button', 'Run Sentry Scan', 'text', 'Header CTA button'),

-- Footer
('Footer', 'tagline', 'Your Sovereign Compliance Standard', 'text', 'Footer tagline'),
('Footer', 'copyright', '© 2026 KairoLogic. All rights reserved.', 'text', 'Copyright text'),
('Footer', 'nav_title_1', 'Registry Path', 'text', 'First footer nav column title'),
('Footer', 'nav_title_2', 'Legal', 'text', 'Second footer nav column title'),
('Footer', 'privacy_link', 'Privacy Policy', 'text', 'Privacy policy link text'),
('Footer', 'terms_link', 'Terms of Service', 'text', 'Terms link text'),
('Footer', 'bottom_text', 'Built for Texas Healthcare Providers', 'text', 'Bottom footer text')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- CONSULTATION PAGE CONTENT
-- ============================================================================

INSERT INTO page_content (page, section, content, content_type, description) VALUES
('Consultation', 'hero_title', 'Schedule Technical Consultation', 'text', 'Page main title'),
('Consultation', 'hero_subtitle', 'Book a 90-minute technical briefing with our compliance specialists to develop your remediation strategy.', 'text', 'Hero description'),
('Consultation', 'form_title', 'Consultation Details', 'text', 'Form title'),
('Consultation', 'includes_title', 'What''s Included', 'text', 'Includes section title'),
('Consultation', 'includes_items', '["90-minute video consultation","Custom remediation timeline","Infrastructure-specific guidance","Q&A session","30-day email support","Full PDF Report"]', 'json', 'Includes list as JSON array'),
('Consultation', 'price', '$3,000', 'text', 'Consultation price')

ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- VERIFY INSERTION
-- ============================================================================

-- Show count by page
SELECT page, COUNT(*) as sections FROM page_content GROUP BY page ORDER BY page;

-- Show total
SELECT 'Total content sections:' as label, COUNT(*) as count FROM page_content;

