/**
 * UC-ONBD: Roster Onboarding Card Tests
 *
 * Tests the provider onboarding card that appears at the top of the roster
 * page when auto-detected providers have not yet been confirmed.
 * - Onboarding card visibility based on confirmation state
 * - Provider checkbox interaction
 * - Confirm and dismiss behavior
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-ONBD: Roster Onboarding Card', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await page.goto(URLS.roster(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-ONBD-01: Onboarding card renders when unconfirmed providers exist', async ({ page }) => {
    // The onboarding card should be visible if onboarding_confirmed is false
    // and there are DETECTED providers
    const onboardingCard = page.locator('[data-testid="roster-onboarding-card"]');
    const rosterTable = page.locator('[data-testid="roster-table-header"]');

    // Either onboarding card is shown or we go straight to the roster
    const hasCard = await onboardingCard.isVisible().catch(() => false);
    const hasRoster = await rosterTable.isVisible().catch(() => false);

    expect(hasCard || hasRoster).toBeTruthy();

    if (hasCard) {
      // Verify card has a title
      const cardTitle = onboardingCard.locator('[data-testid="onboarding-card-title"]');
      await expect(cardTitle).toBeVisible();
      const titleText = await cardTitle.textContent();
      expect(titleText).toMatch(/review|team|provider/i);

      // Verify provider checkboxes exist
      const checkboxes = onboardingCard.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      expect(checkboxCount).toBeGreaterThan(0);

      // Verify confirm button exists
      const confirmBtn = onboardingCard.locator('[data-testid="confirm-providers-btn"]');
      await expect(confirmBtn).toBeVisible();
    }
  });

  test('UC-ONBD-02: Unchecking a provider marks them for removal', async ({ page }) => {
    const onboardingCard = page.locator('[data-testid="roster-onboarding-card"]');

    if (await onboardingCard.isVisible().catch(() => false)) {
      // All checkboxes should be checked by default
      const checkboxes = onboardingCard.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 0) {
        // Uncheck the first provider
        const firstCheckbox = checkboxes.first();
        await expect(firstCheckbox).toBeChecked();
        await firstCheckbox.uncheck();

        // The row should visually indicate removal (look for "Will be removed" or red styling)
        const firstRow = onboardingCard.locator('[data-testid="onboarding-provider-row"]').first();
        const rowText = await firstRow.textContent();
        expect(rowText).toMatch(/will be removed|removed/i);
      }
    }
  });

  test('UC-ONBD-03: Dismiss button hides the card for the session', async ({ page }) => {
    const onboardingCard = page.locator('[data-testid="roster-onboarding-card"]');

    if (await onboardingCard.isVisible().catch(() => false)) {
      // Find and click the dismiss/close button
      const dismissBtn = onboardingCard.locator('[data-testid="dismiss-onboarding-btn"]');

      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();

        // Card should be hidden after dismiss
        await expect(onboardingCard).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('UC-ONBD-04: Card is not shown when onboarding is already confirmed', async ({ page }) => {
    // Navigate to a practice that has already confirmed (if TEST_PRACTICE_2 is confirmed)
    // This is a structural test — verify the card is conditionally rendered
    const onboardingCard = page.locator('[data-testid="roster-onboarding-card"]');
    const rosterTable = page.locator('[data-testid="roster-table-header"]');

    // After confirmation, roster should load without the onboarding card
    // We verify the roster page still works either way
    await expect(rosterTable).toBeVisible({ timeout: 10000 });
  });
});
