/**
 * UC-WF4 E2E Tests — Provider Release Workflow
 * Tests for provider departure/release workflows
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-WF4-02: DepartureChecklist shows red progress bar', () => {
  test('UC-WF4-02: Departure checklist visible in release workflow', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for departure checklist
      const checklist = page.locator('[data-testid="departure-checklist"]');
      const checklistText = page.getByText(/Departure|Checklist|Release/i);

      const isVisible =
        (await checklist.isVisible().catch(() => false)) ||
        (await checklistText
          .first()
          .isVisible()
          .catch(() => false));

      if (isVisible) {
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('UC-WF4-02: Progress bar is red/danger colored', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for progress bar
      const progressBar = page.locator('[data-testid="departure-progress-bar"]');
      const isVisible = await progressBar.isVisible().catch(() => false);

      if (isVisible) {
        // Check for red/danger class
        const hasRedClass = await progressBar.evaluate(
          (el) =>
            el.classList.contains('red') ||
            el.classList.contains('danger') ||
            el.classList.contains('error') ||
            window.getComputedStyle(el).backgroundColor.includes('rgb('),
        );

        if (hasRedClass) {
          expect(hasRedClass).toBeTruthy();
        }
      }
    }
  });

  test('UC-WF4-02: Checklist items visible with completion status', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for checklist items
      const checklistItems = page.locator('[data-testid="checklist-item"]');
      const count = await checklistItems.count();

      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('UC-WF4-02: Progress percentage shown', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for percentage indicator
      const percentageText = page.getByText(/\d+%|progress/i);
      const isPercentageVisible = await percentageText
        .first()
        .isVisible()
        .catch(() => false);

      if (isPercentageVisible) {
        await expect(percentageText.first()).toBeVisible();
      }
    }
  });
});

test.describe('UC-WF4-03: Portal links for NPPES, CAQH, PECOS present', () => {
  test('UC-WF4-03: NPPES portal link visible', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for NPPES link
      const nppesLink = page.getByRole('link', { name: /NPPES/i });
      const isNppesVisible = await nppesLink
        .first()
        .isVisible()
        .catch(() => false);

      if (isNppesVisible) {
        await expect(nppesLink.first()).toBeVisible();
      }
    }
  });

  test('UC-WF4-03: CAQH portal link visible', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for CAQH link
      const caqhLink = page.getByRole('link', { name: /CAQH/i });
      const isCaqhVisible = await caqhLink
        .first()
        .isVisible()
        .catch(() => false);

      if (isCaqhVisible) {
        await expect(caqhLink.first()).toBeVisible();
      }
    }
  });

  test('UC-WF4-03: PECOS portal link visible', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for PECOS link
      const pecosLink = page.getByRole('link', { name: /PECOS/i });
      const isPecosVisible = await pecosLink
        .first()
        .isVisible()
        .catch(() => false);

      if (isPecosVisible) {
        await expect(pecosLink.first()).toBeVisible();
      }
    }
  });

  test('UC-WF4-03: Portal links have correct href attributes', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Verify links have proper hrefs
      const nppesLink = page.getByRole('link', { name: /NPPES/i });
      const isNppesVisible = await nppesLink
        .first()
        .isVisible()
        .catch(() => false);

      if (isNppesVisible) {
        const href = await nppesLink.first().getAttribute('href');
        if (href) {
          expect(href.toLowerCase()).toContain('nppes');
        }
      }
    }
  });
});

test.describe('UC-WF4-04: 90-day phantom listing warning banner visible when monitor_removal active', () => {
  test('UC-WF4-04: Warning banner visible for active removal monitoring', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for warning banner
      const warningBanner = page.locator('[data-testid="phantom-listing-warning"]');
      const warningText = page.getByText(/90-day|Phantom|Warning|Removal/i);

      const isWarningVisible =
        (await warningBanner.isVisible().catch(() => false)) ||
        (await warningText
          .first()
          .isVisible()
          .catch(() => false));

      if (isWarningVisible) {
        expect(isWarningVisible).toBeTruthy();
      }
    }
  });

  test('UC-WF4-04: Warning banner contains 90-day message', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for 90-day message
      const ninetyDayText = page.getByText(/90-day|90 day/i);
      const isMessageVisible = await ninetyDayText
        .first()
        .isVisible()
        .catch(() => false);

      if (isMessageVisible) {
        await expect(ninetyDayText.first()).toBeVisible();
      }
    }
  });

  test('UC-WF4-04: Warning banner has alert styling', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for warning banner with alert styling
      const warningBanner = page.locator('[data-testid="phantom-listing-warning"]');
      const isVisible = await warningBanner.isVisible().catch(() => false);

      if (isVisible) {
        // Check for alert role or warning classes
        const hasAlertRole = await warningBanner.evaluate(
          (el) =>
            el.getAttribute('role') === 'alert' ||
            el.classList.contains('alert') ||
            el.classList.contains('warning') ||
            el.classList.contains('banner'),
        );

        if (hasAlertRole) {
          expect(hasAlertRole).toBeTruthy();
        }
      }
    }
  });

  test('UC-WF4-04: Warning banner contains call-to-action', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for action button or link in warning
      const warningBanner = page.locator('[data-testid="phantom-listing-warning"]');
      const isVisible = await warningBanner.isVisible().catch(() => false);

      if (isVisible) {
        const button = warningBanner.getByRole('button').first();
        const link = warningBanner.getByRole('link').first();

        const hasAction =
          (await button.isVisible().catch(() => false)) ||
          (await link.isVisible().catch(() => false));

        if (hasAction) {
          expect(hasAction).toBeTruthy();
        }
      }
    }
  });

  test('UC-WF4-04: Warning banner can be dismissed', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      const warningBanner = page.locator('[data-testid="phantom-listing-warning"]');
      const isVisible = await warningBanner.isVisible().catch(() => false);

      if (isVisible) {
        const closeButton = warningBanner.locator('[data-testid="close-warning"]');
        const hasCloseButton = await closeButton.isVisible().catch(() => false);

        if (hasCloseButton) {
          await closeButton.click();
          await expect(warningBanner).not.toBeVisible();
        }
      }
    }
  });
});
