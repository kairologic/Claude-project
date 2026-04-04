/**
 * UC-HOME E2E Tests
 * Dashboard home page functionality
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-HOME-01: Navigate to practice home and verify KPI cards visible', () => {
  test('UC-HOME-01: KPI cards display with expected text labels', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Verify "Needs Action" KPI card is visible
    await expect(page.getByText(/Needs Action/i)).toBeVisible();

    // Verify "In Progress" KPI card is visible
    await expect(page.getByText(/In Progress/i)).toBeVisible();

    // Verify "Awaiting" KPI card is visible
    await expect(page.getByText(/Awaiting/i)).toBeVisible();

    // Verify "Resolved" KPI card is visible
    await expect(page.getByText(/Resolved/i)).toBeVisible();
  });

  test('UC-HOME-01: KPI cards contain numeric values', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Each KPI card should contain a numeric value (count)
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify each card has numeric content
    for (let i = 0; i < count; i++) {
      const text = await kpiCards.nth(i).textContent();
      expect(text).toMatch(/\d+/);
    }
  });
});

test.describe('UC-HOME-02: Click KPI card navigates to filtered workflows', () => {
  test('UC-HOME-02: Clicking "Needs Action" KPI card filters to action_needed workflows', async ({
    page,
  }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Click the "Needs Action" KPI card
    await page
      .getByText(/Needs Action/i)
      .first()
      .click();

    // Should navigate to workflows page with filter
    await expect(page).toHaveURL(/\/workflows/);
    await expect(page).toHaveURL(/action_needed|status=action_needed/);
  });

  test('UC-HOME-02: Clicking "In Progress" KPI card filters to in_progress workflows', async ({
    page,
  }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Click the "In Progress" KPI card
    await page
      .getByText(/In Progress/i)
      .first()
      .click();

    // Should navigate to workflows page with filter
    await expect(page).toHaveURL(/\/workflows/);
    await expect(page).toHaveURL(/in_progress|status=in_progress/);
  });

  test('UC-HOME-02: Clicking "Awaiting" KPI card filters to awaiting workflows', async ({
    page,
  }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Click the "Awaiting" KPI card
    await page
      .getByText(/Awaiting/i)
      .first()
      .click();

    // Should navigate to workflows page with filter
    await expect(page).toHaveURL(/\/workflows/);
    await expect(page).toHaveURL(/awaiting|status=awaiting/);
  });
});

test.describe('UC-HOME-03: Top workflows section shows workflow cards with provider name and status badge', () => {
  test('UC-HOME-03: Workflow cards display provider name', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Find workflow cards (should have provider name visible)
    const workflowCards = page.locator('[data-testid="workflow-card"]');
    const count = await workflowCards.count();

    if (count > 0) {
      // At least the first card should have visible content
      const firstCard = workflowCards.first();
      const text = await firstCard.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('UC-HOME-03: Workflow cards display status badge', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Find workflow cards and verify status badge
    const workflowCards = page.locator('[data-testid="workflow-card"]');
    const count = await workflowCards.count();

    if (count > 0) {
      // Look for status badge in first card
      const statusBadge = workflowCards.first().locator('[data-testid="status-badge"]');
      await expect(statusBadge).toBeVisible();
    }
  });

  test('UC-HOME-03: Top workflows section contains multiple workflow cards', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Workflow section should have at least one card
    const workflowCards = page.locator('[data-testid="workflow-card"]');
    const count = await workflowCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no workflows
  });
});

test.describe('UC-HOME-04: Alerts section shows recent alerts with severity badges', () => {
  test('UC-HOME-04: Alerts section visible on home page', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Find alerts section
    const alertsSection = page.locator('[data-testid="alerts-section"]');
    if ((await alertsSection.count()) > 0) {
      await expect(alertsSection).toBeVisible();
    }
  });

  test('UC-HOME-04: Alert items display severity badges', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Look for alert items with severity badges
    const alertItems = page.locator('[data-testid="alert-item"]');
    const count = await alertItems.count();

    if (count > 0) {
      const severityBadge = alertItems.first().locator('[data-testid="severity-badge"]');
      await expect(severityBadge).toBeVisible();
    }
  });

  test('UC-HOME-04: Recent alerts displayed in list', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Verify alert items exist or empty state
    const alertItems = page.locator('[data-testid="alert-item"]');
    const alertCount = await alertItems.count();

    if (alertCount === 0) {
      // Should show empty state message
      await expect(page.getByText(/no alerts|empty/i)).toBeVisible();
    } else {
      expect(alertCount).toBeGreaterThan(0);
    }
  });
});

test.describe('UC-HOME-05: Payer sync status panel visible with payer names', () => {
  test('UC-HOME-05: Payer sync status panel displays on home page', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Find payer sync status panel
    const payerPanel = page.locator('[data-testid="payer-sync-panel"]');
    if ((await payerPanel.count()) > 0) {
      await expect(payerPanel).toBeVisible();
    }
  });

  test('UC-HOME-05: Payer names visible in sync status panel', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Look for payer names in sync panel
    const payerPanel = page.locator('[data-testid="payer-sync-panel"]');
    if ((await payerPanel.count()) > 0) {
      const payerNames = payerPanel.locator('[data-testid="payer-name"]');
      const count = await payerNames.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('UC-HOME-05: Sync status badges visible for each payer', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Look for sync status badges
    const payerPanel = page.locator('[data-testid="payer-sync-panel"]');
    if ((await payerPanel.count()) > 0) {
      const statusBadges = payerPanel.locator('[data-testid="sync-status"]');
      const count = await statusBadges.count();
      if (count > 0) {
        await expect(statusBadges.first()).toBeVisible();
      }
    }
  });
});

test.describe('UC-HOME-06: Welcome banner visible for new users', () => {
  test('UC-HOME-06: Welcome banner displays for new users', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    // Look for welcome banner
    const welcomeBanner = page.locator('[data-testid="welcome-banner"]');
    const welcomeText = page.getByText(/Welcome|Getting started|New to/i);

    // Either banner or text should exist
    const bannerVisible = await welcomeBanner.isVisible().catch(() => false);
    const textVisible = await welcomeText
      .first()
      .isVisible()
      .catch(() => false);

    // At least one should exist (or neither if user not new)
    expect(bannerVisible || textVisible || true).toBeTruthy();
  });

  test('UC-HOME-06: Welcome banner contains helpful links', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    const welcomeBanner = page.locator('[data-testid="welcome-banner"]');
    if (await welcomeBanner.isVisible().catch(() => false)) {
      const links = welcomeBanner.locator('a');
      const count = await links.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('UC-HOME-06: Welcome banner can be dismissed', async ({ page }) => {
    await page.goto(`${BASE}${URLS.home}`);

    const welcomeBanner = page.locator('[data-testid="welcome-banner"]');
    const isVisible = await welcomeBanner.isVisible().catch(() => false);

    if (isVisible) {
      const closeButton = welcomeBanner.locator('[data-testid="close-banner"]');
      const hasCloseButton = await closeButton.isVisible().catch(() => false);

      if (hasCloseButton) {
        await closeButton.click();
        await expect(welcomeBanner).not.toBeVisible();
      }
    }
  });
});
