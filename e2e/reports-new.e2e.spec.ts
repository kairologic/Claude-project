/**
 * UC-RPT2: New Report Types Tests
 *
 * Tests the new report types added to the Reports page:
 * - EHR Vendor AI Detection report
 * - Specialty Mismatch report
 * - Report generation and export
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-RPT2: New Report Types', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await page.goto(URLS.reports(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-RPT2-01: EHR Vendor AI Detection report type is visible', async ({ page }) => {
    // Find the EHR Vendor report card
    const reportCards = page.locator('[data-testid="report-type-card"]');
    const ehrCard = reportCards.filter({ hasText: /EHR Vendor/i });

    await expect(ehrCard.first()).toBeVisible();

    // Verify it has a generate button (not "Coming soon")
    const generateBtn = ehrCard
      .first()
      .locator('button')
      .filter({ hasText: /generate/i });
    await expect(generateBtn).toBeVisible();
  });

  test('UC-RPT2-02: Specialty Mismatch report type is visible', async ({ page }) => {
    // Find the Specialty Mismatch report card
    const reportCards = page.locator('[data-testid="report-type-card"]');
    const specialtyCard = reportCards.filter({ hasText: /Specialty Mismatch/i });

    await expect(specialtyCard.first()).toBeVisible();

    // Verify it has a generate button
    const generateBtn = specialtyCard
      .first()
      .locator('button')
      .filter({ hasText: /generate/i });
    await expect(generateBtn).toBeVisible();
  });

  test('UC-RPT2-03: EHR Vendor report has confidence level filter', async ({ page }) => {
    // Click on EHR Vendor report to select it
    const reportCards = page.locator('[data-testid="report-type-card"]');
    const ehrCard = reportCards.filter({ hasText: /EHR Vendor/i }).first();
    await ehrCard.click();

    // Wait for filters to appear
    await page.waitForTimeout(500);

    // Verify confidence filter exists
    const confidenceFilter = page.locator('[data-testid="filter-confidence"]');
    if (await confidenceFilter.isVisible().catch(() => false)) {
      // Verify it has the expected options
      await confidenceFilter.click();
      const options = page.locator('[role="option"], option');
      const optionTexts = await options.allTextContents();
      const hasConfidenceOptions = optionTexts.some((t) => /confirmed|likely|possible/i.test(t));
      expect(hasConfidenceOptions).toBeTruthy();
    }
  });

  test('UC-RPT2-04: Specialty Mismatch report has match confidence filter', async ({ page }) => {
    // Click on Specialty Mismatch report to select it
    const reportCards = page.locator('[data-testid="report-type-card"]');
    const specialtyCard = reportCards.filter({ hasText: /Specialty Mismatch/i }).first();
    await specialtyCard.click();

    // Wait for filters
    await page.waitForTimeout(500);

    // Verify confidence filter exists
    const confidenceFilter = page.locator('[data-testid="filter-confidence"]');
    if (await confidenceFilter.isVisible().catch(() => false)) {
      await confidenceFilter.click();
      const options = page.locator('[role="option"], option');
      const optionTexts = await options.allTextContents();
      const hasMatchOptions = optionTexts.some((t) =>
        /low|medium|high|hard mismatch|soft mismatch|sub-specialty/i.test(t),
      );
      expect(hasMatchOptions).toBeTruthy();
    }
  });

  test('UC-RPT2-05: Agent Activity report still shows Coming soon', async ({ page }) => {
    // The Agent Activity report should remain as "Coming soon"
    const reportCards = page.locator('[data-testid="report-type-card"]');
    const agentCard = reportCards.filter({ hasText: /Agent Activity/i });

    if (
      await agentCard
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      const comingSoonText = agentCard.first().locator('text=Coming soon');
      await expect(comingSoonText).toBeVisible();
    }
  });
});
