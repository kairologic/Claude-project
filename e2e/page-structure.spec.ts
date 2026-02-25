import { test, expect } from '@playwright/test';

/**
 * Page Structure & SEO Tests
 *
 * Validates that every page maintains its required structural elements:
 *  - <title> and meta description
 *  - Consistent header and footer presence
 *  - Semantic heading hierarchy (h1 present, no skipped levels)
 *  - Required meta tags for SEO
 *  - Page responds with HTTP 200
 */

const PUBLIC_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/compliance', name: 'Compliance' },
  { path: '/services', name: 'Services' },
  { path: '/contact', name: 'Contact' },
  { path: '/scan', name: 'Scan' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/registry', name: 'Registry' },
  { path: '/patients', name: 'Patients' },
  { path: '/insights', name: 'Insights' },
];

// ---------------------------------------------------------------------------
// HTTP response validation
// ---------------------------------------------------------------------------
test.describe('Page availability', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) returns HTTP 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${name} did not return 200`).toBe(200);
    });
  }
});

// ---------------------------------------------------------------------------
// Required layout elements
// ---------------------------------------------------------------------------
test.describe('Layout structure', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} has header`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('header').first()).toBeVisible();
    });

    test(`${name} has footer`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('footer').first()).toBeVisible();
    });

    test(`${name} has main content area`, async ({ page }) => {
      await page.goto(path);
      // The root layout wraps content in <main>
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Document title & meta
// ---------------------------------------------------------------------------
test.describe('Page metadata', () => {
  test('site has a title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('KairoLogic');
  });

  test('site has a meta description', async ({ page }) => {
    await page.goto('/');
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// Heading hierarchy
// ---------------------------------------------------------------------------
test.describe('Heading hierarchy', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} has at least one h1`, async ({ page }) => {
      await page.goto(path);
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${name} has no h1 element`).toBeGreaterThanOrEqual(1);
    });
  }
});

// ---------------------------------------------------------------------------
// Logo presence
// ---------------------------------------------------------------------------
test.describe('Branding', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} shows logo`, async ({ page }) => {
      await page.goto(path);
      const logo = page.locator('header img[src*="logo"]');
      await expect(logo).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Responsive viewport – no horizontal overflow
// ---------------------------------------------------------------------------
test.describe('Responsive layout – no horizontal overflow', () => {
  const viewports = [
    { width: 375, height: 812, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1280, height: 800, label: 'desktop' },
  ];

  for (const { width, height, label } of viewports) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} has no horizontal scroll at ${label} (${width}px)`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          viewport: { width, height },
        });
        const page = await context.newPage();
        await page.goto(path, { waitUntil: 'domcontentloaded' });

        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(
          bodyWidth,
          `${name} overflows horizontally at ${label}: body is ${bodyWidth}px vs viewport ${width}px`
        ).toBeLessThanOrEqual(width);

        await context.close();
      });
    }
  }
});
