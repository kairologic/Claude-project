/**
 * UC-HOME: Dashboard Home Page Tests
 *
 * Tests the dashboard home page at /practice/{id}
 * - KPI cards displaying provider counts
 * - KPI card navigation
 * - Priority providers list
 * - Payer sync status
 * - Welcome banner
 * - Practice compliance section
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-HOME: Dashboard Home', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await page.waitForLoadState('networkidle');
  });

  test('UC-HOME-01: KPI cards display provider counts', async ({ page }) => {
    // Verify 4 KPI cards are displayed with status indicators
    // Cards: needs_attention, in_progress, monitoring, all_clear
    const kpiCardSection = page.locator('[data-testid="kpi-cards"]');
    await expect(kpiCardSection).toBeVisible();

    // Check for each status card
    const statusCategories = ['needs attention', 'in progress', 'monitoring', 'all clear'];

    for (const status of statusCategories) {
      const card = page.locator('[data-testid*="kpi-card"]').filter({
        hasText: new RegExp(status, 'i'),
      });
      await expect(card.first()).toBeVisible();

      // Verify numeric count is displayed
      const countText = card.first().locator('[data-testid="kpi-count"]');
      await expect(countText).toBeVisible();
      const count = await countText.textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  test('UC-HOME-02: KPI card click navigates to roster', async ({ page }) => {
    // Click the needs attention card
    const needsAttentionCard = page
      .locator('[data-testid*="kpi-card"]')
      .filter({ hasText: /needs attention/i })
      .first();

    await needsAttentionCard.click();

    // Wait for navigation and URL change
    await page.waitForURL(`**/roster**`, { timeout: 5000 });
    expect(page.url()).toContain('/roster');
  });

  test('UC-HOME-03: Priority providers list displays provider data', async ({ page }) => {
    // Verify priority providers section is present
    const prioritySection = page.locator('[data-testid="priority-providers-section"]');
    await expect(prioritySection).toBeVisible();

    // Check if providers are listed or empty state is shown
    const providerList = page.locator('[data-testid="priority-providers-list"]');
    const emptyState = page.locator('[data-testid="priority-providers-empty"]');

    const hasProviders = await providerList.isVisible();
    const hasEmptyState = await emptyState.isVisible();

    // One of these should be visible
    expect(hasProviders || hasEmptyState).toBeTruthy();

    // If providers are shown, verify they have required fields
    if (hasProviders) {
      const providerCards = page.locator('[data-testid="priority-provider-card"]');
      const count = await providerCards.count();

      if (count > 0) {
        const firstCard = providerCards.first();
        // Verify provider has name and issue indicators
        await expect(firstCard.locator('[data-testid="provider-name"]')).toBeVisible();
      }
    }
  });

  test('UC-HOME-04: Payer sync status panel shows real data or empty state', async ({ page }) => {
    // Locate payer sync status panel
    const payerSyncPanel = page.locator('[data-testid="payer-sync-status-panel"]');
    await expect(payerSyncPanel).toBeVisible();

    // Should show either payer rows with status or an empty state
    const payerRows = payerSyncPanel.locator('[data-testid="payer-sync-row"]');
    const emptyState = payerSyncPanel.locator('[data-testid="payer-sync-empty"]');

    const hasPayers = await payerRows.count().then((c) => c > 0);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasPayers || hasEmptyState).toBeTruthy();

    // If payer rows exist, verify they have status text (relative time or status label)
    if (hasPayers) {
      const firstRow = payerRows.first();
      const statusText = firstRow.locator('[data-testid="payer-sync-status-text"]');
      await expect(statusText).toBeVisible();
      const text = await statusText.textContent();
      // Should show relative time ("X days ago") or status ("Pending credentials", "Sync error")
      expect(text).toBeTruthy();
    }
  });

  test('UC-HOME-05: Welcome banner shows user name and can be dismissed', async ({ page }) => {
    const welcomeBanner = page.locator('[data-testid="welcome-banner"]');

    // Check if banner is visible
    if (await welcomeBanner.isVisible()) {
      // Verify user name is shown in welcome message
      const welcomeText = welcomeBanner.locator('[data-testid="welcome-text"]');
      await expect(welcomeText).toBeVisible();
      const text = await welcomeText.textContent();
      expect(text).toMatch(/welcome/i);

      // Click dismiss button
      const dismissBtn = welcomeBanner.locator('[data-testid="dismiss-banner-btn"]');
      await expect(dismissBtn).toBeVisible();
      await dismissBtn.click();

      // Verify banner is hidden
      await expect(welcomeBanner).not.toBeVisible();
    }
  });

  test('UC-HOME-06: Practice compliance section shows real findings or not-scanned state', async ({
    page,
  }) => {
    // Locate practice compliance section
    const complianceSection = page.locator('[data-testid="practice-compliance-section"]');
    await expect(complianceSection).toBeVisible();

    // Verify it has compliance indicators
    const complianceItems = complianceSection.locator('[data-testid="compliance-item"]');
    const count = await complianceItems.count();
    expect(count).toBeGreaterThan(0);

    // Verify each item has a status indicator — should NOT show "Pending"
    const firstItem = complianceItems.first();
    const statusIndicator = firstItem.locator('[data-testid="compliance-status-icon"]');
    await expect(statusIndicator).toBeVisible();

    // Status values should be real data (Compliant, Action needed, Not scanned) — never "Pending"
    for (let i = 0; i < count; i++) {
      const item = complianceItems.nth(i);
      const text = await item.textContent();
      expect(text).not.toContain('Pending');
    }
  });

  test('UC-HOME-07: Compliance score displays as percentage when findings exist', async ({
    page,
  }) => {
    const complianceScore = page.locator('[data-testid="compliance-score"]');
    // Score might not be present if no findings have been scanned yet
    if (await complianceScore.isVisible()) {
      const text = await complianceScore.textContent();
      // Should show a percentage (e.g., "72%") or "—" if not applicable
      expect(text).toMatch(/^\d{1,3}%$|^—$/);
    }
  });
});
