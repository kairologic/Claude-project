-- ============================================================
-- feedback_tracking.sql
-- Creates feedback and feedback_comments tables with RLS policies.
-- ============================================================

-- ── feedback ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   uuid        REFERENCES practice_websites(id),
  practice_name text,
  type          text        NOT NULL CHECK (type IN ('issue', 'feature')),
  category      text,
  subject       text        NOT NULL,
  description   text        NOT NULL,
  urgency       text        CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  submitted_by  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── feedback_comments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid        NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  author      text        NOT NULL,
  author_role text        NOT NULL CHECK (author_role IN ('practice', 'admin')),
  message     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feedback_practice_id ON feedback(practice_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status      ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type        ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at  ON feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON feedback_comments(feedback_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- Allow anon key to insert feedback (practice users submit via API)
CREATE POLICY "anon_insert_feedback"
  ON feedback FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon key to read all feedback
CREATE POLICY "anon_select_feedback"
  ON feedback FOR SELECT
  TO anon
  USING (true);

-- Allow anon key to update feedback (status changes)
CREATE POLICY "anon_update_feedback"
  ON feedback FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon key to insert comments
CREATE POLICY "anon_insert_feedback_comments"
  ON feedback_comments FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon key to read all comments
CREATE POLICY "anon_select_feedback_comments"
  ON feedback_comments FOR SELECT
  TO anon
  USING (true);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON feedback;
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
