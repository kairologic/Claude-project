import { test, expect } from '@playwright/test';
import { collectAllLinks, getUniqueInternalLinks, findBadHrefs } from '../helpers/linkUtils';
import { assertPageHealthy, assertHasHeading } from '../helpers/assertUtils';

/**
 * Navigation Tests — All Routes and Links
 *
 * Validates:
 *  1. Every public page's internal links resolve (no 404s)
 *  2. No empty, javascript:, or malformed hrefs
 *  3. Header and footer navigation are consistent across pages
 *  4. Page-to-page navigation maintains layout integrity
 *  5. Back/forward browser navigation works
 *  6. Deep-linked URLs load correctly
 *
 * Non-negotiable: every clickable link asserts a result.
 */

// ── Route Definitions ───────────────────────────────────────────────

const MARKETING_PAGES = [
  '/',
  '/compliance',
  '/platform',
  '/pricing',
  '/solutions',
  '/contact',
  '/about',
  '/resources',
  '/support',
  '/terms',
  '/privacy',
  '/blog',
  '/roi',
];

const SITE_PAGES = [
  '/scan',
  '/registry',
  '/patients',
  '/services',
  '/insights',
];

const ALL_PUBLIC = [...MARKETING_PAGES, ...SITE_PAGES];

// Pages that may need Supabase env vars
const ENV_DEPENDENT = new Set(['/insights', '/dashboard']);
const envReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// ── Internal Link Integrity ─────────────────────────────────────────

test.describe('Internal link integrity', () => {
  const visited = new Set<string>();

  for (const pagePath of ALL_PUBLIC) {
    test(`all links on ${pagePath} resolve to non-error status`, async ({ page, baseURL }) => {
      if (!envReady && ENV_DEPENDENT.has(pagePath)) {
        test.skip();
        return;
      }

      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
      const links = await collectAllLinks(page);
      const internal = getUniqueInternalLinks(links).filter((l) => !visited.has(l));

      for (const href of internal) {
        visited.add(href);

        // Skip auth-protected paths (will redirect, not 404)
        if (href.startsWith('/practice/') || href.startsWith('/admin/')) continue;
        // Skip env-dependent pages
        if (!envReady && ENV_DEPENDENT.has(href)) continue;

        const response = await page.request.get(`${baseURL}${href}`);
        expect
          .soft(response.status(), `Broken: ${href} (on ${pagePath})`)
          .toBeLessThan(400);
      }
    });
  }
});

// ── No Bad Hrefs ────────────────────────────────────────────────────

test.describe('Anchor href validation', () => {
  for (const pagePath of ALL_PUBLIC) {
    test(`no empty or javascript: hrefs on ${pagePath}`, async ({ page }) => {
      if (!envReady && ENV_DEPENDENT.has(pagePath)) {
        test.skip();
        return;
      }

      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
      const bad = await findBadHrefs(page);

      expect
        .soft(bad, `Bad hrefs on ${pagePath}: ${JSON.stringify(bad)}`)
        .toHaveLength(0);
    });
  }
});

// ── Header Navigation Consistency ───────────────────────────────────

test.describe('Header navigation consistency', () => {
  const EXPECTED_NAV_LINKS = [
    { text: /compliance/i, href: '/compliance' },
    { text: /platform/i, href: '/platform' },
    { text: /pricing/i, href: '/pricing' },
    { text: /solutions/i, href: '/solutions' },
  ];

  for (const pagePath of ['/', '/compliance', '/pricing', '/contact']) {
    test(`header nav links present on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      const header = page.locator('header');

      for (const expected of EXPECTED_NAV_LINKS) {
        const link = header.getByRole('link', { name: expected.text }).first();
        // Use soft assertions — some pages might use a different nav
        if (await link.isVisible().catch(() => false)) {
          await expect.soft(link).toHaveAttribute('href', expected.href);
        }
      }
    });
  }
});

// ── Footer Link Consistency ─────────────────────────────────────────

test.describe('Footer link consistency', () => {
  test('footer links are consistent across pages', async ({ page }) => {
    const footerLinks: Record<string, string[]> = {};

    for (const pagePath of ['/', '/compliance', '/pricing']) {
      await page.goto(pagePath);
      const footer = page.locator('footer');
      const links = await footer.locator('a[href]').all();
      footerLinks[pagePath] = [];

      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href) footerLinks[pagePath].push(href);
      }
    }

    // Footer links should be the same set on every page
    const baseline = footerLinks['/'].sort();
    for (const [path, links] of Object.entries(footerLinks)) {
      if (path === '/') continue;
      expect(
        links.sort(),
        `Footer links on ${path} differ from homepage`,
      ).toEqual(baseline);
    }
  });
});

// ── Page-to-Page Navigation ─────────────────────────────────────────

test.describe('Page-to-page navigation', () => {
  test('navigating homepage -> compliance -> pricing preserves layout', async ({ page }) => {
    await page.goto('/');
    await assertPageHealthy(page);
    const headerVisible1 = await page.locator('header').isVisible();
    expect(headerVisible1).toBe(true);

    // Navigate to compliance
    await page.click('a[href="/compliance"]');
    await page.waitForURL('**/compliance');
    await assertPageHealthy(page);
    await assertHasHeading(page);
    expect(await page.locator('header').isVisible()).toBe(true);
    expect(await page.locator('footer').isVisible()).toBe(true);

    // Navigate to pricing
    const pricingLink = page.locator('a[href="/pricing"]').first();
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await page.waitForURL('**/pricing');
      await assertPageHealthy(page);
      expect(await page.locator('header').isVisible()).toBe(true);
    }
  });

  test('browser back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/compliance"]');
    await page.waitForURL('**/compliance');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await assertPageHealthy(page);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/compliance/);
    await assertPageHealthy(page);
  });
});

// ── Deep Link Loading ───────────────────────────────────────────────

test.describe('Deep link loading', () => {
  const DEEP_LINKS = [
    '/compliance',
    '/pricing',
    '/blog',
    '/terms',
    '/privacy',
    '/scan',
    '/registry',
  ];

  for (const path of DEEP_LINKS) {
    test(`direct navigation to ${path} loads correctly`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await assertPageHealthy(page);
      await assertHasHeading(page);
    });
  }
});

// ── 404 Handling ────────────────────────────────────────────────────

test.describe('404 error handling', () => {
  test('non-existent route returns 404 or error page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    // Next.js returns 404 for unknown routes
    const status = response?.status() || 0;
    expect([404, 200]).toContain(status); // 200 if custom 404 page

    // Should still render something (not blank)
    await expect(page.locator('body')).toBeVisible();
  });

  test('non-existent API route returns 404', async ({ page }) => {
    const response = await page.request.get('/api/this-does-not-exist');
    expect(response.status()).toBe(404);
  });
});
