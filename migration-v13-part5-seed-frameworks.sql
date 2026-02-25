-- ============================================================
-- KairoLogic Migration v13 - PART 5: Seed Compliance Frameworks
-- Seeds initial framework definitions and widget display configs
-- for TX SB 1188, TX HB 149, HIPAA, GDPR, ADA/WCAG, and SOC 2.
-- Run AFTER Part 4.
-- ============================================================

-- -----------------------------------------------
-- Seed: compliance_frameworks
-- -----------------------------------------------

-- TX SB 1188 - Data Sovereignty
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'TX-SB1188',
    'Texas Data Sovereignty Act (SB 1188)',
    'Requires healthcare providers to ensure patient data is not routed through or stored in foreign jurisdictions. Mandates data residency within US borders for all PHI and PII.',
    'Texas',
    'Healthcare',
    'data_sovereignty',
    'Texas Senate Bill 1188, 89th Legislature, Regular Session (2025)',
    '2025-09-01',
    'Up to $250,000 per knowing violation. Civil penalties for negligent violations.',
    '["NPI-01","NPI-02","NPI-03","RST-01"]'::jsonb,
    75
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    penalty_description = EXCLUDED.penalty_description,
    check_plugins = EXCLUDED.check_plugins, updated_at = NOW();

-- TX HB 149 - AI Transparency
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'TX-HB149',
    'Texas AI Transparency Act (HB 149)',
    'Requires healthcare websites to disclose any use of artificial intelligence in patient-facing interactions, including chatbots, scheduling systems, and diagnostic tools.',
    'Texas',
    'Healthcare',
    'ai_transparency',
    'Texas House Bill 149, 89th Legislature, Regular Session (2025)',
    '2025-09-01',
    'Civil penalties for failure to disclose AI usage on patient-facing healthcare websites.',
    '[]'::jsonb,
    75
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    check_plugins = EXCLUDED.check_plugins, updated_at = NOW();

-- HIPAA
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'HIPAA',
    'Health Insurance Portability and Accountability Act',
    'Federal regulations for protecting sensitive patient health information. Covers Privacy Rule, Security Rule, and Breach Notification Rule requirements for covered entities.',
    'Federal',
    'Healthcare',
    'privacy',
    'Public Law 104-191 (1996), HITECH Act (2009)',
    '1996-08-21',
    '$100 to $50,000 per violation, max $1.5M per year per violation category. Criminal penalties up to $250,000 and 10 years imprisonment.',
    '[]'::jsonb,
    80
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    penalty_description = EXCLUDED.penalty_description, updated_at = NOW();

-- GDPR
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'GDPR',
    'General Data Protection Regulation',
    'EU regulation on data protection and privacy. Applies to any organization processing personal data of EU residents, including cookie consent, data processing agreements, and right to erasure.',
    'EU',
    'All',
    'privacy',
    'Regulation (EU) 2016/679',
    '2018-05-25',
    'Up to 4% of annual global turnover or EUR 20 million, whichever is greater.',
    '[]'::jsonb,
    80
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    penalty_description = EXCLUDED.penalty_description, updated_at = NOW();

-- ADA/WCAG
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'ADA-WCAG',
    'ADA Web Accessibility (WCAG 2.1)',
    'Web Content Accessibility Guidelines ensuring websites are accessible to people with disabilities. Covers perceivable, operable, understandable, and robust content requirements.',
    'Federal',
    'All',
    'accessibility',
    'Americans with Disabilities Act (1990), WCAG 2.1 Level AA',
    '1990-07-26',
    'Demand letters typically seek $10,000-$75,000 in settlements. DOJ enforcement actions can result in significant civil penalties.',
    '[]'::jsonb,
    70
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    penalty_description = EXCLUDED.penalty_description, updated_at = NOW();

-- SOC 2
INSERT INTO compliance_frameworks (framework_id, name, description, jurisdiction, industry, category, statute_reference, effective_date, penalty_description, check_plugins, compliance_threshold)
VALUES (
    'SOC2',
    'SOC 2 Type II Compliance',
    'Service Organization Control 2 framework for managing customer data based on five trust service criteria: security, availability, processing integrity, confidentiality, and privacy.',
    'Global',
    'All',
    'security',
    'AICPA Trust Services Criteria (TSC)',
    NULL,
    'No direct penalties, but loss of SOC 2 certification can result in loss of enterprise contracts and customer trust.',
    '[]'::jsonb,
    80
)
ON CONFLICT (framework_id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

-- -----------------------------------------------
-- Seed: framework_display_configs
-- -----------------------------------------------

-- TX SB 1188 widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'TX-SB1188',
    'Data Sovereignty Verified',
    '#00234E',
    'shield',
    'SB 1188 Compliant',
    '[
        {"icon":"globe","label":"Data Residency","description":"All patient data routed within US borders","status":"verified"},
        {"icon":"server","label":"Hosting Location","description":"Infrastructure verified as domestic","status":"verified"},
        {"icon":"lock","label":"Border Security","description":"No foreign data routing detected","status":"verified"},
        {"icon":"scan","label":"Third-Party Audit","description":"External scripts and endpoints verified","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"SB 1188","title":"Texas Data Sovereignty Act","url":"https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=SB1188"}
    ]'::jsonb,
    1
)
ON CONFLICT DO NOTHING;

-- TX HB 149 widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'TX-HB149',
    'AI Transparency Verified',
    '#00234E',
    'eye',
    'HB 149 Compliant',
    '[
        {"icon":"bot","label":"AI Disclosure","description":"All AI usage properly disclosed to patients","status":"verified"},
        {"icon":"file-text","label":"Transparency Notice","description":"AI transparency notice present on website","status":"verified"},
        {"icon":"users","label":"Patient Communication","description":"AI interactions clearly labeled","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"HB 149","title":"Texas AI Transparency Act","url":"https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149"}
    ]'::jsonb,
    2
)
ON CONFLICT DO NOTHING;

-- HIPAA widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'HIPAA',
    'HIPAA Compliance Monitored',
    '#1a5276',
    'heart-pulse',
    'HIPAA Monitored',
    '[
        {"icon":"lock","label":"PHI Protection","description":"Protected health information safeguards active","status":"verified"},
        {"icon":"shield","label":"Security Rule","description":"Technical safeguards implemented","status":"verified"},
        {"icon":"file-check","label":"BAA Compliance","description":"Business Associate Agreements verified","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"HIPAA","title":"Health Insurance Portability and Accountability Act","url":"https://www.hhs.gov/hipaa/index.html"}
    ]'::jsonb,
    3
)
ON CONFLICT DO NOTHING;

-- GDPR widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'GDPR',
    'GDPR Data Protection Verified',
    '#2c3e50',
    'flag',
    'GDPR Compliant',
    '[
        {"icon":"cookie","label":"Cookie Consent","description":"Cookie consent mechanism properly implemented","status":"verified"},
        {"icon":"file-text","label":"Privacy Policy","description":"GDPR-compliant privacy policy published","status":"verified"},
        {"icon":"trash","label":"Right to Erasure","description":"Data deletion mechanisms available","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"GDPR","title":"General Data Protection Regulation (EU)","url":"https://gdpr.eu/"}
    ]'::jsonb,
    4
)
ON CONFLICT DO NOTHING;

-- ADA/WCAG widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'ADA-WCAG',
    'Accessibility Verified',
    '#27ae60',
    'accessibility',
    'WCAG 2.1 AA',
    '[
        {"icon":"eye","label":"Perceivable","description":"Content available to all senses","status":"verified"},
        {"icon":"mouse-pointer","label":"Operable","description":"Interface navigable by all input methods","status":"verified"},
        {"icon":"book-open","label":"Understandable","description":"Content readable and predictable","status":"verified"},
        {"icon":"code","label":"Robust","description":"Compatible with assistive technologies","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"ADA","title":"Americans with Disabilities Act","url":"https://www.ada.gov/"},
        {"statute":"WCAG 2.1","title":"Web Content Accessibility Guidelines","url":"https://www.w3.org/WAI/WCAG21/quickref/"}
    ]'::jsonb,
    5
)
ON CONFLICT DO NOTHING;

-- SOC 2 widget display
INSERT INTO framework_display_configs (framework_id, banner_text, banner_color, badge_icon, badge_label, trust_rows, legal_refs, display_order)
VALUES (
    'SOC2',
    'SOC 2 Compliance Monitored',
    '#8e44ad',
    'award',
    'SOC 2 Type II',
    '[
        {"icon":"shield","label":"Security","description":"Security controls actively monitored","status":"verified"},
        {"icon":"activity","label":"Availability","description":"System availability tracked and verified","status":"verified"},
        {"icon":"check-circle","label":"Processing Integrity","description":"Data processing accuracy verified","status":"verified"},
        {"icon":"lock","label":"Confidentiality","description":"Confidential data protections in place","status":"verified"}
    ]'::jsonb,
    '[
        {"statute":"SOC 2","title":"AICPA Service Organization Control","url":"https://www.aicpa.org/topic/audit-assurance/audit-and-assurance-greater-than-soc-2"}
    ]'::jsonb,
    6
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------
-- Seed: Default TX frameworks for all existing
-- Shield/Watch subscribers (assign SB 1188 + HB 149)
-- -----------------------------------------------
-- NOTE: Run this only if you want to auto-assign
-- Texas frameworks to existing active providers.
-- Uncomment the block below to execute:
--
-- INSERT INTO provider_frameworks (npi, registry_id, framework_id, is_active)
-- SELECT npi, id::text, 'TX-SB1188', TRUE
-- FROM registry
-- WHERE subscription_status IN ('trial', 'active')
-- ON CONFLICT (npi, framework_id) DO NOTHING;
--
-- INSERT INTO provider_frameworks (npi, registry_id, framework_id, is_active)
-- SELECT npi, id::text, 'TX-HB149', TRUE
-- FROM registry
-- WHERE subscription_status IN ('trial', 'active')
-- ON CONFLICT (npi, framework_id) DO NOTHING;

-- -----------------------------------------------
-- Verify seed data
-- -----------------------------------------------
SELECT framework_id, name, jurisdiction, category, compliance_threshold
FROM compliance_frameworks ORDER BY framework_id;

SELECT fdc.framework_id, fdc.badge_label, fdc.banner_text, fdc.display_order
FROM framework_display_configs fdc
ORDER BY fdc.display_order;
