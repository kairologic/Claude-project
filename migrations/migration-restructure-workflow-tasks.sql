/**
 * Migration: Restructure workflow tasks from 6-step to 4-step structure
 *
 * Problem: trigger-workflows.ts seeds 6 tasks per NPPES workflow:
 *   1. review_finding (active)
 *   2. approve_correction (pending)
 *   3. download_form (pending)
 *   4. submit_nppes (pending)
 *   5. monitor_sync (pending)
 *   6. auto_confirm (pending)
 *
 * WorkflowDetailPanel.tsx expects 4 tasks:
 *   1. review_approve (active) — merged review + approval with radio cards
 *   2. download_form (pending)
 *   3. submit_nppes (pending)
 *   4. monitor_auto_confirm (pending) — merged monitor + auto-confirm
 *
 * This migration:
 *   1. Merges review_finding + approve_correction → review_approve
 *   2. Merges monitor_sync + auto_confirm → monitor_auto_confirm
 *   3. Populates review_approve metadata with options array from finding_details
 *   4. Renumbers task_order to 1-4
 *   5. Only touches nppes_update workflows (license_renewal tasks are separate)
 *
 * Safe to run multiple times (idempotent checks).
 */

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- Step 1: Create review_approve tasks from existing review_finding tasks
-- Merge metadata from both review_finding and approve_correction
-- ═══════════════════════════════════════════════════════════════════════

-- For each workflow that has review_finding but NOT review_approve,
-- update the review_finding row to become review_approve with merged metadata
UPDATE workflow_tasks t
SET
  task_type = 'review_approve',
  title = 'Review & approve correction',
  description = 'Compare NPPES vs website data and select the correct value',
  task_order = 1,
  status = 'active',
  metadata = jsonb_build_object(
    'comparison_data', COALESCE(t.metadata->'comparison_data', '{}'::jsonb),
    'options', COALESCE(
      -- Get options from the approve_correction task for this workflow
      (SELECT t2.metadata->'options'
       FROM workflow_tasks t2
       WHERE t2.workflow_id = t.workflow_id
         AND t2.task_type = 'approve_correction'
       LIMIT 1),
      -- Fallback: build options from workflow finding_details
      (SELECT jsonb_build_array(
         jsonb_build_object('source', 'From website', 'value', COALESCE(wi.finding_details->>'website_value', '')),
         jsonb_build_object('source', 'From NPPES', 'value', COALESCE(wi.finding_details->>'nppes_value', ''))
       )
       FROM workflow_instances wi
       WHERE wi.id = t.workflow_id
       LIMIT 1)
    )
  )
WHERE t.task_type = 'review_finding'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_tasks t3
    WHERE t3.workflow_id = t.workflow_id AND t3.task_type = 'review_approve'
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Step 2: Create monitor_auto_confirm tasks from existing monitor_sync
-- ═══════════════════════════════════════════════════════════════════════

UPDATE workflow_tasks t
SET
  task_type = 'monitor_auto_confirm',
  title = 'Monitor & auto-confirm',
  description = 'Auto-checks weekly; closes workflow when NPPES reflects update',
  task_order = 4,
  metadata = jsonb_build_object(
    'check_schedule', 'weekly',
    'check_day', 'monday',
    'check_time_utc', '06:00'
  )
WHERE t.task_type = 'monitor_sync'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_tasks t3
    WHERE t3.workflow_id = t.workflow_id AND t3.task_type = 'monitor_auto_confirm'
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Step 3: Delete the now-redundant approve_correction and auto_confirm rows
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM workflow_tasks
WHERE task_type IN ('approve_correction', 'auto_confirm');

-- ═══════════════════════════════════════════════════════════════════════
-- Step 4: Renumber task_order for remaining tasks (1-4)
-- ═══════════════════════════════════════════════════════════════════════

-- download_form → order 2
UPDATE workflow_tasks SET task_order = 2 WHERE task_type = 'download_form';

-- submit_nppes → order 3
UPDATE workflow_tasks SET task_order = 3 WHERE task_type = 'submit_nppes';

-- monitor_auto_confirm → order 4 (already set above, but ensure consistency)
UPDATE workflow_tasks SET task_order = 4 WHERE task_type = 'monitor_auto_confirm';

-- ═══════════════════════════════════════════════════════════════════════
-- Step 5: Verification query (check results before committing)
-- ═══════════════════════════════════════════════════════════════════════

-- Count tasks per workflow (should all be 4 for nppes_update workflows)
DO $$
DECLARE
  bad_count INTEGER;
  total_wf INTEGER;
BEGIN
  SELECT COUNT(DISTINCT workflow_id) INTO total_wf
  FROM workflow_tasks;

  SELECT COUNT(*) INTO bad_count
  FROM (
    SELECT workflow_id, COUNT(*) as task_count
    FROM workflow_tasks
    GROUP BY workflow_id
    HAVING COUNT(*) != 4
  ) sub;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  MIGRATION RESULTS';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  Total workflows:          %', total_wf;
  RAISE NOTICE '  Workflows with != 4 tasks: %', bad_count;

  IF bad_count > 0 THEN
    RAISE NOTICE '  ⚠️  Some workflows have unexpected task counts. Check manually.';
  ELSE
    RAISE NOTICE '  ✓ All workflows have exactly 4 tasks. Migration clean.';
  END IF;
END $$;

-- Show task type distribution after migration
SELECT task_type, status, COUNT(*) as count
FROM workflow_tasks
GROUP BY task_type, status
ORDER BY task_type, status;

COMMIT;
