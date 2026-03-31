-- Feedback tracking tables for KairoLogic
-- Tracks issues and feature requests submitted by practices

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid REFERENCES practice_websites(id),
  practice_name text,
  type text NOT NULL CHECK (type IN ('issue', 'feature')),
  category text,
  subject text NOT NULL,
  description text NOT NULL,
  urgency text DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  submitted_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  author text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('practice', 'admin', 'system')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedback_comments_feedback_id ON feedback_comments(feedback_id);
CREATE INDEX idx_feedback_practice_id ON feedback(practice_id);
CREATE INDEX idx_feedback_status ON feedback(status);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- Allow anon access (app uses anon key for all queries)
CREATE POLICY "Allow anon full access to feedback" ON feedback FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to feedback_comments" ON feedback_comments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-update updated_at on feedback changes
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();
