import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Captures full-page screenshots and compares them against stored baselines.
 * Any design change (layout shift, color change, missing element, font swap)
 * will cause a pixel-diff failure.
 *
 * First run generates baseline screenshots in e2e/__screenshots__.
 * Subsequent runs compare against the baseline with a 0.2% tolerance.
 *
 * Usage:
 *   npx playwright test visual-regression --update-snapshots   # generate baselines
 *   npx playwright test visual-regression                      # compare
 */

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'compliance', path: '/compliance' },
  { name: 'services', path: '/services' },
  { name: 'contact', path: '/contact' },
  { name: 'scan', path: '/scan' },
  { name: 'terms', path: '/terms' },
  { name: 'privacy', path: '/privacy' },
  { name: 'registry', path: '/registry' },
  { name: 'patients', path: '/patients' },
  { name: 'insights', path: '/insights' },
];

for (const { name, path } of PAGES) {
  test.describe(`Visual regression – ${name}`, () => {
    test(`${name} matches baseline screenshot`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });

      // Wait for fonts and images to finish loading
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.002,
      });
    });

    test(`${name} above-the-fold matches baseline`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${name}-fold.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.002,
      });
    });
  });
}
