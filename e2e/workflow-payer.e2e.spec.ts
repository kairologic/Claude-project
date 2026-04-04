/**
 * UC-WF2: Payer Directory Workflow Tests
 *
 * Tests the payer directory functionality
 * - Grid view display
 * - Clickable payer cells
 * - Mismatch detail comparison
 * - Sync status indicators
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-WF2: Payer Directory Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    // Navigate to payer directory
    await page.goto(URLS.payerDirectory(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-WF2-01: Payer directory page loads with grid view', async ({ page }) => {
    // Verify payer directory header is displayed
    const pageHeader = page.locator('[data-testid="payer-directory-header"]');
    await expect(pageHeader).toBeVisible();

    // Verify grid view is displayed
    const gridView = page.locator('[data-testid="payer-grid"]');
    await expect(gridView).toBeVisible();

    // Verify grid has payer cells or empty state
    const payerCells = page.locator('[data-testid="payer-cell"]');
    const emptyState = page.locator('[data-testid="payer-grid-empty"]');

    const hasCells = await payerCells.count().then((c) => c > 0);
    const hasEmpty = await emptyState.isVisible();

    expect(hasCells || hasEmpty).toBeTruthy();
  });

  test('UC-WF2-02: Payer cells are clickable for detail', async ({ page }) => {
    // Check if any payer cells exist
    const payerCells = page.locator('[data-testid="payer-cell"]');
    const cellCount = await payerCells.count();

    if (cellCount > 0) {
      // Click the first payer cell
      const firstCell = payerCells.first();
      await firstCell.click();

      // Wait for detail panel or modal to appear
      const detailPanel = page.locator('[data-testid="payer-detail-panel"]');
      await expect(detailPanel).toBeVisible({ timeout: 5000 });

      // Verify payer details are displayed
      const payerName = detailPanel.locator('[data-testid="payer-name"]');
      await expect(payerName).toBeVisible();
    }
  });

  test('UC-WF2-03: Mismatch details show source comparison', async ({ page }) => {
    // Check if any payer cells with mismatches exist
    const mismatchCells = page.locator('[data-testid="payer-cell"][data-status="mismatch"]');
    const mismatchCount = await mismatchCells.count();

    if (mismatchCount > 0) {
      // Click a mismatch cell
      await mismatchCells.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="payer-detail-panel"]');
      await expect(detailPanel).toBeVisible();

      // Verify comparison table is shown
      const comparisonTable = detailPanel.locator('[data-testid="mismatch-comparison"]');
      await expect(comparisonTable).toBeVisible();

      // Verify source columns exist
      const sourceColumn = detailPanel.locator('[data-testid="source-column-header"]');
      const count = await sourceColumn.count();
      expect(count).toBeGreaterThanOrEqual(2); // At least 2 sources
    }
  });

  test('UC-WF2-04: Payer sync status indicators display', async ({ page }) => {
    // Verify sync status section is visible
    const syncStatusSection = page.locator('[data-testid="payer-sync-status"]');
    await expect(syncStatusSection).toBeVisible();

    // Verify last sync timestamp is displayed
    const lastSyncTime = syncStatusSection.locator('[data-testid="last-sync-time"]');
    await expect(lastSyncTime).toBeVisible();

    // Verify sync status indicator is displayed
    const statusIndicator = syncStatusSection.locator('[data-testid="sync-status-indicator"]');
    await expect(statusIndicator).toBeVisible();

    // Verify status is one of the valid values
    const statusText = await statusIndicator.getAttribute('data-status');
    expect(['synced', 'syncing', 'error', 'pending']).toContain(statusText);
  });
});
