import { test, expect } from '@playwright/test';

/**
 * Dashboard Guide (User Manual) Tests
 *
 * Validates the /dashboard/guide page:
 *  - Page loads with HTTP 200
 *  - All major sections are present and visible
 *  - Table of contents links exist
 *  - Page has correct title and structure
 */

test.describe('Dashboard Guide page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/guide');
  });

  test('returns HTTP 200', async ({ page }) => {
    const response = await page.goto('/dashboard/guide');
    expect(response?.status()).toBe(200);
  });

  test('renders page title', async ({ page }) => {
    await expect(
      page.getByText(/sentry shield.*user guide/i).first()
    ).toBeVisible();
  });

  test('renders KairoLogic branding', async ({ page }) => {
    await expect(page.getByText('KAIRO').first()).toBeVisible();
    await expect(page.getByText('LOGIC').first()).toBeVisible();
  });

  test('renders table of contents', async ({ page }) => {
    const tocItems = [
      'Dashboard Overview',
      'Compliance Score',
      'Risk Tiers',
      'Category Scores',
      'Data Border Map',
      'NPI Integrity',
      'Drift Monitor',
      'Scan History',
      'Alerts & Severity',
      'Audit Report',
      'Compliance Widget',
      'Subscription Tiers',
      'Authentication & Security',
      'FAQ',
    ];

    for (const item of tocItems) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible();
    }
  });

  test('renders all major sections', async ({ page }) => {
    const sections = [
      /dashboard overview/i,
      /compliance score/i,
      /risk tiers/i,
      /category scores/i,
      /data border map/i,
      /npi integrity/i,
      /drift monitor/i,
      /scan history/i,
      /alerts.*severity/i,
      /audit report/i,
      /compliance widget/i,
      /subscription tiers/i,
      /authentication.*security/i,
      /frequently asked questions/i,
    ];

    for (const section of sections) {
      await expect(page.getByRole('heading', { name: section }).first()).toBeVisible();
    }
  });

  test('renders risk tier badges', async ({ page }) => {
    await expect(page.getByText('Sovereign').first()).toBeVisible();
    await expect(page.getByText('Drift').first()).toBeVisible();
    await expect(page.getByText('Violation').first()).toBeVisible();
    await expect(page.getByText('Pending').first()).toBeVisible();
  });

  test('renders category explanations', async ({ page }) => {
    await expect(page.getByText(/SB 1188/).first()).toBeVisible();
    await expect(page.getByText(/HB 149/).first()).toBeVisible();
    await expect(page.getByText(/data residency/i).first()).toBeVisible();
    await expect(page.getByText(/ai transparency/i).first()).toBeVisible();
  });

  test('renders severity level badges', async ({ page }) => {
    await expect(page.getByText('Critical').first()).toBeVisible();
    await expect(page.getByText('High').first()).toBeVisible();
    await expect(page.getByText('Medium').first()).toBeVisible();
    await expect(page.getByText('Low').first()).toBeVisible();
  });

  test('renders subscription tier comparison', async ({ page }) => {
    await expect(page.getByText(/watch.*free/i).first()).toBeVisible();
    await expect(page.getByText(/shield.*\$79/i).first()).toBeVisible();
  });

  test('renders FAQ questions', async ({ page }) => {
    const faqs = [
      /how often are automated scans/i,
      /what does a.*foreign endpoint.*mean/i,
      /how do i fix a compliance violation/i,
      /can i share my dashboard/i,
      /what happens when my shield trial ends/i,
      /how do i contact support/i,
    ];

    for (const faq of faqs) {
      await expect(page.getByText(faq).first()).toBeVisible();
    }
  });

  test('renders contact information', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText(/compliance@kairologic\.net/i)).toBeVisible();
    await expect(main.getByText(/\(512\) 402-2237/)).toBeVisible();
  });

  test('has back to dashboard link', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /back to dashboard/i })
    ).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Guide');
  });
});
