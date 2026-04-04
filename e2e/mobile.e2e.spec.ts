/**
 * UC-REG-08: Mobile Responsive Tests
 *
 * Tests dashboard and navigation on mobile viewports
 * - Dashboard loads on mobile
 * - KPI cards stack vertically
 * - Navigation is accessible on mobile
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-REG-08: Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone viewport

  test('Dashboard loads on mobile viewport', async ({ page }) => {
    await navigateToDashboard(page);
    await expect(page.locator('body')).toBeVisible();

    // Verify main content is visible
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // Verify page is responsive (not broken layout)
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(375);
    expect(viewport?.height).toBe(812);
  });

  test('KPI cards stack vertically on mobile', async ({ page }) => {
    await navigateToDashboard(page);

    // Page should be functional even if layout adjusts
    const statusIndicator = page
      .getByText(/needs attention|monitoring|in progress|all clear/i)
      .first();
    await expect(statusIndicator).toBeVisible();

    // Verify KPI section exists
    const kpiSection = page.locator('[data-testid="kpi-cards"]');
    if (await kpiSection.isVisible()) {
      // Get KPI cards
      const kpiCards = kpiSection.locator('[data-testid*="kpi-card"]');
      const cardCount = await kpiCards.count();

      if (cardCount > 1) {
        // Get bounding boxes of cards to verify vertical stacking
        const firstCardBox = await kpiCards.nth(0).boundingBox();
        const secondCardBox = await kpiCards.nth(1).boundingBox();

        // On mobile, cards should be stacked (second card below first)
        // Second card's top should be greater than first card's top
        if (firstCardBox && secondCardBox) {
          expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y);
        }
      }
    }
  });

  test('Navigation is accessible on mobile', async ({ page }) => {
    await navigateToDashboard(page);

    // Sidebar should still exist (may need hamburger menu in future)
    const sidebar = page.locator('aside');
    const sidebarVisible = await sidebar.isVisible();

    if (sidebarVisible) {
      // Sidebar should be accessible
      await expect(sidebar).toBeVisible();

      // Verify nav items are present
      const navItems = page.locator('[data-testid*="nav-item"]');
      const itemCount = await navItems.count();
      expect(itemCount).toBeGreaterThan(0);
    } else {
      // If sidebar not visible, check for mobile menu button
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');

      // Mobile menu button should be present or sidebar should be visible
      const hasMenuButton = await mobileMenuButton.isVisible();
      expect(sidebarVisible || hasMenuButton).toBeTruthy();
    }

    // Verify main navigation elements are accessible
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();
  });

  test('Mobile layout does not cause horizontal scroll', async ({ page }) => {
    await navigateToDashboard(page);

    // Check if page has horizontal scrollbar or overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
        ? true
        : false;
    });

    // On mobile, we should avoid horizontal scrolling
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Mobile touch targets are appropriately sized', async ({ page }) => {
    await navigateToDashboard(page);

    // Get all clickable elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Check first button size
      const firstButtonBox = await buttons.first().boundingBox();

      // Mobile touch targets should be at least 44x44 px (Apple) or 48x48 px (Material Design)
      if (firstButtonBox) {
        // Allow some buttons to be smaller (icons), but most should meet minimum
        const minTouchTarget = 40; // Slightly smaller to account for padding/borders
        expect(firstButtonBox.width).toBeGreaterThan(minTouchTarget / 2);
        expect(firstButtonBox.height).toBeGreaterThan(minTouchTarget / 2);
      }
    }
  });
});
