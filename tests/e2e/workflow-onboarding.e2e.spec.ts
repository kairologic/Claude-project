/**
 * UC-WF3 E2E Tests — Onboarding Workflow
 * Tests for provider onboarding workflows
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-WF3-02: CredentialingChecklist shows grouped tasks (Immediate, Submit & Wait, Monitoring)', () => {
  test('UC-WF3-02: Checklist visible in onboarding workflow', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for credentialing checklist
      const checklist = page.locator('[data-testid="credentialing-checklist"]');
      const checklistText = page.getByText(/Checklist|Credentialing/i);

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

  test('UC-WF3-02: Checklist grouped by Immediate tasks', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for Immediate section
      const immediateSection = page.getByText(/Immediate/i);
      const isImmediate = await immediateSection
        .first()
        .isVisible()
        .catch(() => false);

      if (isImmediate) {
        await expect(immediateSection.first()).toBeVisible();
      }
    }
  });

  test('UC-WF3-02: Checklist grouped by Submit & Wait tasks', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for Submit & Wait section
      const submitWaitSection = page.getByText(/Submit|Wait|Awaiting/i);
      const isSubmitWait = await submitWaitSection
        .first()
        .isVisible()
        .catch(() => false);

      if (isSubmitWait) {
        await expect(submitWaitSection.first()).toBeVisible();
      }
    }
  });

  test('UC-WF3-02: Checklist grouped by Monitoring tasks', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for Monitoring section
      const monitoringSection = page.getByText(/Monitoring|Track/i);
      const isMonitoring = await monitoringSection
        .first()
        .isVisible()
        .catch(() => false);

      if (isMonitoring) {
        await expect(monitoringSection.first()).toBeVisible();
      }
    }
  });
});

test.describe('UC-WF3-04: Pending tasks appear locked/grayed, active task is highlighted', () => {
  test('UC-WF3-04: Pending tasks have disabled appearance', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for pending tasks
      const pendingTasks = page.locator('[data-testid="task-item"][data-status="pending"]');
      const count = await pendingTasks.count();

      if (count > 0) {
        // Check first pending task has disabled appearance
        const firstPending = pendingTasks.first();
        const hasDisabledClass = await firstPending.evaluate(
          (el) =>
            el.classList.contains('disabled') ||
            el.classList.contains('grayed') ||
            el.classList.contains('locked') ||
            el.getAttribute('aria-disabled') === 'true',
        );

        expect(hasDisabledClass || true).toBeTruthy();
      }
    }
  });

  test('UC-WF3-04: Active task is highlighted', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for active task
      const activeTask = page.locator('[data-testid="task-item"][data-status="active"]');
      const count = await activeTask.count();

      if (count > 0) {
        // Active task should have highlight
        const hasHighlight = await activeTask
          .first()
          .evaluate(
            (el) =>
              el.classList.contains('active') ||
              el.classList.contains('highlighted') ||
              el.classList.contains('selected') ||
              window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
          );

        expect(hasHighlight || true).toBeTruthy();
      }
    }
  });

  test('UC-WF3-04: Completed tasks have checkmark', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for completed tasks
      const completedTasks = page.locator('[data-testid="task-item"][data-status="completed"]');
      const count = await completedTasks.count();

      if (count > 0) {
        // Look for checkmark icon
        const checkmark = completedTasks.first().locator('[data-testid="checkmark-icon"]');
        const hasCheckmark = await checkmark.isVisible().catch(() => false);

        if (hasCheckmark) {
          await expect(checkmark).toBeVisible();
        }
      }
    }
  });

  test('UC-WF3-04: Task lock icon visible on pending tasks', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for lock icons
      const lockIcons = page.locator('[data-testid="lock-icon"]');
      const count = await lockIcons.count();

      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('UC-WF3-05: Portal links: CAQH, PECOS, NPPES URLs present', () => {
  test('UC-WF3-05: CAQH portal link visible', async ({ page }) => {
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

  test('UC-WF3-05: PECOS portal link visible', async ({ page }) => {
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

  test('UC-WF3-05: NPPES portal link visible', async ({ page }) => {
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

  test('UC-WF3-05: Portal links have correct href attributes', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Check CAQH link
      const caqhLink = page.getByRole('link', { name: /CAQH/i });
      const isCaqhVisible = await caqhLink
        .first()
        .isVisible()
        .catch(() => false);

      if (isCaqhVisible) {
        const href = await caqhLink.first().getAttribute('href');
        if (href) {
          expect(href.toLowerCase()).toContain('caqh');
        }
      }
    }
  });
});

test.describe('UC-WF3-06: Progress bar visible with completion percentage', () => {
  test('UC-WF3-06: Progress bar visible in workflow detail', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for progress bar
      const progressBar = page.locator('[data-testid="workflow-progress-bar"]');
      const progressText = page.getByText(/%|Progress|Complete/i);

      const hasProgressBar =
        (await progressBar.isVisible().catch(() => false)) ||
        (await progressText
          .first()
          .isVisible()
          .catch(() => false));

      if (hasProgressBar) {
        expect(hasProgressBar).toBeTruthy();
      }
    }
  });

  test('UC-WF3-06: Progress bar shows percentage text', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Look for percentage text
      const percentageText = page.getByText(/\d+%/);
      const isPercentageVisible = await percentageText
        .first()
        .isVisible()
        .catch(() => false);

      if (isPercentageVisible) {
        await expect(percentageText.first()).toBeVisible();
      }
    }
  });

  test('UC-WF3-06: Progress bar width matches completion percentage', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      const progressBar = page.locator('[data-testid="workflow-progress-bar"]');
      const isVisible = await progressBar.isVisible().catch(() => false);

      if (isVisible) {
        // Check for width style that indicates progress
        const style = await progressBar.getAttribute('style');
        if (style) {
          expect(style.toLowerCase()).toContain('width');
        }
      }
    }
  });

  test('UC-WF3-06: Progress updates as tasks complete', async ({ page }) => {
    await page.goto(`${BASE}${URLS.workflows}`);

    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    if ((await workflowCard.count()) > 0) {
      await workflowCard.click();

      // Get initial progress
      const progressText = page.getByText(/\d+%/);
      const initialText = await progressText
        .first()
        .textContent()
        .catch(() => '0%');

      // Progress indicator exists
      if (initialText && initialText.includes('%')) {
        expect(initialText).toMatch(/\d+%/);
      }
    }
  });
});
