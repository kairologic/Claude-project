-- ============================================================
-- KairoLogic Migration v13 - PART 3: Notifications & Alerts
-- Creates tables for V1 drift email alerts, V2 automated
-- notifications, and V2.5 trial expiry alerts.
-- Run AFTER Part 2.
--
-- Review fixes applied:
--   [Critical #1] RLS: server-write only, anon read-only
--   [Critical #2] FK constraints to registry(npi)
--   [Improvement #9] state column on notifications
--   [Improvement #10] Shared timestamp trigger function
-- ============================================================

-- -----------------------------------------------
-- Table: notifications
-- Central notification/alert log for all system events:
-- drift detection, trial expiry, scan completion,
-- certification milestones, etc.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,
    state TEXT,                -- Provider's state code for filtered queries

    -- Notification type and content
    notification_type TEXT NOT NULL,
      -- Values: drift_alert | scan_complete | trial_expiry_warning |
      --         trial_expired | certification_earned | certification_expiring |
      --         report_ready | payment_received | dashboard_link | system
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
      -- Values: info | warning | critical | success

    -- Delivery
    channel TEXT NOT NULL DEFAULT 'email',
      -- Values: email | in_app | sms | webhook
    recipient_email TEXT,
    delivered_at TIMESTAMPTZ,
    delivery_status TEXT DEFAULT 'pending',
      -- Values: pending | sent | delivered | failed | skipped
    delivery_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Related entities
    related_scan_id TEXT,      -- Links to scan_reports.report_id
    related_template_slug TEXT, -- Links to email_templates.slug

    -- Read tracking (for in-app notifications)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
      -- Flexible field for drift details, score changes, etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Table: notification_preferences
-- Per-provider notification opt-in/out settings.
-- Shield subscribers get all alerts by default;
-- Watch tier gets limited notifications.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    npi TEXT NOT NULL UNIQUE REFERENCES registry(npi) ON DELETE CASCADE,
    registry_id TEXT,

    -- Email notification toggles
    email_drift_alerts BOOLEAN DEFAULT TRUE,
    email_scan_complete BOOLEAN DEFAULT TRUE,
    email_monthly_report BOOLEAN DEFAULT TRUE,
    email_certification_updates BOOLEAN DEFAULT TRUE,
    email_trial_reminders BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,

    -- Notification frequency
    drift_alert_frequency TEXT DEFAULT 'immediate',
      -- Values: immediate | daily_digest | weekly_digest
    report_delivery_frequency TEXT DEFAULT 'monthly',
      -- Values: monthly | quarterly

    -- Contact preferences
    preferred_email TEXT,
    preferred_name TEXT,

    -- Quiet hours (optional)
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'America/Chicago',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- Indexes
-- -----------------------------------------------
-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_npi ON notifications(npi);
CREATE INDEX IF NOT EXISTS idx_notifications_state ON notifications(state);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status)
  WHERE delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_npi_unread ON notifications(npi, is_read)
  WHERE is_read = FALSE;

-- notification_preferences
CREATE INDEX IF NOT EXISTS idx_notif_prefs_npi ON notification_preferences(npi);

-- -----------------------------------------------
-- Row Level Security
-- Provider-scoped tables: anon SELECT only.
-- Writes go through service_role from server-side.
-- -----------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- notifications: read-only for anon
CREATE POLICY "Public read notifications"
    ON notifications FOR SELECT TO anon USING (true);

-- notification_preferences: read-only for anon
CREATE POLICY "Public read notification_preferences"
    ON notification_preferences FOR SELECT TO anon USING (true);

-- -----------------------------------------------
-- Auto-update timestamp trigger (shared function from Part 1)
-- -----------------------------------------------
CREATE TRIGGER trigger_notification_preferences_updated
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_v13_timestamp();

-- -----------------------------------------------
-- Verify tables
-- -----------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('notifications', 'notification_preferences')
ORDER BY table_name, ordinal_position;
