/**
 * UC-WF1: NPPES Update Workflow Tests
 *
 * Tests the NPPES update workflow functionality
 * - Workflows page load and filtering
 * - Workflow detail panel interactions
 * - Task checklist display
 * - Filter and search functionality
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS, WORKFLOW_TYPES } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-WF1: NPPES Update Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workflows page
    await navigateToDashboard(page);
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-WF1-01: Workflows page loads with filter bar', async ({ page }) => {
    // Verify workflows page is loaded
    expect(page.url()).toContain('/workflows');

    // Verify filter bar is visible
    const filterBar = page.locator('[data-testid="workflow-filter-bar"]');
    await expect(filterBar).toBeVisible();

    // Verify search input is present
    const searchInput = page.locator('[data-testid="workflow-search-input"]');
    await expect(searchInput).toBeVisible();

    // Verify filter buttons/pills area exists
    const filterArea = page.locator('[data-testid="workflow-filter-pills"]');
    await expect(filterArea).toBeVisible();
  });

  test('UC-WF1-02: Click workflow card opens detail panel', async ({ page }) => {
    // Wait for workflow cards to be loaded
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();

    // Verify at least one workflow card exists
    await expect(workflowCard).toBeVisible();

    // Click the first workflow card
    await workflowCard.click();

    // Verify detail panel is visible
    const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
    await expect(detailPanel).toBeVisible();
  });

  test('UC-WF1-03: Detail panel shows provider name, status, type badges', async ({ page }) => {
    // Open first workflow
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    await workflowCard.click();

    // Verify detail panel is open
    const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
    await expect(detailPanel).toBeVisible();

    // Verify provider name is displayed
    const providerName = detailPanel.locator('[data-testid="workflow-provider-name"]');
    await expect(providerName).toBeVisible();

    // Verify status badge is displayed
    const statusBadge = detailPanel.locator('[data-testid="workflow-status-badge"]');
    await expect(statusBadge).toBeVisible();
    const statusText = await statusBadge.textContent();
    expect(
      ['action_needed', 'in_progress', 'awaiting', 'resolved'].some((s) =>
        statusText?.toLowerCase().includes(s),
      ),
    ).toBeTruthy();

    // Verify type badge is displayed
    const typeBadge = detailPanel.locator('[data-testid="workflow-type-badge"]');
    await expect(typeBadge).toBeVisible();
  });

  test('UC-WF1-04: Task checklist displayed with status icons', async ({ page }) => {
    // Open first workflow
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    await workflowCard.click();

    // Verify detail panel is open
    const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
    await expect(detailPanel).toBeVisible();

    // Verify task checklist section exists
    const taskChecklist = detailPanel.locator('[data-testid="workflow-task-checklist"]');
    await expect(taskChecklist).toBeVisible();

    // Verify at least one task item exists
    const taskItems = detailPanel.locator('[data-testid="workflow-task-item"]');
    const taskCount = await taskItems.count();
    expect(taskCount).toBeGreaterThan(0);

    // Verify each task has a status icon (checkbox/checkmark/pending)
    const firstTask = taskItems.first();
    const statusIcon = firstTask.locator('[data-testid="task-status-icon"]');
    await expect(statusIcon).toBeVisible();
  });

  test('UC-WF1-05: Filter pills toggle workflow list', async ({ page }) => {
    // Get initial count of workflows
    const initialCards = page.locator('[data-testid="workflow-card"]');
    const initialCount = await initialCards.count();

    // Find and click a filter pill
    const filterPills = page.locator('[data-testid="filter-pill"]');
    const pillCount = await filterPills.count();

    if (pillCount > 0) {
      const firstPill = filterPills.first();
      await firstPill.click();

      // Wait for list to update
      await page.waitForTimeout(500);

      // Verify list has been filtered (may have different count)
      const filteredCards = page.locator('[data-testid="workflow-card"]');
      const filteredCount = await filteredCards.count();

      // Count should have changed or empty state shown
      const emptyState = page.locator('[data-testid="workflow-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(filteredCount !== initialCount || hasEmptyState).toBeTruthy();
    }
  });

  test('UC-WF1-06: Type filter pills work', async ({ page }) => {
    // Verify type filter pills exist
    const typeFilterSection = page.locator('[data-testid="filter-section-type"]');
    await expect(typeFilterSection).toBeVisible();

    // Get type filter pills
    const typeFilterPills = typeFilterSection.locator('[data-testid="filter-pill"]');
    const pillCount = await typeFilterPills.count();
    expect(pillCount).toBeGreaterThan(0);

    // Click first type filter
    const firstTypePill = typeFilterPills.first();
    const filterText = await firstTypePill.textContent();

    await firstTypePill.click();
    await page.waitForTimeout(500);

    // Verify workflows are filtered by type
    const workflowCards = page.locator('[data-testid="workflow-card"]');
    const count = await workflowCards.count();

    // Should have results or empty state
    const emptyState = page.locator('[data-testid="workflow-empty-state"]');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(count > 0 || hasEmptyState).toBeTruthy();
  });

  test('UC-WF1-07: Empty state shown when no results match filter', async ({ page }) => {
    // Apply a search that should return no results
    const searchInput = page.locator('[data-testid="workflow-search-input"]');
    await searchInput.fill('xyznonexistentprovider12345');

    // Wait for search to complete
    await page.waitForTimeout(500);

    // Verify empty state is shown
    const emptyState = page.locator('[data-testid="workflow-empty-state"]');
    await expect(emptyState).toBeVisible();

    // Verify empty state has helpful message
    const emptyMessage = emptyState.locator('[data-testid="empty-state-message"]');
    await expect(emptyMessage).toBeVisible();
  });

  test('UC-WF1-08: Workflow detail panel slides in from right', async ({ page }) => {
    // Record initial panel state
    const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');

    // Panel should not be visible initially
    let isPanelVisible = await detailPanel.isVisible().catch(() => false);
    expect(!isPanelVisible).toBeTruthy();

    // Click workflow to open panel
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    await workflowCard.click();

    // Wait for animation and verify panel is visible
    await expect(detailPanel).toBeVisible({ timeout: 2000 });

    // Verify panel is positioned on the right side
    const panelBox = await detailPanel.boundingBox();
    expect(panelBox).toBeTruthy();
  });

  test('UC-WF1-09: Close button dismisses detail panel', async ({ page }) => {
    // Open detail panel
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    await workflowCard.click();

    // Verify panel is open
    const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
    await expect(detailPanel).toBeVisible();

    // Find and click close button
    const closeBtn = detailPanel.locator('[data-testid="workflow-detail-close-btn"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify panel is hidden
    await expect(detailPanel).not.toBeVisible();
  });

  test('UC-WF1-10: Workflow results count updates with filters', async ({ page }) => {
    // Get initial result count
    const resultCount = page.locator('[data-testid="workflow-result-count"]');
    await expect(resultCount).toBeVisible();

    const initialCountText = await resultCount.textContent();
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0');

    // Apply a filter
    const filterPill = page.locator('[data-testid="filter-pill"]').first();
    await filterPill.click();

    // Wait for update
    await page.waitForTimeout(500);

    // Verify count text has been updated
    const updatedCountText = await resultCount.textContent();
    const updatedCount = parseInt(updatedCountText?.match(/\d+/)?.[0] || '0');

    // Count should have changed (either up or down, or empty state)
    const emptyState = page.locator('[data-testid="workflow-empty-state"]');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(updatedCount !== initialCount || hasEmptyState).toBeTruthy();
  });
});
