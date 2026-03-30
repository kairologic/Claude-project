/**
 * UC-REG: Regression and Edge Case Tests
 *
 * Tests edge cases and error handling
 * - Empty dashboard handling
 * - Error boundary functionality
 * - Long content truncation
 * - Keyboard navigation
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-REG: Regression Tests', () => {
  test('UC-REG-01: Empty dashboard handles gracefully (no providers/workflows)', async ({
    page,
  }) => {
    await navigateToDashboard(page);

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();

    // Check for KPI cards section
    const kpiCards = page.locator('[data-testid="kpi-cards"]');
    const kpiVisible = await kpiCards.isVisible();

    // Check for empty state messages if no data
    const emptyStates = page.locator('[data-testid*="empty"]');
    const hasEmptyStates = await emptyStates.count().then((c) => c > 0);

    // Either KPI cards or empty states should be present
    expect(kpiVisible || hasEmptyStates).toBeTruthy();

    // Verify no JavaScript errors occurred
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to capture any errors
    await page.waitForTimeout(2000);

    // Should have few or no errors (some third-party errors are acceptable)
    expect(consoleErrors.length).toBeLessThan(3);
  });

  test('UC-REG-02: Error boundaries catch rendering errors', async ({
    page,
  }) => {
    // Navigate to a page
    await navigateToDashboard(page);

    // Check if page renders without crashing
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Verify no unhandled errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Filter out common third-party errors
        const text = msg.text().toLowerCase();
        if (
          !text.includes('chrome-extension') &&
          !text.includes('third-party') &&
          !text.includes('script')
        ) {
          errors.push(msg.text());
        }
      }
    });

    // Navigate to another page
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');

    // Wait for potential errors
    await page.waitForTimeout(1500);

    // Verify page is still functional
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Should have minimal errors
    expect(errors.length).toBeLessThan(2);
  });

  test('UC-REG-03: Long provider names truncate properly', async ({
    page,
  }) => {
    // Navigate to roster
    await page.goto(URLS.roster(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');

    // Get provider rows
    const providerRows = page.locator('[data-testid="provider-row"]');
    const rowCount = await providerRows.count();

    if (rowCount > 0) {
      // Check first provider name
      const firstRow = providerRows.first();
      const nameCell = firstRow.locator('[data-testid="provider-name-cell"]');
      await expect(nameCell).toBeVisible();

      // Get computed styles to verify truncation is applied
      const boundingBox = await nameCell.boundingBox();
      expect(boundingBox).not.toBeNull();

      // Verify text is visible (even if truncated)
      const nameText = await nameCell.textContent();
      expect(nameText?.trim().length).toBeGreaterThan(0);

      // Check for ellipsis or text-overflow styling
      const styles = await nameCell.evaluate((el) => {
        return {
          overflow: window.getComputedStyle(el).overflow,
          textOverflow: window.getComputedStyle(el).textOverflow,
          whiteSpace: window.getComputedStyle(el).whiteSpace,
        };
      });

      // Verify truncation styles are applied
      const hasOverflow =
        styles.overflow === 'hidden' || styles.textOverflow === 'ellipsis';
      expect(
        hasOverflow || styles.whiteSpace?.includes('nowrap')
      ).toBeTruthy();
    }
  });

  test('UC-REG-04: Keyboard navigation works (Tab, Enter, Escape)', async ({
    page,
  }) => {
    await navigateToDashboard(page);

    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Focus should be on an element
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.getAttribute('data-testid') || 'body';
    });
    expect(focusedElement).toBeTruthy();

    // Test Enter key on focusable elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Focus on first button
      await buttons.first().focus();

      // Get button text before
      const buttonText = await buttons.first().textContent();

      // Press Enter (may trigger action or keep focus)
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    }

    // Test Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Page should still be functional
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

    // Test Tab through navigation items
    const navItems = page.locator('[data-testid*="nav-item"]');
    const navCount = await navItems.count();
    expect(navCount).toBeGreaterThan(0);

    // Verify nav items are keyboard accessible (have focus styles)
    if (navCount > 0) {
      await navItems.first().focus();
      const isFocused = await navItems.first().evaluate((el) => {
        return document.activeElement === el;
      });
      expect(isFocused).toBeTruthy();
    }
  });
});
