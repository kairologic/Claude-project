-- ============================================================
-- KairoLogic Migration v13 - PART 7: Seed Texas State Content
-- Seeds the state_configs, regulations, and state_products
-- tables with Texas data as the first state in the
-- multi-state content model.
-- Run AFTER Part 6.
-- ============================================================

-- -----------------------------------------------
-- Seed: state_configs — Texas
-- -----------------------------------------------
INSERT INTO state_configs (
    state_code, state_name, slug,
    headline, subheadline, hero_stat, hero_stat_label, urgency_message,
    provider_count, regulation_count,
    meta_title, meta_description,
    geo_lat, geo_lng, geo_hint_message,
    display_order, is_active, is_featured,
    accent_color
)
VALUES (
    'TX', 'Texas', 'texas',
    'Texas Healthcare Data Sovereignty & AI Compliance',
    'Continuous monitoring to keep your practice compliant with SB 1188 and HB 149 — before enforcement catches up.',
    '481,000+', 'Licensed Healthcare Providers in Texas',
    'SB 1188 and HB 149 are enforceable now. Penalties up to $250,000 per knowing violation.',
    481277, 2,
    'Texas Healthcare Compliance Scanner — SB 1188 & HB 149 | KairoLogic',
    'Monitor your Texas healthcare practice for SB 1188 data sovereignty and HB 149 AI transparency compliance. Free scan in 60 seconds. Penalties up to $250,000.',
    31.000000, -100.000000,
    'It looks like you''re in Texas. See Texas compliance requirements →',
    1, TRUE, TRUE,
    '#00234E'
)
ON CONFLICT (state_code) DO UPDATE SET
    headline = EXCLUDED.headline, subheadline = EXCLUDED.subheadline,
    hero_stat = EXCLUDED.hero_stat, urgency_message = EXCLUDED.urgency_message,
    provider_count = EXCLUDED.provider_count, regulation_count = EXCLUDED.regulation_count,
    meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
    updated_at = NOW();

-- -----------------------------------------------
-- Seed: regulations — TX SB 1188
-- -----------------------------------------------
INSERT INTO regulations (
    state_code, framework_id, law_code, slug, display_name, short_name,
    effective_date, enforcement_date, enforcement_body, legislative_session,
    penalty_description, penalty_amount_max, penalty_type,
    summary_short, summary_long,
    key_requirements, who_it_affects, who_it_affects_details,
    compliance_steps, faq, related_resources,
    meta_title, meta_description,
    display_order, is_active
)
VALUES (
    'TX', 'TX-SB1188', 'sb-1188', 'sb-1188',
    'Senate Bill 1188 — Texas Data Sovereignty Act',
    'SB 1188',
    '2025-09-01', '2025-09-01',
    'Texas Attorney General',
    '89th Legislature, Regular Session (2025)',
    'Up to $250,000 per knowing violation. Civil penalties for negligent violations. The Texas Attorney General has enforcement authority with investigative subpoena power.',
    '$250,000 per knowing violation',
    'civil',

    -- summary_short
    'Requires Texas healthcare providers to ensure patient data is not routed through or stored in foreign jurisdictions. All PHI and PII must remain within US borders.',

    -- summary_long
    'Texas Senate Bill 1188 establishes data sovereignty requirements for healthcare providers operating in the state. The law mandates that all protected health information (PHI) and personally identifiable information (PII) collected by healthcare websites remain within United States borders during transmission, processing, and storage. This includes third-party scripts, analytics services, font providers, CDN endpoints, and any other technology that handles patient data. Providers must conduct regular audits to verify their digital supply chain does not route data through foreign servers.',

    -- key_requirements
    '[
        {"title":"Data Residency","description":"All patient data (PHI/PII) must be stored and processed within US borders. No foreign routing allowed.","icon":"globe"},
        {"title":"Third-Party Script Audit","description":"All external scripts (analytics, fonts, CDNs, chat widgets) must be verified to not route data overseas.","icon":"code"},
        {"title":"Vendor Due Diligence","description":"Healthcare providers must verify that their technology vendors maintain US-based infrastructure.","icon":"search"},
        {"title":"Continuous Monitoring","description":"Ongoing compliance monitoring required — a one-time audit is not sufficient.","icon":"activity"},
        {"title":"Incident Reporting","description":"Data sovereignty breaches must be reported to the Texas AG within the statutory timeframe.","icon":"alert-triangle"},
        {"title":"Safe Harbor Documentation","description":"Providers who maintain documented compliance programs may qualify for reduced penalties.","icon":"shield"}
    ]'::jsonb,

    'All licensed healthcare providers in Texas with patient-facing websites or digital services.',

    -- who_it_affects_details
    '[
        {"group":"Physicians & Surgeons","description":"All licensed physicians operating practices with websites in Texas."},
        {"group":"Dentists","description":"Dental practices with online appointment booking, patient portals, or marketing websites."},
        {"group":"Physical Therapists","description":"PT clinics with websites that collect patient information."},
        {"group":"Mental Health Providers","description":"Therapists and counselors with online intake forms or telehealth portals."},
        {"group":"Telehealth Providers","description":"Any provider offering virtual care to Texas patients, regardless of provider location."},
        {"group":"Healthcare Systems","description":"Hospital systems and multi-location practices with centralized web infrastructure."}
    ]'::jsonb,

    -- compliance_steps
    '[
        {"step_number":1,"title":"Run a Free Compliance Scan","description":"Use the KairoLogic scanner to identify foreign data routing on your website in under 60 seconds."},
        {"step_number":2,"title":"Review Your Forensic Report","description":"Understand exactly which scripts, endpoints, and vendors are routing patient data outside US borders."},
        {"step_number":3,"title":"Remediate Violations","description":"Follow the prioritized Remedial Engineering Roadmap to fix critical issues first."},
        {"step_number":4,"title":"Activate Continuous Monitoring","description":"Deploy the SentryShield widget for ongoing compliance monitoring and drift detection."},
        {"step_number":5,"title":"Maintain Safe Harbor","description":"Keep your compliance documentation current with monthly forensic reports."}
    ]'::jsonb,

    -- faq
    '[
        {"question":"When does SB 1188 take effect?","answer":"SB 1188 is enforceable as of September 1, 2025. Providers should be compliant now to avoid penalties."},
        {"question":"What counts as ''foreign routing'' of patient data?","answer":"Any instance where patient data (including metadata, IP addresses, or form submissions) passes through a server located outside the United States. This includes Google Fonts served from overseas CDN nodes, analytics scripts that route through EU data centers, and chat widgets hosted on foreign infrastructure."},
        {"question":"Does SB 1188 apply to my practice if we use a website builder like Wix or Squarespace?","answer":"Yes. You are responsible for the data routing behavior of your entire website, including all third-party scripts and services embedded in it, regardless of which platform you use to build it."},
        {"question":"What is Safe Harbor and how do I qualify?","answer":"Safe Harbor is a legal protection that reduces penalties for providers who can demonstrate a documented, good-faith compliance program. KairoLogic''s forensic reports and continuous monitoring provide the evidence needed to establish Safe Harbor."},
        {"question":"How much are the penalties for non-compliance?","answer":"Up to $250,000 per knowing violation. Even negligent violations carry civil penalties. The Texas Attorney General has enforcement authority."},
        {"question":"Do I need to check my website more than once?","answer":"Yes. Websites change constantly — plugin updates, new scripts, CDN changes, and vendor migrations can introduce foreign routing at any time. Monthly monitoring is the standard of care."}
    ]'::jsonb,

    -- related_resources
    '[
        {"title":"Full Bill Text — SB 1188","url":"https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=SB1188","type":"external"},
        {"title":"Texas Attorney General — Healthcare Compliance","url":"https://www.texasattorneygeneral.gov/","type":"external"},
        {"title":"Run a Free Compliance Scan","url":"/compliance-scan","type":"internal"},
        {"title":"SentryShield Continuous Monitoring","url":"/services","type":"internal"}
    ]'::jsonb,

    'Texas SB 1188 Data Sovereignty Compliance — Healthcare Provider Guide | KairoLogic',
    'Everything Texas healthcare providers need to know about SB 1188 data sovereignty requirements. Penalties, deadlines, compliance steps, and free scanning tools.',
    1, TRUE
)
ON CONFLICT (state_code, law_code) DO UPDATE SET
    display_name = EXCLUDED.display_name, summary_short = EXCLUDED.summary_short,
    summary_long = EXCLUDED.summary_long, key_requirements = EXCLUDED.key_requirements,
    faq = EXCLUDED.faq, compliance_steps = EXCLUDED.compliance_steps,
    updated_at = NOW();

-- -----------------------------------------------
-- Seed: regulations — TX HB 149
-- -----------------------------------------------
INSERT INTO regulations (
    state_code, framework_id, law_code, slug, display_name, short_name,
    effective_date, enforcement_date, enforcement_body, legislative_session,
    penalty_description, penalty_amount_max, penalty_type,
    summary_short, summary_long,
    key_requirements, who_it_affects, who_it_affects_details,
    compliance_steps, faq, related_resources,
    meta_title, meta_description,
    display_order, is_active
)
VALUES (
    'TX', 'TX-HB149', 'hb-149', 'hb-149',
    'House Bill 149 — Texas AI Transparency Act',
    'HB 149',
    '2025-09-01', '2025-09-01',
    'Texas Attorney General',
    '89th Legislature, Regular Session (2025)',
    'Civil penalties for failure to disclose AI usage on patient-facing healthcare websites. Enforcement by the Texas Attorney General.',
    'Civil penalties (amount varies)',
    'civil',

    -- summary_short
    'Requires healthcare providers to disclose any use of artificial intelligence in patient-facing interactions on their websites.',

    -- summary_long
    'Texas House Bill 149 mandates that healthcare providers transparently disclose the use of artificial intelligence in any patient-facing digital interaction. This includes AI-powered chatbots, automated scheduling systems, symptom checkers, diagnostic suggestion tools, and any other AI-driven functionality on healthcare websites. Providers must display clear, conspicuous notices informing patients when they are interacting with or receiving output from an AI system.',

    -- key_requirements
    '[
        {"title":"AI Disclosure Notice","description":"A clear, conspicuous disclosure must be present on any page where AI interacts with patients.","icon":"eye"},
        {"title":"Chatbot Identification","description":"AI-powered chatbots must clearly identify themselves as artificial intelligence, not human staff.","icon":"bot"},
        {"title":"Scheduling System Disclosure","description":"If AI assists in appointment scheduling or triage, this must be disclosed to patients.","icon":"calendar"},
        {"title":"Diagnostic Tool Transparency","description":"Any AI-based symptom checkers or diagnostic suggestions must include AI disclosure.","icon":"stethoscope"},
        {"title":"Third-Party AI Tools","description":"AI tools embedded from third parties (e.g., chatbot vendors) still require provider-side disclosure.","icon":"puzzle"}
    ]'::jsonb,

    'All licensed healthcare providers in Texas using AI on patient-facing websites or digital services.',

    -- who_it_affects_details
    '[
        {"group":"Practices Using AI Chatbots","description":"Any practice with an AI-powered chat widget on their website for patient inquiries."},
        {"group":"Telehealth Providers","description":"Virtual care platforms using AI for triage, symptom assessment, or scheduling."},
        {"group":"Practices with AI Scheduling","description":"Offices using AI-assisted appointment booking or patient intake systems."},
        {"group":"Websites with AI Content","description":"Practices using AI-generated content for patient education or FAQs."}
    ]'::jsonb,

    -- compliance_steps
    '[
        {"step_number":1,"title":"Audit AI Usage","description":"Identify all AI-powered tools on your website — chatbots, scheduling systems, symptom checkers, content generators."},
        {"step_number":2,"title":"Scan for Hidden AI","description":"Use the KairoLogic scanner to detect third-party scripts that use AI without obvious disclosure."},
        {"step_number":3,"title":"Add Disclosure Notices","description":"Place clear AI transparency notices on every page where AI interacts with patients."},
        {"step_number":4,"title":"Label Chatbots","description":"Ensure all chatbots and virtual assistants are clearly labeled as AI, not human staff."},
        {"step_number":5,"title":"Monitor Ongoing","description":"New AI tools get added during website updates. Continuous monitoring catches undisclosed AI."}
    ]'::jsonb,

    -- faq
    '[
        {"question":"What counts as AI under HB 149?","answer":"Any automated system that uses machine learning, natural language processing, or algorithmic decision-making to interact with or provide information to patients. This includes chatbots, automated scheduling, symptom checkers, and AI-generated content."},
        {"question":"Do I need to disclose AI if I only use it internally?","answer":"HB 149 focuses on patient-facing AI interactions. Internal AI tools (like billing automation) that don''t directly interact with patients are generally not covered. However, if AI output is presented to patients (even indirectly), disclosure may be required."},
        {"question":"What does the disclosure need to say?","answer":"The disclosure must be clear, conspicuous, and inform the patient that they are interacting with or receiving information from an AI system. KairoLogic provides template disclosure language in the compliance report."},
        {"question":"Is a single disclaimer page enough?","answer":"No. The disclosure should appear wherever AI interacts with patients — not just on a terms page that nobody reads. Contextual disclosure at the point of AI interaction is the standard."}
    ]'::jsonb,

    -- related_resources
    '[
        {"title":"Full Bill Text — HB 149","url":"https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149","type":"external"},
        {"title":"Run a Free AI Transparency Scan","url":"/compliance-scan","type":"internal"},
        {"title":"KairoLogic Services","url":"/services","type":"internal"}
    ]'::jsonb,

    'Texas HB 149 AI Transparency Requirements — Healthcare Provider Guide | KairoLogic',
    'Guide to HB 149 AI transparency requirements for Texas healthcare providers. Learn what AI disclosures are required, deadlines, and how to comply.',
    2, TRUE
)
ON CONFLICT (state_code, law_code) DO UPDATE SET
    display_name = EXCLUDED.display_name, summary_short = EXCLUDED.summary_short,
    summary_long = EXCLUDED.summary_long, key_requirements = EXCLUDED.key_requirements,
    faq = EXCLUDED.faq, compliance_steps = EXCLUDED.compliance_steps,
    updated_at = NOW();

-- -----------------------------------------------
-- Seed: state_products — Texas
-- -----------------------------------------------

-- Product 1: Compliance Audit (one-time report)
INSERT INTO state_products (
    state_code, product_key, display_name, tagline,
    description, features, includes,
    price_cents, price_display, price_type,
    regulations_covered, checks_included,
    tier_level, is_popular, cta_text,
    display_order
)
VALUES (
    'TX', 'compliance_audit', 'Sovereignty Audit & Forensic Report', 'Your compliance evidence package',
    'Comprehensive forensic audit of your website''s compliance with Texas SB 1188 (Data Sovereignty) and HB 149 (AI Transparency). Includes a detailed PDF report with evidence documentation, violation analysis, and a prioritized Remedial Engineering Roadmap.',
    '[
        {"feature":"SB 1188 Data Sovereignty Scan","included":true},
        {"feature":"HB 149 AI Transparency Scan","included":true},
        {"feature":"NPI Registry Verification","included":true},
        {"feature":"Third-Party Script Inventory","included":true},
        {"feature":"Foreign Data Routing Detection","included":true},
        {"feature":"Prioritized Remediation Roadmap","included":true},
        {"feature":"Continuous Monitoring","included":false},
        {"feature":"Trust Seal Widget","included":false}
    ]'::jsonb,
    '[
        {"item":"52-Page PDF Forensic Report","description":"Detailed technical evidence of all findings."},
        {"item":"Violation Evidence Documentation","description":"Screenshot-level proof of each compliance gap."},
        {"item":"Remedial Engineering Roadmap","description":"Prioritized fix-by-fix instructions for your developer."},
        {"item":"Safe Harbor Declaration Package","description":"Documentation to establish your good-faith compliance effort."}
    ]'::jsonb,
    9900, '$99', 'one_time',
    '["sb-1188","hb-149"]'::jsonb,
    '["NPI-01","NPI-02","NPI-03","RST-01"]'::jsonb,
    1, FALSE, 'Get Your Audit',
    1
)
ON CONFLICT (state_code, product_key) DO UPDATE SET
    display_name = EXCLUDED.display_name, description = EXCLUDED.description,
    features = EXCLUDED.features, includes = EXCLUDED.includes,
    price_cents = EXCLUDED.price_cents, price_display = EXCLUDED.price_display,
    updated_at = NOW();

-- Product 2: Safe Harbor Package (premium report)
INSERT INTO state_products (
    state_code, product_key, display_name, tagline,
    description, features, includes,
    price_cents, price_display, price_type,
    regulations_covered, checks_included,
    tier_level, is_popular, cta_text,
    display_order
)
VALUES (
    'TX', 'safe_harbor', 'Safe Harbor Protection Package', 'Complete compliance defense',
    'Everything in the Sovereignty Audit plus Safe Harbor declaration documents, compliance certificate, and 3 months of SentryShield monitoring included. Establishes the documented compliance program required for penalty reduction under SB 1188.',
    '[
        {"feature":"SB 1188 Data Sovereignty Scan","included":true},
        {"feature":"HB 149 AI Transparency Scan","included":true},
        {"feature":"NPI Registry Verification","included":true},
        {"feature":"Third-Party Script Inventory","included":true},
        {"feature":"Foreign Data Routing Detection","included":true},
        {"feature":"Prioritized Remediation Roadmap","included":true},
        {"feature":"3 Months Continuous Monitoring","included":true},
        {"feature":"Trust Seal Widget","included":true}
    ]'::jsonb,
    '[
        {"item":"Full Forensic Audit Report","description":"Everything in the Sovereignty Audit."},
        {"item":"Safe Harbor Declaration","description":"Legal-ready compliance declaration for your records."},
        {"item":"Compliance Certificate","description":"Dated certificate of compliance status."},
        {"item":"3 Months SentryShield Monitoring","description":"Continuous drift detection and monthly re-scans."},
        {"item":"Trust Seal Widget","description":"Embeddable compliance badge for your website."}
    ]'::jsonb,
    14900, '$149', 'one_time',
    '["sb-1188","hb-149"]'::jsonb,
    '["NPI-01","NPI-02","NPI-03","RST-01"]'::jsonb,
    2, TRUE, 'Protect Your Practice',
    2
)
ON CONFLICT (state_code, product_key) DO UPDATE SET
    display_name = EXCLUDED.display_name, description = EXCLUDED.description,
    features = EXCLUDED.features, includes = EXCLUDED.includes,
    price_cents = EXCLUDED.price_cents, price_display = EXCLUDED.price_display,
    updated_at = NOW();

-- Product 3: SentryShield Monthly Monitoring
INSERT INTO state_products (
    state_code, product_key, display_name, tagline,
    description, features, includes,
    price_cents, price_display, price_type,
    regulations_covered, checks_included,
    tier_level, is_popular, cta_text,
    display_order
)
VALUES (
    'TX', 'sentry_shield', 'SentryShield Continuous Protection', 'Always-on compliance monitoring',
    'Monthly forensic re-scans, real-time compliance drift detection, provider dashboard access, and the KairoLogic Trust Seal widget for your website. Your ongoing compliance evidence for SB 1188 and HB 149.',
    '[
        {"feature":"Monthly Forensic Re-scans","included":true},
        {"feature":"Real-time Drift Detection","included":true},
        {"feature":"Provider Dashboard Access","included":true},
        {"feature":"Trust Seal Widget","included":true},
        {"feature":"Email Alerts on Drift","included":true},
        {"feature":"Compliance Score History","included":true},
        {"feature":"Monthly PDF Reports","included":true},
        {"feature":"Priority Support","included":true}
    ]'::jsonb,
    '[
        {"item":"Monthly Forensic Scans","description":"Automated deep scan on the 1st of every month."},
        {"item":"Real-time Drift Alerts","description":"Email notification when compliance status changes."},
        {"item":"Provider Dashboard","description":"Secure dashboard with compliance history, scores, and documents."},
        {"item":"Trust Seal Widget","description":"Embeddable compliance badge with real-time status."},
        {"item":"Monthly Compliance Reports","description":"PDF reports auto-generated and emailed monthly."}
    ]'::jsonb,
    3900, '$39/mo', 'monthly',
    '["sb-1188","hb-149"]'::jsonb,
    '["NPI-01","NPI-02","NPI-03","RST-01"]'::jsonb,
    3, FALSE, 'Start Monitoring',
    3
)
ON CONFLICT (state_code, product_key) DO UPDATE SET
    display_name = EXCLUDED.display_name, description = EXCLUDED.description,
    features = EXCLUDED.features, includes = EXCLUDED.includes,
    price_cents = EXCLUDED.price_cents, price_display = EXCLUDED.price_display,
    updated_at = NOW();

-- -----------------------------------------------
-- Verify seed data
-- -----------------------------------------------
SELECT state_code, state_name, slug, headline, provider_count, is_active
FROM state_configs ORDER BY display_order;

SELECT state_code, law_code, short_name, display_name, effective_date
FROM regulations ORDER BY state_code, display_order;

SELECT state_code, product_key, display_name, price_display, tier_level
FROM state_products ORDER BY state_code, display_order;
