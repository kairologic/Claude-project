-- ============================================================
-- KairoLogic Migration v13 - PART 6: Multi-State Content Model
-- Creates the database-driven dynamic page system for
-- multi-state expansion per the product roadmap strategy.
--
-- Supports URL structure:
--   /[state]/              → State landing page
--   /[state]/[regulation]/ → Regulation deep dive page
--   /pricing/              → State-aware pricing
--
-- One template renders all states. Adding a new state is
-- a data task (INSERT rows), not a development task.
-- Run AFTER Part 5.
--
-- Review fixes applied:
--   [Critical #1] RLS: public tables read-only for anon.
--     All writes via service_role from server-side.
--   [Critical #3] state_code UNIQUE constraint explicit.
--   [Improvement #10] Shared timestamp trigger function.
-- ============================================================

-- -----------------------------------------------
-- Table: state_configs
-- State-level CMS for landing pages.
-- Each row powers /[state]/ landing page content.
-- PUBLIC table: anyone can read, only admin can write.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS state_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_code TEXT NOT NULL,                -- e.g. 'TX', 'CA', 'WA'
    state_name TEXT NOT NULL,                -- e.g. 'Texas', 'California'
    slug TEXT NOT NULL,                      -- URL slug: 'texas', 'california', 'washington'

    -- Hero section content
    headline TEXT NOT NULL,                  -- e.g. "California Healthcare AI Compliance"
    subheadline TEXT,                        -- e.g. "Monitor your practice's compliance with AB 3030"
    hero_stat TEXT,                          -- e.g. "120,000+ providers affected"
    hero_stat_label TEXT,                    -- e.g. "California Healthcare Providers"
    urgency_message TEXT,                    -- e.g. "AB 3030 is enforceable now"

    -- State metadata
    provider_count INTEGER DEFAULT 0,
    regulation_count INTEGER DEFAULT 0,

    -- SEO
    meta_title TEXT,                         -- e.g. "California Healthcare Compliance Scanner | KairoLogic"
    meta_description TEXT,                   -- e.g. "Monitor AB 3030 AI transparency compliance..."
    og_image_url TEXT,                       -- Social share image per state

    -- IP geolocation hint config
    geo_lat NUMERIC(10,6),                   -- State center latitude (for IP hint matching)
    geo_lng NUMERIC(10,6),                   -- State center longitude
    geo_hint_message TEXT,                   -- e.g. "It looks like you're in California. →"

    -- Display
    display_order INTEGER DEFAULT 0,         -- Order on national homepage state grid
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,       -- Featured on national homepage

    -- Styling
    accent_color TEXT DEFAULT '#00234E',      -- State-specific accent color
    state_icon TEXT DEFAULT 'map-pin',        -- Lucide icon identifier

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Explicit UNIQUE constraints for FK references [Critical #3]
    CONSTRAINT state_configs_state_code_unique UNIQUE (state_code),
    CONSTRAINT state_configs_slug_unique UNIQUE (slug)
);

-- -----------------------------------------------
-- Table: regulations
-- Per-regulation content for deep dive pages.
-- Each row powers /[state]/[regulation]/ page.
-- Links to compliance_frameworks for engine-side config.
-- PUBLIC table: anyone can read, only admin can write.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS regulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_code TEXT NOT NULL REFERENCES state_configs(state_code),
    framework_id TEXT REFERENCES compliance_frameworks(framework_id),

    -- URL and identification
    law_code TEXT NOT NULL,                  -- e.g. 'sb-1188', 'ab-3030', 'my-health-my-data'
    slug TEXT NOT NULL,                      -- URL slug (same as law_code typically)
    display_name TEXT NOT NULL,              -- e.g. "Senate Bill 1188 — Data Sovereignty Act"
    short_name TEXT,                         -- e.g. "SB 1188" (for cards/badges)

    -- Dates and enforcement
    effective_date DATE,
    enforcement_date DATE,                   -- When penalties begin
    enforcement_body TEXT,                   -- e.g. "Texas Attorney General"
    legislative_session TEXT,                -- e.g. "89th Legislature, Regular Session (2025)"

    -- Penalties
    penalty_description TEXT,                -- Full penalty text
    penalty_amount_max TEXT,                 -- e.g. "$250,000 per knowing violation"
    penalty_type TEXT,                       -- e.g. "civil", "criminal", "both"

    -- Content (CMS fields for rendering)
    summary_short TEXT,                      -- 1-2 sentence summary for cards/previews
    summary_long TEXT,                       -- Full summary for deep dive page hero
    body_html TEXT,                          -- Rich HTML body content (optional)

    -- Structured content (JSONB for dynamic rendering)
    key_requirements JSONB DEFAULT '[]'::jsonb,
      -- Array of {title, description, icon}
      -- e.g. [{"title":"Data Residency","description":"All PHI must remain within US borders","icon":"globe"}]
    who_it_affects TEXT,                     -- e.g. "All licensed healthcare providers in Texas"
    who_it_affects_details JSONB DEFAULT '[]'::jsonb,
      -- Array of {group, description}
      -- e.g. [{"group":"Physicians","description":"All licensed physicians with patient-facing websites"}]
    compliance_steps JSONB DEFAULT '[]'::jsonb,
      -- Array of {step_number, title, description}
    faq JSONB DEFAULT '[]'::jsonb,
      -- Array of {question, answer}
    related_resources JSONB DEFAULT '[]'::jsonb,
      -- Array of {title, url, type}
      -- e.g. [{"title":"Full Bill Text","url":"https://capitol.texas.gov/...","type":"external"}]

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(state_code, law_code)
);

-- -----------------------------------------------
-- Table: state_products
-- State-specific product configurations.
-- Powers the state-aware pricing page and
-- product descriptions on state landing pages.
-- PUBLIC table: anyone can read, only admin can write.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS state_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_code TEXT NOT NULL REFERENCES state_configs(state_code),

    -- Product identification
    product_key TEXT NOT NULL,               -- e.g. 'compliance_audit', 'safe_harbor', 'sentry_shield'
    display_name TEXT NOT NULL,              -- e.g. "Sovereignty Audit & Forensic Report"
    tagline TEXT,                            -- e.g. "Your compliance evidence package"

    -- Content
    description TEXT NOT NULL,               -- State-specific product description
    features JSONB DEFAULT '[]'::jsonb,      -- Array of {feature, included}
      -- e.g. [{"feature":"SB 1188 Data Sovereignty Scan","included":true}]
    includes JSONB DEFAULT '[]'::jsonb,      -- Array of {item, description}
      -- e.g. [{"item":"PDF Forensic Report","description":"52-page detailed audit"}]

    -- Pricing
    price_cents INTEGER NOT NULL,            -- Price in cents (e.g. 9900 = $99)
    price_display TEXT NOT NULL,             -- e.g. "$99", "$149", "$39/mo"
    price_type TEXT DEFAULT 'one_time',      -- one_time | monthly | annual
    original_price_cents INTEGER,            -- For showing strikethrough pricing
    original_price_display TEXT,             -- e.g. "$199"

    -- Stripe integration
    stripe_price_id TEXT,                    -- Stripe Price ID
    stripe_product_id TEXT,                  -- Stripe Product ID
    stripe_buy_button_id TEXT,               -- Stripe Buy Button ID (for embedded checkout)
    stripe_payment_link TEXT,                -- Stripe Payment Link URL

    -- Which regulations this product covers
    regulations_covered JSONB DEFAULT '[]'::jsonb,
      -- Array of law_codes: ["sb-1188", "hb-149"]
    checks_included JSONB DEFAULT '[]'::jsonb,
      -- Array of check plugin IDs: ["NPI-01","NPI-02","RST-01"]

    -- Display
    tier_level INTEGER DEFAULT 1,            -- 1=basic, 2=standard, 3=premium
    is_popular BOOLEAN DEFAULT FALSE,        -- "Most Popular" badge
    is_available BOOLEAN DEFAULT TRUE,
    cta_text TEXT DEFAULT 'Get Started',     -- Button text
    cta_url TEXT,                            -- Override URL for CTA

    -- SEO / meta
    meta_title TEXT,
    meta_description TEXT,

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(state_code, product_key)
);

-- -----------------------------------------------
-- Indexes
-- -----------------------------------------------
-- state_configs
CREATE INDEX IF NOT EXISTS idx_state_configs_code ON state_configs(state_code);
CREATE INDEX IF NOT EXISTS idx_state_configs_slug ON state_configs(slug);
CREATE INDEX IF NOT EXISTS idx_state_configs_active ON state_configs(is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_state_configs_featured ON state_configs(is_featured)
  WHERE is_featured = TRUE;

-- regulations
CREATE INDEX IF NOT EXISTS idx_regulations_state ON regulations(state_code);
CREATE INDEX IF NOT EXISTS idx_regulations_slug ON regulations(state_code, slug);
CREATE INDEX IF NOT EXISTS idx_regulations_framework ON regulations(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulations_active ON regulations(is_active)
  WHERE is_active = TRUE;

-- state_products
CREATE INDEX IF NOT EXISTS idx_state_products_state ON state_products(state_code);
CREATE INDEX IF NOT EXISTS idx_state_products_key ON state_products(state_code, product_key);
CREATE INDEX IF NOT EXISTS idx_state_products_available ON state_products(is_available)
  WHERE is_available = TRUE;

-- -----------------------------------------------
-- Row Level Security
-- PUBLIC tables: anon SELECT only.
-- All writes via service_role from server-side / admin.
-- -----------------------------------------------
ALTER TABLE state_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_products ENABLE ROW LEVEL SECURITY;

-- state_configs: read-only for anon
CREATE POLICY "Public read state_configs"
    ON state_configs FOR SELECT TO anon USING (true);

-- regulations: read-only for anon
CREATE POLICY "Public read regulations"
    ON regulations FOR SELECT TO anon USING (true);

-- state_products: read-only for anon
CREATE POLICY "Public read state_products"
    ON state_products FOR SELECT TO anon USING (true);

-- -----------------------------------------------
-- Auto-update timestamp triggers (shared function from Part 1)
-- -----------------------------------------------
CREATE TRIGGER trigger_state_configs_updated
    BEFORE UPDATE ON state_configs
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

CREATE TRIGGER trigger_regulations_updated
    BEFORE UPDATE ON regulations
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

CREATE TRIGGER trigger_state_products_updated
    BEFORE UPDATE ON state_products
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

-- -----------------------------------------------
-- Verify tables
-- -----------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('state_configs', 'regulations', 'state_products')
ORDER BY table_name, ordinal_position;
