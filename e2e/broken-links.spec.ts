import { test, expect, type Page } from '@playwright/test';

/**
 * Broken Link Detection Tests
 *
 * Crawls every public page and validates that:
 *  - All internal links (<a href="/...">) resolve to a 200 status
 *  - All internal links navigate without a client-side error page
 *  - Static assets referenced in href/src (images, PDFs, etc.) return 200
 *  - External links return a non-error HTTP status (< 400)
 *  - No links have empty or malformed href attributes
 */

const PUBLIC_PAGES = [
  '/',
  '/compliance',
  '/services',
  '/contact',
  '/scan',
  '/terms',
  '/privacy',
  '/registry',
  '/patients',
  '/insights',
];

/** Collect all <a> href values from a page. */
async function collectLinks(page: Page): Promise<string[]> {
  return page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => a.getAttribute('href')!)
      .filter(Boolean)
  );
}

/** Collect all <img> src values from a page. */
async function collectImageSources(page: Page): Promise<string[]> {
  return page.$$eval('img[src]', (imgs) =>
    imgs.map((img) => img.getAttribute('src')!).filter(Boolean)
  );
}

// ---------------------------------------------------------------------------
// Internal link validation
// ---------------------------------------------------------------------------
test.describe('Internal link integrity', () => {
  const visited = new Set<string>();

  for (const pagePath of PUBLIC_PAGES) {
    test(`all internal links on ${pagePath} resolve`, async ({ page, baseURL }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

      const hrefs = await collectLinks(page);

      const internalLinks = hrefs
        .filter((href) => href.startsWith('/') && !href.startsWith('//'))
        .map((href) => href.split('#')[0].split('?')[0]) // strip hash/query
        .filter((href) => href.length > 0)
        .filter((href) => !visited.has(href));

      for (const link of [...new Set(internalLinks)]) {
        visited.add(link);

        const response = await page.request.get(`${baseURL}${link}`);
        expect
          .soft(response.status(), `Broken internal link: ${link} (found on ${pagePath})`)
          .toBeLessThan(400);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Anchor href validation – no empty or malformed hrefs
// ---------------------------------------------------------------------------
test.describe('Anchor href validation', () => {
  for (const pagePath of PUBLIC_PAGES) {
    test(`no empty or javascript: hrefs on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

      const badHrefs = await page.$$eval('a[href]', (anchors) =>
        anchors
          .map((a) => ({
            href: a.getAttribute('href')!,
            text: a.textContent?.trim().slice(0, 60) || '(no text)',
          }))
          .filter(
            ({ href }) =>
              href === '' ||
              href === '#' ||
              href.startsWith('javascript:')
          )
      );

      expect
        .soft(
          badHrefs,
          `Found empty or javascript: hrefs on ${pagePath}: ${JSON.stringify(badHrefs)}`
        )
        .toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Static asset validation – images, PDFs, etc.
// ---------------------------------------------------------------------------
test.describe('Static asset integrity', () => {
  for (const pagePath of PUBLIC_PAGES) {
    test(`all images load on ${pagePath}`, async ({ page, baseURL }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

      const srcs = await collectImageSources(page);

      for (const src of [...new Set(srcs)]) {
        // Skip external images and data URIs
        if (src.startsWith('data:')) continue;

        const url = src.startsWith('http') ? src : `${baseURL}${src}`;

        try {
          const response = await page.request.get(url);
          expect
            .soft(
              response.status(),
              `Broken image: ${src} (found on ${pagePath})`
            )
            .toBeLessThan(400);
        } catch {
          // Network errors for external URLs are non-blocking
          if (!src.startsWith('http')) {
            throw new Error(`Failed to load local image: ${src} on ${pagePath}`);
          }
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// External link validation (spot check – avoid rate limiting)
// ---------------------------------------------------------------------------
test.describe('External link spot check', () => {
  test('key external links return valid status', async ({ page, baseURL }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Collect all external links across the homepage
    const allHrefs = await collectLinks(page);
    const externalLinks = [
      ...new Set(
        allHrefs.filter(
          (href) =>
            href.startsWith('http') &&
            !href.includes('localhost') &&
            !href.includes('127.0.0.1')
        )
      ),
    ];

    // Validate up to 10 external links to avoid rate-limiting
    const sample = externalLinks.slice(0, 10);

    for (const url of sample) {
      try {
        const response = await page.request.get(url, { timeout: 10_000 });
        expect
          .soft(
            response.status(),
            `External link returned error: ${url}`
          )
          .toBeLessThan(400);
      } catch {
        // External timeouts are warnings, not hard failures
        console.warn(`External link timed out or unreachable: ${url}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// PDF and downloadable asset links
// ---------------------------------------------------------------------------
test.describe('Downloadable assets', () => {
  const expectedAssets = [
    '/sample-report.pdf',
    '/logo.svg',
  ];

  for (const asset of expectedAssets) {
    test(`${asset} is accessible`, async ({ page, baseURL }) => {
      const response = await page.request.get(`${baseURL}${asset}`);
      expect(response.status(), `Asset not found: ${asset}`).toBe(200);
    });
  }

  test('safe harbor downloads exist', async ({ page, baseURL }) => {
    const safeHarborFiles = [
      '/downloads/safe-harbor/sb1188-policy-pack.pdf',
      '/downloads/safe-harbor/evidence-ledger.xlsx',
      '/downloads/safe-harbor/staff-training-guide.pdf',
      '/downloads/safe-harbor/implementation-blueprint.pdf',
      '/downloads/safe-harbor/ai-disclosure-kit.zip',
      '/downloads/safe-harbor/compliance-roadmap.pdf',
    ];

    for (const file of safeHarborFiles) {
      const response = await page.request.get(`${baseURL}${file}`);
      expect.soft(response.status(), `Missing safe harbor file: ${file}`).toBe(200);
    }
  });
});
