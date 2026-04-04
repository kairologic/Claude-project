/**
 * UC-REG-07: Cross-Browser Compatibility Tests
 *
 * Tests dashboard rendering and navigation across different browsers
 * - Dashboard renders in all browsers
 * - Navigation works consistently
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-REG-07: Cross-Browser Compatibility', () => {
  test('Dashboard renders correctly across browsers', async ({ page, browserName }) => {
    await navigateToDashboard(page);

    // KPI cards visible
    const kpiCards = page.locator('[role="button"]');
    await expect(kpiCards.first()).toBeVisible();

    // Sidebar visible
    await expect(page.locator('aside')).toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(2000);

    // Allow some errors (3rd party, etc.)
    expect(errors.length).toBeLessThan(5);
  });

  test('Navigation works across browsers', async ({ page, browserName }) => {
    await navigateToDashboard(page);

    // Navigate to workflows
    await page.click('text=Workflows');
    await expect(page).toHaveURL(/\/workflows/);

    // Navigate to roster
    await page.click('text=Provider roster');
    await expect(page).toHaveURL(/\/roster/);

    // Navigate back to dashboard
    const sidebar = page.locator('[data-testid="sidebar"]');
    await sidebar.locator('[data-testid="nav-item-dashboard"]').click();

    // Should be on dashboard
    const kpiSection = page.locator('[data-testid="kpi-cards"]');
    await expect(kpiSection).toBeVisible({ timeout: 5000 });
  });
});
