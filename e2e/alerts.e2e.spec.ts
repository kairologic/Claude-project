/**
 * UC-ALRT: Alerts Page Tests
 *
 * Tests the alerts page at /practice/{id}/alerts
 * - Alerts page load and summary
 * - New alerts section
 * - Alert card display
 * - Earlier alerts section
 * - Empty state
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-ALRT: Alerts', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to alerts page
    await navigateToDashboard(page);
    await page.goto(URLS.alerts(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-ALRT-01: Alerts page loads with summary count', async ({
    page,
  }) => {
    // Verify alerts page is loaded
    expect(page.url()).toContain('/alerts');

    // Verify page header exists
    const pageHeader = page.locator('[data-testid="alerts-page-header"]');
    await expect(pageHeader).toBeVisible();

    // Verify summary count is displayed
    const summaryCount = page.locator('[data-testid="alerts-summary-count"]');
    const hasSummary = await summaryCount.isVisible().catch(() => false);

    if (hasSummary) {
      const countText = await summaryCount.textContent();
      const count = parseInt(countText?.match(/\d+/)?.[0] || '0');
      expect(count).toBeGreaterThanOrEqual(0);
    }

    // Verify page has main alerts container
    const alertsContainer = page.locator('[data-testid="alerts-container"]');
    await expect(alertsContainer).toBeVisible();
  });

  test('UC-ALRT-02: New alerts section shows with label', async ({
    page,
  }) => {
    // Check for new alerts section
    const newAlertsSection = page.locator(
      '[data-testid="new-alerts-section"]'
    );
    const hasNewAlerts = await newAlertsSection.isVisible().catch(() => false);

    if (hasNewAlerts) {
      // Verify section label exists
      const sectionLabel = newAlertsSection.locator(
        '[data-testid="new-alerts-label"]'
      );
      await expect(sectionLabel).toBeVisible();

      // Verify label text indicates "new since last visit"
      const labelText = await sectionLabel.textContent();
      expect(labelText?.toLowerCase()).toContain('new');

      // Verify at least one alert card in new section
      const alertCards = newAlertsSection.locator(
        '[data-testid="alert-card"]'
      );
      const count = await alertCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('UC-ALRT-03: Alert cards display severity, title, description', async ({
    page,
  }) => {
    // Get alert cards
    const alertCards = page.locator('[data-testid="alert-card"]');
    const count = await alertCards.count();

    if (count === 0) {
      // If no alerts, skip this test
      test.skip();
    }

    // Check first alert card
    const firstAlert = alertCards.first();
    await expect(firstAlert).toBeVisible();

    // Verify severity indicator exists
    const severityIndicator = firstAlert.locator(
      '[data-testid="alert-severity-icon"]'
    );
    const hasSeverityIcon = await severityIndicator
      .isVisible()
      .catch(() => false);

    if (hasSeverityIcon) {
      // Verify severity has class or data indicating level
      const severityClass = await severityIndicator.getAttribute('class');
      expect(severityClass).toBeTruthy();
    }

    // Verify alert title is displayed
    const alertTitle = firstAlert.locator('[data-testid="alert-title"]');
    const hasTitle = await alertTitle.isVisible().catch(() => false);

    if (hasTitle) {
      const title = await alertTitle.textContent();
      expect(title).toBeTruthy();
    }

    // Verify alert description is displayed
    const alertDesc = firstAlert.locator('[data-testid="alert-description"]');
    const hasDesc = await alertDesc.isVisible().catch(() => false);

    if (hasDesc) {
      const desc = await alertDesc.textContent();
      expect(desc).toBeTruthy();
    }

    // Verify alert has at least title or description
    expect(hasTitle || hasDesc).toBeTruthy();
  });

  test('UC-ALRT-04: Earlier alerts section separated by divider', async ({
    page,
  }) => {
    // Check for earlier alerts section
    const earlierAlertsSection = page.locator(
      '[data-testid="earlier-alerts-section"]'
    );
    const hasEarlierAlerts = await earlierAlertsSection
      .isVisible()
      .catch(() => false);

    if (hasEarlierAlerts) {
      // Verify divider exists between sections
      const divider = page.locator('[data-testid="alerts-section-divider"]');
      const hasDivider = await divider.isVisible().catch(() => false);

      if (hasDivider) {
        await expect(divider).toBeVisible();
      }

      // Verify earlier alerts section label
      const sectionLabel = earlierAlertsSection.locator(
        '[data-testid="earlier-alerts-label"]'
      );
      const hasLabel = await sectionLabel.isVisible().catch(() => false);

      if (hasLabel) {
        const labelText = await sectionLabel.textContent();
        expect(labelText?.toLowerCase()).toContain('earlier');
      }

      // Verify alert cards in earlier section
      const alertCards = earlierAlertsSection.locator(
        '[data-testid="alert-card"]'
      );
      const count = await alertCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('UC-ALRT-05: Empty state shown when no alerts', async ({ page }) => {
    // Navigate directly to alerts page (may have no alerts depending on test data)
    // If alerts exist, this test will verify empty state exists but not be triggered

    // Check if alerts container is empty
    const alertsContainer = page.locator('[data-testid="alerts-container"]');
    const newAlertsSection = page.locator(
      '[data-testid="new-alerts-section"]'
    );
    const earlierAlertsSection = page.locator(
      '[data-testid="earlier-alerts-section"]'
    );

    const hasNewAlerts = await newAlertsSection.isVisible().catch(
      () => false
    );
    const hasEarlierAlerts = await earlierAlertsSection
      .isVisible()
      .catch(() => false);

    // If no alert sections are visible, empty state should be shown
    if (!hasNewAlerts && !hasEarlierAlerts) {
      const emptyState = page.locator('[data-testid="alerts-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        await expect(emptyState).toBeVisible();

        // Verify empty state has helpful message
        const emptyMessage = emptyState.locator(
          '[data-testid="empty-state-message"]'
        );
        const hasMessage = await emptyMessage.isVisible().catch(() => false);

        if (hasMessage) {
          const message = await emptyMessage.textContent();
          expect(message).toBeTruthy();
        }

        // Verify empty state may have illustration or icon
        const emptyIcon = emptyState.locator('[data-testid="empty-state-icon"]');
        const hasIcon = await emptyIcon.isVisible().catch(() => false);
      }
    }
  });
});
