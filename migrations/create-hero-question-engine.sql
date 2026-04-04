-- Migration: create-hero-question-engine
-- Description: Creates database infrastructure for KairoLogic's data-driven hero section
-- Includes materialized view for dataset coverage, hero questions, marketing snippets,
-- engagement tracking, and rate limiting tables with RLS policies.

-- ============================================================================
-- SECTION 1: MATERIALIZED VIEW - Dataset Coverage Computation
-- ============================================================================

CREATE MATERIALIZED VIEW dataset_coverage AS
SELECT
  'tx_provider_licenses' AS dataset_key,
  'TX Provider Licenses' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN state = 'TX' THEN npi END)::NUMERIC / 127969.0) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT CASE WHEN state = 'TX' THEN npi END) AS record_count,
  127969 AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN state = 'TX' THEN npi END)::NUMERIC / 127969.0) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM provider_licenses

UNION ALL

SELECT
  'oig_exclusions' AS dataset_key,
  'OIG Exclusions' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT npi)::NUMERIC / 82749.0) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT npi) AS record_count,
  82749 AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT npi)::NUMERIC / 82749.0) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM provider_exclusions

UNION ALL

SELECT
  'ai_tool_detection' AS dataset_key,
  'AI Tool Detection' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      ((SELECT COUNT(DISTINCT npi) FROM ai_tools_detected)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM practice_websites WHERE state = 'TX' AND url IS NOT NULL), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  (SELECT COUNT(DISTINCT npi) FROM ai_tools_detected) AS record_count,
  (SELECT COUNT(DISTINCT npi) FROM practice_websites WHERE state = 'TX' AND url IS NOT NULL) AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      ((SELECT COUNT(DISTINCT npi) FROM ai_tools_detected)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM practice_websites WHERE state = 'TX' AND url IS NOT NULL), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM (SELECT 1) AS _dummy

UNION ALL

SELECT
  'payer_aetna' AS dataset_key,
  'Payer: Aetna' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT pds.npi) AS record_count,
  (SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX') AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM payer_directory_snapshots pds
WHERE pds.payer_code = 'aetna'

UNION ALL

SELECT
  'payer_uhc' AS dataset_key,
  'Payer: UHC' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT pds.npi) AS record_count,
  (SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX') AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM payer_directory_snapshots pds
WHERE pds.payer_code = 'uhc'

UNION ALL

SELECT
  'payer_humana' AS dataset_key,
  'Payer: Humana' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT pds.npi) AS record_count,
  (SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX') AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM payer_directory_snapshots pds
WHERE pds.payer_code = 'humana'

UNION ALL

SELECT
  'payer_cigna' AS dataset_key,
  'Payer: Cigna' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT pds.npi) AS record_count,
  (SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX') AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT pds.npi)::NUMERIC /
       NULLIF((SELECT COUNT(DISTINCT npi) FROM provider_licenses WHERE state = 'TX'), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM payer_directory_snapshots pds
WHERE pds.payer_code = 'cigna'

UNION ALL

SELECT
  'website_accepting_patients' AS dataset_key,
  'Website: Accepting Patients' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN pw_ap.website_accepting_patients IS NOT NULL THEN pw_ap.npi END)::NUMERIC /
       NULLIF(COUNT(DISTINCT CASE WHEN pw_ap.state = 'TX' AND pw_ap.url IS NOT NULL THEN pw_ap.npi END), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT CASE WHEN pw_ap.website_accepting_patients IS NOT NULL THEN pw_ap.npi END) AS record_count,
  COUNT(DISTINCT CASE WHEN pw_ap.state = 'TX' AND pw_ap.url IS NOT NULL THEN pw_ap.npi END) AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN pw_ap.website_accepting_patients IS NOT NULL THEN pw_ap.npi END)::NUMERIC /
       NULLIF(COUNT(DISTINCT CASE WHEN pw_ap.state = 'TX' AND pw_ap.url IS NOT NULL THEN pw_ap.npi END), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM practice_websites pw_ap
WHERE pw_ap.state = 'TX'

UNION ALL

SELECT
  'website_payers' AS dataset_key,
  'Website: Accepted Payers' AS dataset_label,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN pw_payers.accepted_payers IS NOT NULL THEN pw_payers.npi END)::NUMERIC /
       NULLIF(COUNT(DISTINCT CASE WHEN pw_payers.state = 'TX' AND pw_payers.url IS NOT NULL THEN pw_payers.npi END), 0)) * 100,
      2
    ),
    0
  )) AS coverage_pct,
  COUNT(DISTINCT CASE WHEN pw_payers.accepted_payers IS NOT NULL THEN pw_payers.npi END) AS record_count,
  COUNT(DISTINCT CASE WHEN pw_payers.state = 'TX' AND pw_payers.url IS NOT NULL THEN pw_payers.npi END) AS total_possible,
  LEAST(100.0, COALESCE(
    ROUND(
      (COUNT(DISTINCT CASE WHEN pw_payers.accepted_payers IS NOT NULL THEN pw_payers.npi END)::NUMERIC /
       NULLIF(COUNT(DISTINCT CASE WHEN pw_payers.state = 'TX' AND pw_payers.url IS NOT NULL THEN pw_payers.npi END), 0)) * 100,
      2
    ),
    0
  )) >= 75.0 AS is_surfaceable,
  NOW() AT TIME ZONE 'UTC' AS computed_at
FROM practice_websites pw_payers
WHERE pw_payers.state = 'TX';

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_dataset_coverage_key ON dataset_coverage(dataset_key);

-- Add comment to materialized view
COMMENT ON MATERIALIZED VIEW dataset_coverage IS
'Computes coverage percentages per dataset category against TX practices.
Used to determine which datasets have sufficient coverage (>=75%) for hero section display.
Refresh with refresh_dataset_coverage() function.';

-- ============================================================================
-- SECTION 2: HERO QUESTIONS TABLE
-- ============================================================================

CREATE TABLE hero_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  dataset_key TEXT NOT NULL,
  coverage_pct_at_generation NUMERIC(5,2),
  category TEXT CHECK (category IN ('compliance', 'payer', 'licensing', 'ai_tools', 'exclusions')),
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast hero load queries
CREATE INDEX idx_hero_questions_active_expires ON hero_questions(is_active, expires_at);

-- Enable RLS
ALTER TABLE hero_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: anon can SELECT active, non-expired questions
CREATE POLICY hero_questions_anon_select ON hero_questions
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > NOW());

COMMENT ON TABLE hero_questions IS
'Stores hero section questions that drive engagement.
Each question is tied to a dataset and includes engagement metrics and expiration dates.';

-- ============================================================================
-- SECTION 3: MARKETING SNIPPETS TABLE
-- ============================================================================

CREATE TABLE marketing_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snippet_text TEXT NOT NULL,
  stat_value TEXT,
  stat_label TEXT,
  question_text TEXT,
  landing_slug TEXT UNIQUE,
  platform TEXT DEFAULT 'linkedin' CHECK (platform IN ('linkedin', 'google_ads', 'twitter')),
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX idx_marketing_snippets_slug ON marketing_snippets(landing_slug);
CREATE INDEX idx_marketing_snippets_active ON marketing_snippets(is_active);

-- Enable RLS
ALTER TABLE marketing_snippets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: anon can SELECT active snippets
CREATE POLICY marketing_snippets_anon_select ON marketing_snippets
  FOR SELECT
  TO anon
  USING (is_active = true);

COMMENT ON TABLE marketing_snippets IS
'Stores marketing copy, stats, and hooks for LinkedIn, Google Ads, and Twitter campaigns.
Each snippet is tied to a landing page slug for tracking campaign performance.';

-- ============================================================================
-- SECTION 4: HERO QUESTION CLICKS TABLE (Engagement Tracking)
-- ============================================================================

CREATE TABLE hero_question_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES hero_questions(id) ON DELETE CASCADE,
  visitor_fingerprint TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  answer_shown BOOLEAN DEFAULT false
);

-- Index for tracking clicks per question
CREATE INDEX idx_hero_question_clicks_question ON hero_question_clicks(question_id);
CREATE INDEX idx_hero_question_clicks_visitor ON hero_question_clicks(visitor_fingerprint);
CREATE INDEX idx_hero_question_clicks_timestamp ON hero_question_clicks(clicked_at);

-- Enable RLS
ALTER TABLE hero_question_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: anon can INSERT clicks
CREATE POLICY hero_question_clicks_anon_insert ON hero_question_clicks
  FOR INSERT
  TO anon
  WITH CHECK (true);

COMMENT ON TABLE hero_question_clicks IS
'Tracks engagement with hero questions by visitor.
Used for analytics, rate limiting, and measuring question effectiveness.';

-- ============================================================================
-- SECTION 5: VISITOR QUESTION LIMITS TABLE (Rate Limiting)
-- ============================================================================

CREATE TABLE visitor_question_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_fingerprint TEXT NOT NULL,
  ip_hash TEXT,
  questions_used INTEGER DEFAULT 0,
  limit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visitor_fingerprint, limit_date)
);

-- Index for fast lookups
CREATE INDEX idx_visitor_question_limits_fingerprint ON visitor_question_limits(visitor_fingerprint, limit_date);

-- Enable RLS
ALTER TABLE visitor_question_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: anon can SELECT their own limits
CREATE POLICY visitor_question_limits_anon_select ON visitor_question_limits
  FOR SELECT
  TO anon
  USING (true);

-- RLS Policy: anon can INSERT limits
CREATE POLICY visitor_question_limits_anon_insert ON visitor_question_limits
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policy: anon can UPDATE their own limits (for incrementing questions_used)
CREATE POLICY visitor_question_limits_anon_update ON visitor_question_limits
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE visitor_question_limits IS
'Tracks question usage per visitor per day to prevent abuse.
Uses visitor fingerprint and IP hash to identify users across sessions.';

-- ============================================================================
-- SECTION 6: REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dataset_coverage()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY dataset_coverage;
$$;

COMMENT ON FUNCTION refresh_dataset_coverage() IS
'Refreshes the dataset_coverage materialized view to update coverage percentages.
Can be called periodically via scheduled jobs or on-demand for hero question generation.';

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on materialized view to anon
GRANT SELECT ON dataset_coverage TO anon;

-- Grant SELECT on hero_questions to anon (with RLS)
GRANT SELECT ON hero_questions TO anon;

-- Grant SELECT, INSERT on hero_question_clicks to anon (with RLS)
GRANT SELECT, INSERT ON hero_question_clicks TO anon;

-- Grant SELECT, INSERT, UPDATE on visitor_question_limits to anon (with RLS)
GRANT SELECT, INSERT, UPDATE ON visitor_question_limits TO anon;

-- Grant SELECT on marketing_snippets to anon (with RLS)
GRANT SELECT ON marketing_snippets TO anon;

-- Grant EXECUTE on refresh function
GRANT EXECUTE ON FUNCTION refresh_dataset_coverage() TO authenticated;
