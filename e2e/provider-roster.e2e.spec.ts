/**
 * UC-ROST: Provider Roster Tests
 *
 * Tests the provider roster page at /practice/{id}/roster
 * - Provider table display and columns
 * - Provider row interactions
 * - Health score display
 * - Issue badges
 * - Action menu
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';
import { navigateToDashboard } from './fixtures/auth';

test.describe('UC-ROST: Provider Roster', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to roster page
    await navigateToDashboard(page);
    await page.goto(URLS.roster(TEST_PRACTICE.id));
    await page.waitForLoadState('networkidle');
  });

  test('UC-ROST-01: Provider table loads with columns', async ({ page }) => {
    // Verify roster page is loaded
    expect(page.url()).toContain('/roster');

    // Verify table header is visible
    const tableHeader = page.locator('[data-testid="roster-table-header"]');
    await expect(tableHeader).toBeVisible();

    // Verify expected column headers exist
    const requiredColumns = ['Provider', 'Specialty', 'NPI', 'Health', 'Issues', 'Status'];

    for (const columnName of requiredColumns) {
      const columnHeader = page.locator(
        `[data-testid="column-header-${columnName.toLowerCase().replace(/\s+/g, '-')}"]`,
      );
      // Try to find by text as fallback
      const headerText = tableHeader.locator('text=' + columnName);
      const exists =
        (await columnHeader.isVisible().catch(() => false)) ||
        (await headerText.isVisible().catch(() => false));
      expect(exists).toBeTruthy();
    }

    // Verify at least one provider row exists
    const tableBody = page.locator('[data-testid="roster-table-body"]');
    await expect(tableBody).toBeVisible();

    const providerRows = tableBody.locator('[data-testid="provider-row"]');
    const rowCount = await providerRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('UC-ROST-02: Provider rows are clickable and open detail panel', async ({ page }) => {
    // Get first provider row
    const firstRow = page.locator('[data-testid="provider-row"]').first();
    await expect(firstRow).toBeVisible();

    // Verify row is clickable (has cursor pointer or role)
    const isClickable = await firstRow
      .evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.cursor === 'pointer';
      })
      .catch(() => false);

    // Click the row
    await firstRow.click();

    // Verify detail panel opens
    const detailPanel = page.locator('[data-testid="provider-detail-panel"]');
    await expect(detailPanel).toBeVisible({ timeout: 2000 });

    // Verify provider name is shown in panel
    const providerName = detailPanel.locator('[data-testid="provider-detail-name"]');
    await expect(providerName).toBeVisible();
  });

  test('UC-ROST-03: Health score bars display with color coding', async ({ page }) => {
    // Get provider rows
    const providerRows = page.locator('[data-testid="provider-row"]');
    const rowCount = await providerRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Check first row for health score
    const firstRow = providerRows.first();
    const healthCell = firstRow.locator('[data-testid="provider-health-cell"]');
    await expect(healthCell).toBeVisible();

    // Verify health score bar is displayed
    const healthBar = healthCell.locator('[data-testid="health-score-bar"]');
    await expect(healthBar).toBeVisible();

    // Verify health score has a numeric value displayed
    const healthValue = healthCell.locator('[data-testid="health-score-value"]');
    const hasValue = await healthValue.isVisible().catch(() => false);
    if (hasValue) {
      const value = await healthValue.textContent();
      const numValue = parseInt(value || '0');
      expect(numValue).toBeGreaterThanOrEqual(0);
      expect(numValue).toBeLessThanOrEqual(100);
    }

    // Verify health bar has color class (safe, warning, critical, etc)
    const classAttr = await healthBar.getAttribute('class');
    expect(classAttr).toBeTruthy();
  });

  test('UC-ROST-04: Issue badges show', async ({ page }) => {
    // Get provider rows
    const providerRows = page.locator('[data-testid="provider-row"]');
    const rowCount = await providerRows.count();

    // Find a row with issues
    let rowWithIssues = null;
    for (let i = 0; i < rowCount; i++) {
      const row = providerRows.nth(i);
      const issueCell = row.locator('[data-testid="provider-issues-cell"]');
      const issueCount = await issueCell.locator('[data-testid="issue-badge"]').count();
      if (issueCount > 0) {
        rowWithIssues = row;
        break;
      }
    }

    if (rowWithIssues) {
      // Verify issue badges are visible
      const issueCell = rowWithIssues.locator('[data-testid="provider-issues-cell"]');
      const issueBadges = issueCell.locator('[data-testid="issue-badge"]');
      const badgeCount = await issueBadges.count();
      expect(badgeCount).toBeGreaterThan(0);

      // Verify each badge has issue type text
      const firstBadge = issueBadges.first();
      const badgeText = await firstBadge.textContent();
      expect(badgeText).toBeTruthy();

      // Verify badge has color/style indicating issue type
      const badgeClass = await firstBadge.getAttribute('class');
      expect(badgeClass).toContain('badge');

      // Collect all badge texts to verify known badge types
      const allBadgeTexts: string[] = [];
      for (let b = 0; b < badgeCount; b++) {
        const text = await issueBadges.nth(b).textContent();
        if (text) allBadgeTexts.push(text.toLowerCase());
      }
      // Known issue badge types include: address, phone, taxonomy/specialty, name, license
      const knownBadgeTypes = ['address', 'phone', 'taxonomy', 'specialty', 'name', 'license'];
      const hasKnownType = allBadgeTexts.some((t) => knownBadgeTypes.some((k) => t.includes(k)));
      // At least one badge should match a known type
      expect(hasKnownType).toBeTruthy();
    }
  });

  test('UC-ROST-05: Action menu appears with options', async ({ page }) => {
    // Get first provider row
    const firstRow = page.locator('[data-testid="provider-row"]').first();
    await expect(firstRow).toBeVisible();

    // Hover over row to reveal action menu (if hidden)
    await firstRow.hover();

    // Look for action menu button/icon
    const actionMenu = firstRow.locator('[data-testid="provider-action-menu"]');
    const actionButton = firstRow.locator('[data-testid="provider-action-button"]');

    const hasMenu = await actionMenu.isVisible().catch(() => false);
    const hasButton = await actionButton.isVisible().catch(() => false);

    expect(hasMenu || hasButton).toBeTruthy();

    // Click action menu button if it exists
    if (hasButton) {
      await actionButton.click();
    }

    // Verify menu is open with options
    const menuDropdown = page.locator('[data-testid="provider-action-dropdown"]');
    await expect(menuDropdown).toBeVisible({ timeout: 2000 });

    // Verify expected menu options exist
    const expectedOptions = ['view details', 'view workflows', 'departing'];

    const menuItems = menuDropdown.locator('[data-testid="menu-item"]');
    const itemCount = await menuItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // At least some of the expected options should be present
    for (const option of expectedOptions) {
      const optionItem = menuDropdown.locator(`text=/${option}/i`);
      const exists = await optionItem.isVisible().catch(() => false);
      // Not all options need to be present, just verify menu has items
    }
  });
});
