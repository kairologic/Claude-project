-- ============================================================
-- KairoLogic Migration v13 - PART 1: Registry Enhancements
-- Adds fields for V1 completion, V2 certification tracking,
-- and V2.5 Shield trial management.
-- Run this FIRST, then run Part 2, 3, 4, 5.
-- ============================================================

-- -----------------------------------------------
-- V1 Completion: Dashboard access tracking
-- -----------------------------------------------
ALTER TABLE registry ADD COLUMN IF NOT EXISTS dashboard_token TEXT DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS dashboard_token_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS dashboard_last_accessed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS dashboard_link_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS dashboard_link_sent_to TEXT DEFAULT NULL;

-- -----------------------------------------------
-- V2: Certification tracking
-- -----------------------------------------------
ALTER TABLE registry ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'none';
  -- Values: none | in_progress | certified | expired | revoked
ALTER TABLE registry ADD COLUMN IF NOT EXISTS consecutive_compliant_months INTEGER DEFAULT 0;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS certification_awarded_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS certification_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS last_monthly_scan_at TIMESTAMPTZ DEFAULT NULL;

-- -----------------------------------------------
-- V2.5: Shield trial management
-- -----------------------------------------------
ALTER TABLE registry ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'none';
  -- Values: none | watch | shield
ALTER TABLE registry ADD COLUMN IF NOT EXISTS shield_trial_start TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS shield_trial_end TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS shield_activated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS shield_downgraded_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS trial_expiry_notified_day80 BOOLEAN DEFAULT FALSE;
ALTER TABLE registry ADD COLUMN IF NOT EXISTS trial_expiry_notified_day90 BOOLEAN DEFAULT FALSE;

-- -----------------------------------------------
-- Indexes for new columns
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_registry_certification_status ON registry(certification_status);
CREATE INDEX IF NOT EXISTS idx_registry_subscription_tier ON registry(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_registry_shield_trial_end ON registry(shield_trial_end)
  WHERE shield_trial_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_dashboard_token ON registry(dashboard_token)
  WHERE dashboard_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_consecutive_months ON registry(consecutive_compliant_months)
  WHERE consecutive_compliant_months >= 12;

-- -----------------------------------------------
-- Ensure UNIQUE constraint on registry.npi
-- Required by FK references in Parts 2, 3, 4, 6.
-- Safe to run if already unique (will no-op on conflict).
-- -----------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'registry'::regclass
          AND contype = 'u'
          AND (SELECT array_agg(attname ORDER BY attnum)
               FROM pg_attribute
               WHERE attrelid = conrelid AND attnum = ANY(conkey)) = ARRAY['npi']
    ) THEN
        ALTER TABLE registry ADD CONSTRAINT registry_npi_unique UNIQUE (npi);
    END IF;
END $$;

-- -----------------------------------------------
-- Shared timestamp trigger function (used by all v13 tables)
-- Consolidates duplicate per-table functions into one.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION update_v13_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- Verify new columns
-- -----------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'registry'
  AND column_name IN (
    'dashboard_token', 'dashboard_token_expires_at', 'dashboard_last_accessed_at',
    'dashboard_link_sent_at', 'dashboard_link_sent_to',
    'certification_status', 'consecutive_compliant_months',
    'certification_awarded_at', 'certification_expires_at', 'last_monthly_scan_at',
    'subscription_tier', 'shield_trial_start', 'shield_trial_end',
    'shield_activated_at', 'shield_downgraded_at',
    'trial_expiry_notified_day80', 'trial_expiry_notified_day90'
  )
ORDER BY column_name;
