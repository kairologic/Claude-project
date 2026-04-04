-- ============================================
-- KairoLogic RLS Security Hardening
-- Migration: 003-fix-rls-policies.sql
-- Purpose: Fix overly permissive RLS policies
-- ============================================

-- SECURITY FIX: Drop dangerous anon INSERT policies on scan_results
DROP POLICY IF EXISTS "Allow anon insert scan_results" ON scan_results;
DROP POLICY IF EXISTS "Allow anon all scan_results" ON scan_results;

-- SECURITY FIX: Replace with read-only anon policy
-- Anon users can only SELECT scan results (not modify)
-- Service role key bypasses RLS anyway for server-side inserts
CREATE POLICY "anon_read_scan_results" ON scan_results
  FOR SELECT TO anon
  USING (true);

-- SECURITY FIX: Drop dangerous anon policy on violation_evidence
-- This was allowing anon users to insert and modify violation data
DROP POLICY IF EXISTS "Allow anon all violation_evidence" ON violation_evidence;

-- SECURITY FIX: Add read-only anon policy for violation_evidence
CREATE POLICY "anon_read_violation_evidence" ON violation_evidence
  FOR SELECT TO anon
  USING (true);

-- SECURITY FIX: Drop dangerous anon policies on purchases
-- These were allowing anon users to create and view any purchase
DROP POLICY IF EXISTS "Allow anon insert purchases" ON purchases;
DROP POLICY IF EXISTS "Allow anon select purchases" ON purchases;

-- SECURITY FIX: Authenticated users only for purchases (anon inserts blocked)
-- For anon purchase creation, use service role API endpoint instead
CREATE POLICY "authenticated_select_purchases" ON purchases
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_purchases" ON purchases
  FOR ALL TO authenticated
  USING (true);

-- SECURITY FIX: Drop overly permissive authenticated policies
-- These allowed authenticated users full access to admin tables
DROP POLICY IF EXISTS "Allow authenticated all email_templates" ON email_templates;
DROP POLICY IF EXISTS "Allow authenticated all page_content" ON page_content;
DROP POLICY IF EXISTS "Allow authenticated all assets" ON assets;

-- SECURITY FIX: Replace with SELECT-only for authenticated users on admin tables
CREATE POLICY "authenticated_read_email_templates" ON email_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_page_content" ON page_content
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_assets" ON assets
  FOR SELECT TO authenticated
  USING (true);

-- SECURITY FIX: Check for dashboard tables and add practice-scoped policies
-- These policies ensure authenticated users can only access data for practices they belong to

-- If workflow_instances table exists, add practice-scoped policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'workflow_instances'
  ) THEN
    DROP POLICY IF EXISTS "workflow_instances_practice_access" ON workflow_instances;
    CREATE POLICY "workflow_instances_practice_access" ON workflow_instances
      FOR ALL TO authenticated
      USING (
        practice_id IN (
          SELECT practice_id FROM practice_users
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        practice_id IN (
          SELECT practice_id FROM practice_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- If alerts table exists, add practice-scoped policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'alerts'
  ) THEN
    DROP POLICY IF EXISTS "alerts_practice_access" ON alerts;
    CREATE POLICY "alerts_practice_access" ON alerts
      FOR ALL TO authenticated
      USING (
        practice_id IN (
          SELECT practice_id FROM practice_users
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        practice_id IN (
          SELECT practice_id FROM practice_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- If practice_providers table exists, add practice-scoped policy using practice_website_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'practice_providers'
  ) THEN
    DROP POLICY IF EXISTS "practice_providers_access" ON practice_providers;
    CREATE POLICY "practice_providers_access" ON practice_providers
      FOR ALL TO authenticated
      USING (
        practice_website_id IN (
          SELECT pw.practice_website_id FROM practice_websites pw
          INNER JOIN practice_users pu ON pw.practice_id = pu.practice_id
          WHERE pu.user_id = auth.uid()
        )
      )
      WITH CHECK (
        practice_website_id IN (
          SELECT pw.practice_website_id FROM practice_websites pw
          INNER JOIN practice_users pu ON pw.practice_id = pu.practice_id
          WHERE pu.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- Summary of Changes
-- ============================================
-- 1. scan_results: Changed from INSERT+SELECT to SELECT-ONLY for anon
-- 2. violation_evidence: Changed from ALL to SELECT-ONLY for anon
-- 3. purchases: Removed anon access entirely (use service role for API)
-- 4. email_templates: Changed from ALL to SELECT-ONLY for authenticated
-- 5. page_content: Changed from ALL to SELECT-ONLY for authenticated
-- 6. assets: Changed from ALL to SELECT-ONLY for authenticated
-- 7. Added practice-scoped policies for dashboard tables (workflow_instances, alerts, practice_providers)
--
-- All changes follow principle of least privilege:
-- - Anon users can only read public data
-- - Authenticated users get read-only on admin tables
-- - Dashboard data is practice-scoped to user's practice memberships
-- - Service role key (bypasses RLS) handles sensitive inserts from backend

DO $$
BEGIN
  RAISE NOTICE 'KairoLogic RLS security hardening completed!';
END $$;
