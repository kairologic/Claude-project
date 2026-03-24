-- Content Studio: Database Migration
-- Creates tables for automated content generation, branding, and multi-channel publishing

-- 1. content_posts: stores generated content drafts and publication state
CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('practice_manager', 'credentialing', 'compliance', 'executive')),
  intent text NOT NULL CHECK (intent IN ('awareness', 'conversion', 'thought_leadership')),
  headline text,
  body_linkedin text,
  body_blog text,
  body_substack text,
  graphic_brief jsonb,
  research_context jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'published', 'failed')),
  channels text[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_content_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_posts_updated_at ON content_posts;
CREATE TRIGGER content_posts_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION update_content_posts_updated_at();

-- 2. content_graphics: stores metadata and rendered output for each graphic
CREATE TABLE IF NOT EXISTS content_graphics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  graphic_type text NOT NULL CHECK (graphic_type IN ('data_viz', 'process_diagram', 'stat_card', 'comparison')),
  config jsonb NOT NULL DEFAULT '{}',
  data_query text,
  data_snapshot jsonb,
  image_url text,
  dimensions jsonb DEFAULT '{"width": 1200, "height": 675}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. content_publish_log: tracks each publish event per channel
CREATE TABLE IF NOT EXISTS content_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('linkedin', 'blog', 'substack')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  external_id text,
  external_url text,
  api_response jsonb,
  error_message text,
  published_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_created ON content_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_graphics_post ON content_graphics(post_id);
CREATE INDEX IF NOT EXISTS idx_content_publish_log_post ON content_publish_log(post_id);
CREATE INDEX IF NOT EXISTS idx_content_publish_log_channel ON content_publish_log(channel);

-- RLS policies
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_graphics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_publish_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (admin-only feature)
CREATE POLICY content_posts_all ON content_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY content_graphics_all ON content_graphics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY content_publish_log_all ON content_publish_log FOR ALL USING (true) WITH CHECK (true);

-- Supabase Storage bucket for graphic PNGs
INSERT INTO storage.buckets (id, name, public) VALUES ('content-graphics', 'content-graphics', true)
ON CONFLICT (id) DO NOTHING;
