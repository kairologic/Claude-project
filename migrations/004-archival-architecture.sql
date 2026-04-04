-- =============================================================================
-- KairoLogic Archival Architecture Migration
--
-- Design: Active data stays in live tables for the real-time dashboard.
-- Resolved/cancelled items move to _archive tables after retention period.
-- Reports query both live + archive via UNION ALL when needed.
-- =============================================================================

-- ── Archive Tables ──────────────────────────────────────────────────────────

-- Workflow instances archive
CREATE TABLE IF NOT EXISTS workflow_instances_archive (
  LIKE workflow_instances INCLUDING ALL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archive_quarter TEXT NOT NULL, -- e.g. '2026-Q1'
  archived_by TEXT NOT NULL DEFAULT 'system'
);

-- Workflow tasks archive
CREATE TABLE IF NOT EXISTS workflow_tasks_archive (
  LIKE workflow_tasks INCLUDING ALL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archive_quarter TEXT NOT NULL,
  archived_by TEXT NOT NULL DEFAULT 'system'
);

-- Workflow events archive
CREATE TABLE IF NOT EXISTS workflow_events_archive (
  LIKE workflow_events INCLUDING ALL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archive_quarter TEXT NOT NULL,
  archived_by TEXT NOT NULL DEFAULT 'system'
);

-- Alerts archive
CREATE TABLE IF NOT EXISTS alerts_archive (
  LIKE alerts INCLUDING ALL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archive_quarter TEXT NOT NULL,
  archived_by TEXT NOT NULL DEFAULT 'system'
);

-- ── Archive Indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wf_archive_practice_quarter
  ON workflow_instances_archive (practice_id, archive_quarter);
CREATE INDEX IF NOT EXISTS idx_wf_archive_provider
  ON workflow_instances_archive (provider_npi, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_archive_type
  ON workflow_instances_archive (workflow_type, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_archive_workflow
  ON workflow_tasks_archive (workflow_id);

CREATE INDEX IF NOT EXISTS idx_events_archive_workflow
  ON workflow_events_archive (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_archive_practice_quarter
  ON alerts_archive (practice_id, archive_quarter);

-- ── Performance Indexes for Live Tables ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wf_practice_status_updated
  ON workflow_instances (practice_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wf_practice_active
  ON workflow_instances (practice_id, status)
  WHERE status NOT IN ('resolved', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_alerts_practice_severity
  ON alerts (practice_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_practice_active
  ON alerts (practice_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_workflow_created
  ON workflow_events (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payer_snapshots_npi_date
  ON payer_directory_snapshots (npi, payer_code, snapshot_date DESC);

-- ── Archive RLS Policies ────────────────────────────────────────────────────

ALTER TABLE workflow_instances_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_archive ENABLE ROW LEVEL SECURITY;

-- Authenticated users: read-only access scoped to their practices
CREATE POLICY "auth_read_wf_archive" ON workflow_instances_archive
  FOR SELECT TO authenticated
  USING (practice_id IN (
    SELECT practice_id FROM practice_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "auth_read_tasks_archive" ON workflow_tasks_archive
  FOR SELECT TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_instances_archive WHERE practice_id IN (
      SELECT practice_id FROM practice_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "auth_read_events_archive" ON workflow_events_archive
  FOR SELECT TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_instances_archive WHERE practice_id IN (
      SELECT practice_id FROM practice_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "auth_read_alerts_archive" ON alerts_archive
  FOR SELECT TO authenticated
  USING (practice_id IN (
    SELECT practice_id FROM practice_users WHERE user_id = auth.uid()
  ));
