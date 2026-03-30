/**
 * UC-WF5: Compliance Workflow Tests
 *
 * Tests the compliance workflow functionality
 * - Workflow type visibility in filters
 * - Finding details display
 * - Remediation template availability
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-WF5: Compliance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    // Navigate to workflows page
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-WF5-01: Compliance workflow type visible in filters', async ({
    page,
  }) => {
    // Verify workflow filters section is visible
    const filterSection = page.locator('[data-testid="workflow-filters"]');
    await expect(filterSection).toBeVisible();

    // Look for compliance filter option
    const complianceFilter = filterSection.locator(
      '[data-testid="filter-workflow-type-compliance"]'
    );
    await expect(complianceFilter).toBeVisible();

    // Click compliance filter
    await complianceFilter.click();

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify workflow list is updated
    const workflowList = page.locator('[data-testid="workflow-list"]');
    await expect(workflowList).toBeVisible();

    // Verify compliance workflows are shown or empty state
    const complianceWorkflows = page.locator(
      '[data-testid="workflow-card"][data-type="compliance"]'
    );
    const emptyState = page.locator('[data-testid="workflows-empty-state"]');

    const hasWorkflows = await complianceWorkflows.count().then((c) => c > 0);
    const hasEmpty = await emptyState.isVisible();

    expect(hasWorkflows || hasEmpty).toBeTruthy();
  });

  test('UC-WF5-02: Compliance workflow shows finding details', async ({
    page,
  }) => {
    // Filter for compliance workflows
    const complianceFilter = page.locator(
      '[data-testid="filter-workflow-type-compliance"]'
    );
    await complianceFilter.click();
    await page.waitForTimeout(500);

    // Get compliance workflow cards
    const workflowCards = page.locator(
      '[data-testid="workflow-card"][data-type="compliance"]'
    );
    const cardCount = await workflowCards.count();

    if (cardCount > 0) {
      // Click first compliance workflow
      await workflowCards.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
      await expect(detailPanel).toBeVisible({ timeout: 5000 });

      // Verify findings section is displayed
      const findingsSection = detailPanel.locator(
        '[data-testid="findings-section"]'
      );
      await expect(findingsSection).toBeVisible();

      // Verify findings have details
      const findingItems = findingsSection.locator(
        '[data-testid="finding-item"]'
      );
      const findingCount = await findingItems.count();
      expect(findingCount).toBeGreaterThan(0);

      // Verify each finding has required fields
      const firstFinding = findingItems.first();
      const findingTitle = firstFinding.locator(
        '[data-testid="finding-title"]'
      );
      const findingDescription = firstFinding.locator(
        '[data-testid="finding-description"]'
      );
      const findingSeverity = firstFinding.locator(
        '[data-testid="finding-severity"]'
      );

      await expect(findingTitle).toBeVisible();
      await expect(findingDescription).toBeVisible();
      await expect(findingSeverity).toBeVisible();
    }
  });

  test('UC-WF5-03: Compliance remediation template available', async ({
    page,
  }) => {
    // Filter for compliance workflows
    const complianceFilter = page.locator(
      '[data-testid="filter-workflow-type-compliance"]'
    );
    await complianceFilter.click();
    await page.waitForTimeout(500);

    // Get compliance workflow cards
    const workflowCards = page.locator(
      '[data-testid="workflow-card"][data-type="compliance"]'
    );
    const cardCount = await workflowCards.count();

    if (cardCount > 0) {
      // Click first compliance workflow
      await workflowCards.first().click();

      // Wait for detail panel
      const detailPanel = page.locator('[data-testid="workflow-detail-panel"]');
      await expect(detailPanel).toBeVisible();

      // Look for remediation section
      const remediationSection = detailPanel.locator(
        '[data-testid="remediation-section"]'
      );

      if (await remediationSection.isVisible()) {
        // Verify template button is available
        const templateBtn = remediationSection.locator(
          '[data-testid="use-template-button"]'
        );
        await expect(templateBtn).toBeVisible();

        // Click to view template
        await templateBtn.click();

        // Wait for template to display
        const templateModal = page.locator(
          '[data-testid="remediation-template-modal"]'
        );
        await expect(templateModal).toBeVisible({ timeout: 5000 });

        // Verify template has content
        const templateContent = templateModal.locator(
          '[data-testid="template-content"]'
        );
        await expect(templateContent).toBeVisible();
      }
    }
  });
});
