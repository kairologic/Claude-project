/**
 * UC-WF4: Provider Release Workflow Tests
 *
 * Tests the provider release/departure workflow functionality
 * - Workflow type visibility in filters
 * - Departure checklist display
 * - Release workflow creation from provider departure action
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-WF4: Provider Release Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    // Navigate to workflows page
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-WF4-01: Release workflow type visible in filters', async ({ page }) => {
    // Verify workflow filters section is visible
    const filterSection = page.locator('[data-testid="workflow-filters"]');
    await expect(filterSection).toBeVisible();

    // Look for release filter option
    const releaseFilter = filterSection.locator('[data-testid="filter-workflow-type-release"]');
    await expect(releaseFilter).toBeVisible();

    // Click release filter
    await releaseFilter.click();

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify workflow list is updated
    const workflowList = page.locator('[data-testid="workflow-list"]');
    await expect(workflowList).toBeVisible();

    // Verify release workflows are shown or empty state
    const releaseWorkflows = page.locator('[data-testid="workflow-card"][data-type="release"]');
    const emptyState = page.locator('[data-testid="workflows-empty-state"]');

    const hasWorkflows = await releaseWorkflows.count().then((c) => c > 0);
    const hasEmpty = await emptyState.isVisible();

    expect(hasWorkflows || hasEmpty).toBeTruthy();
  });

  test('UC-WF4-02: Release workflow shows departure checklist', async ({ page }) => {
    // Filter for release workflows
    const releaseFilter = page.locator('[data-testid="filter-workflow-type-release"]');
    await releaseFilter.click();
    await page.waitForTimeout(500);

    // Get release workflow cards
    const workflowCards = page.locator('[data-testid="workflow-card"][data-type="release"]');
    const cardCount = await workflowCards.count();

    if (cardCount > 0) {
      // Click first release workflow
      await workflowCards.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
      await expect(detailPanel).toBeVisible({ timeout: 5000 });

      // Verify departure checklist is displayed
      const checklist = detailPanel.locator('[data-testid="departure-checklist"]');
      await expect(checklist).toBeVisible();

      // Verify checklist has items (e.g., terminations, obligations, etc.)
      const checklistItems = checklist.locator('[data-testid="checklist-item"]');
      const itemCount = await checklistItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // Verify items have proper structure
      const firstItem = checklistItems.first();
      const itemTitle = firstItem.locator('[data-testid="item-title"]');
      await expect(itemTitle).toBeVisible();
    }
  });

  test('UC-WF4-03: Mark provider as departing creates release workflow', async ({ page }) => {
    // Navigate to provider roster
    await page.goto(URLS.roster(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');

    // Get provider rows
    const providerRows = page.locator('[data-testid="provider-row"]');
    const rowCount = await providerRows.count();

    if (rowCount > 0) {
      // Click menu on first provider
      const firstRow = providerRows.first();
      const rowMenu = firstRow.locator('[data-testid="provider-row-menu"]');
      await rowMenu.click();

      // Wait for menu to appear
      await page.waitForTimeout(300);

      // Look for "Mark as departing" option
      const departingOption = page.locator('[data-testid="provider-action-departing"]');

      if (await departingOption.isVisible()) {
        // Click the departing option
        await departingOption.click();

        // Wait for confirmation dialog or workflow creation
        const dialog = page.locator('[data-testid="confirm-dialog"]');
        if (await dialog.isVisible()) {
          // Confirm the action
          const confirmBtn = dialog.locator('[data-testid="confirm-button"]');
          await confirmBtn.click();
        }

        // Wait for redirect or notification
        await page.waitForTimeout(1000);

        // Navigate back to workflows to verify release workflow created
        await page.goto(URLS.workflows(TEST_PRACTICE.id));
        await page.waitForLoadState('networkidle');

        // Filter for release workflows
        const releaseFilter = page.locator('[data-testid="filter-workflow-type-release"]');
        await releaseFilter.click();
        await page.waitForTimeout(500);

        // Verify at least one release workflow exists
        const releaseWorkflows = page.locator('[data-testid="workflow-card"][data-type="release"]');
        expect(await releaseWorkflows.count()).toBeGreaterThan(0);
      }
    }
  });
});
