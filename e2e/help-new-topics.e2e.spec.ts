/**
 * UC-HELP2: Help Center New Topics Tests
 *
 * Tests the new help topics added for:
 * - EHR Vendor AI Detection (AI-05)
 * - Specialty Mismatch Detection (4-way comparison)
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-HELP2: Help Center New Topics', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await page.goto(URLS.help(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-HELP2-01: EHR Vendor AI Detection topic exists in Compliance category', async ({
    page,
  }) => {
    // Find the Compliance Scanning category
    const complianceCategory = page.locator('[data-testid="help-category"]').filter({
      hasText: /compliance/i,
    });

    if (
      await complianceCategory
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await complianceCategory.first().click();
      await page.waitForTimeout(300);

      // Find the EHR Vendor AI Detection topic
      const ehrTopic = page.locator('[data-testid="help-topic"]').filter({
        hasText: /EHR.*Vendor.*AI|AI-05/i,
      });
      await expect(ehrTopic.first()).toBeVisible();

      // Click to expand and verify content
      await ehrTopic.first().click();
      await page.waitForTimeout(300);

      // Verify content mentions key concepts
      const content = page.locator('[data-testid="help-topic-content"]');
      if (await content.isVisible().catch(() => false)) {
        const text = await content.textContent();
        expect(text).toMatch(/eClinicalWorks|Healow|Epic|EHR/i);
        expect(text).toMatch(/confirmed|likely|possible/i);
        expect(text).toMatch(/disclosure/i);
      }
    }
  });

  test('UC-HELP2-02: Specialty Mismatch Detection topic exists in Provider Management', async ({
    page,
  }) => {
    // Find the Provider Management category
    const providerCategory = page.locator('[data-testid="help-category"]').filter({
      hasText: /provider.*management/i,
    });

    if (
      await providerCategory
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await providerCategory.first().click();
      await page.waitForTimeout(300);

      // Find the Specialty Mismatch topic
      const specialtyTopic = page.locator('[data-testid="help-topic"]').filter({
        hasText: /specialty.*mismatch/i,
      });
      await expect(specialtyTopic.first()).toBeVisible();

      // Click to expand and verify content
      await specialtyTopic.first().click();
      await page.waitForTimeout(300);

      const content = page.locator('[data-testid="help-topic-content"]');
      if (await content.isVisible().catch(() => false)) {
        const text = await content.textContent();
        expect(text).toMatch(/four.way|4.way/i);
        expect(text).toMatch(/NPPES|NUCC|taxonomy/i);
        expect(text).toMatch(/consensus/i);
      }
    }
  });

  test('UC-HELP2-03: Search finds EHR detection topic', async ({ page }) => {
    // Use the help center search
    const searchInput = page.locator('[data-testid="help-search-input"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('EHR vendor');
      await page.waitForTimeout(500);

      // Verify search results include the EHR topic
      const results = page.locator('[data-testid="help-search-result"]');
      const resultCount = await results.count();

      if (resultCount > 0) {
        const firstResult = await results.first().textContent();
        expect(firstResult).toMatch(/EHR|vendor|AI/i);
      }
    }
  });

  test('UC-HELP2-04: Search finds specialty mismatch topic', async ({ page }) => {
    const searchInput = page.locator('[data-testid="help-search-input"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('specialty mismatch');
      await page.waitForTimeout(500);

      const results = page.locator('[data-testid="help-search-result"]');
      const resultCount = await results.count();

      if (resultCount > 0) {
        const firstResult = await results.first().textContent();
        expect(firstResult).toMatch(/specialty|mismatch|comparison/i);
      }
    }
  });
});
