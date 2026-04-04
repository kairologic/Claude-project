/**
 * UC-WF3: Onboarding Workflow Tests
 *
 * Tests the onboarding workflow functionality
 * - Workflow type visibility in filters
 * - Credentialing checklist display
 * - Sequential task progression
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS, WORKFLOW_TYPES } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-WF3: Onboarding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    // Navigate to workflows page
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-WF3-01: Onboarding workflow type visible in filters', async ({ page }) => {
    // Verify workflow filters section is visible
    const filterSection = page.locator('[data-testid="workflow-filters"]');
    await expect(filterSection).toBeVisible();

    // Look for onboarding filter option
    const onboardingFilter = filterSection.locator(
      '[data-testid="filter-workflow-type-onboarding"]',
    );
    await expect(onboardingFilter).toBeVisible();

    // Click onboarding filter
    await onboardingFilter.click();

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify workflow list is updated
    const workflowList = page.locator('[data-testid="workflow-list"]');
    await expect(workflowList).toBeVisible();

    // Verify onboarding workflows are shown or empty state
    const onboardingWorkflows = page.locator(
      '[data-testid="workflow-card"][data-type="onboarding"]',
    );
    const emptyState = page.locator('[data-testid="workflows-empty-state"]');

    const hasWorkflows = await onboardingWorkflows.count().then((c) => c > 0);
    const hasEmpty = await emptyState.isVisible();

    expect(hasWorkflows || hasEmpty).toBeTruthy();
  });

  test('UC-WF3-02: Onboarding workflow detail shows credentialing checklist', async ({ page }) => {
    // Filter for onboarding workflows
    const onboardingFilter = page.locator('[data-testid="filter-workflow-type-onboarding"]');
    await onboardingFilter.click();
    await page.waitForTimeout(500);

    // Get onboarding workflow cards
    const workflowCards = page.locator('[data-testid="workflow-card"][data-type="onboarding"]');
    const cardCount = await workflowCards.count();

    if (cardCount > 0) {
      // Click first onboarding workflow
      await workflowCards.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
      await expect(detailPanel).toBeVisible({ timeout: 5000 });

      // Verify credentialing checklist is displayed
      const checklist = detailPanel.locator('[data-testid="credentialing-checklist"]');
      await expect(checklist).toBeVisible();

      // Verify checklist has items
      const checklistItems = checklist.locator('[data-testid="checklist-item"]');
      const itemCount = await checklistItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // Verify each item has a checkbox and description
      const firstItem = checklistItems.first();
      const checkbox = firstItem.locator('[data-testid="item-checkbox"]');
      const description = firstItem.locator('[data-testid="item-description"]');

      await expect(checkbox).toBeVisible();
      await expect(description).toBeVisible();
    }
  });

  test('UC-WF3-03: Task progression follows sequential order', async ({ page }) => {
    // Filter for onboarding workflows
    const onboardingFilter = page.locator('[data-testid="filter-workflow-type-onboarding"]');
    await onboardingFilter.click();
    await page.waitForTimeout(500);

    // Get onboarding workflow cards
    const workflowCards = page.locator('[data-testid="workflow-card"][data-type="onboarding"]');
    const cardCount = await workflowCards.count();

    if (cardCount > 0) {
      // Click first onboarding workflow
      await workflowCards.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
      await expect(detailPanel).toBeVisible();

      // Verify task timeline or progression indicator
      const progressionSection = detailPanel.locator('[data-testid="task-progression"]');
      await expect(progressionSection).toBeVisible();

      // Verify tasks are displayed in order
      const tasks = progressionSection.locator('[data-testid="task-step"]');
      const taskCount = await tasks.count();
      expect(taskCount).toBeGreaterThan(0);

      // Verify each task has sequential indicators
      for (let i = 0; i < taskCount; i++) {
        const task = tasks.nth(i);
        const stepNumber = task.locator('[data-testid="step-number"]');
        await expect(stepNumber).toBeVisible();

        // Verify step number matches position
        const stepText = await stepNumber.textContent();
        expect(stepText?.trim()).toBe((i + 1).toString());
      }
    }
  });
});
