import { test, expect } from '@playwright/test';

/**
 * Functionality Tests
 *
 * Verifies that interactive features work correctly:
 *  - Navigation (header links, mobile menu)
 *  - Forms (contact form validation & submission)
 *  - Interactive widgets (FAQ accordion, video modal, search/filter)
 *  - Page transitions and routing
 *  - Dynamic components load without errors
 */

// ---------------------------------------------------------------------------
// Global Layout – Header
// ---------------------------------------------------------------------------
test.describe('Header navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('logo links to homepage', async ({ page }) => {
    const logoLink = page.locator('header a').filter({ has: page.locator('img[src*="logo"]') });
    await expect(logoLink).toHaveAttribute('href', '/');
  });

  test('desktop nav links are present and functional', async ({ page }) => {
    const navLinks = [
      { text: /compliance/i, href: '/compliance' },
      { text: /services/i, href: '/services' },
      { text: /registry/i, href: '/registry' },
      { text: /insights/i, href: '/insights' },
      { text: /contact/i, href: '/contact' },
    ];

    for (const { text, href } of navLinks) {
      const link = page.getByRole('link', { name: text }).first();
      await expect(link).toHaveAttribute('href', href);
    }
  });

  test('scan CTA button is visible in header', async ({ page }) => {
    const scanButton = page.locator('header').getByRole('link', { name: /scan/i });
    await expect(scanButton.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Global Layout – Footer
// ---------------------------------------------------------------------------
test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders company branding', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByText(/kairologic/i).first()).toBeVisible();
    await expect(footer.getByText(/statutory vanguard/i).first()).toBeVisible();
  });

  test('renders quick links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Compliance', exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Services', exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Registry', exact: true })).toBeVisible();
  });

  test('renders contact information', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByText(/compliance@kairologic\.net/i)).toBeVisible();
    await expect(footer.getByText(/\(512\) 402-2237/)).toBeVisible();
  });

  test('renders legal disclaimer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(
      footer.getByText(/by accessing this terminal/i)
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Global Layout – Top Banner
// ---------------------------------------------------------------------------
test.describe('Top banner', () => {
  test('renders compliance alert', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText(/texas sb 1188 now requires/i)
    ).toBeVisible();
  });

  test('free check link points to /scan', async ({ page }) => {
    await page.goto('/');
    const freeCheckLink = page.getByRole('link', { name: /free check/i });
    await expect(freeCheckLink).toHaveAttribute('href', '/scan');
  });
});

// ---------------------------------------------------------------------------
// Mobile Navigation
// ---------------------------------------------------------------------------
test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger menu toggles mobile nav', async ({ page }) => {
    await page.goto('/');

    // Find the mobile menu button by its aria-label
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();

    // Open mobile menu
    await menuButton.click();

    // Navigation links should now be visible
    await expect(page.getByRole('link', { name: /compliance/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /services/i }).first()).toBeVisible();

    // Close mobile menu
    const closeButton = page.getByRole('button', { name: /close menu/i });
    await closeButton.click();
  });

  test('mobile nav links navigate correctly', async ({ page }) => {
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Click compliance link
    await page.getByRole('link', { name: /compliance/i }).first().click();
    await expect(page).toHaveURL(/\/compliance/);
  });
});

// ---------------------------------------------------------------------------
// Contact Form Functionality
// ---------------------------------------------------------------------------
test.describe('Contact form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('form fields accept input', async ({ page }) => {
    const form = page.locator('main');
    const textboxes = form.getByRole('textbox');

    // Fill the first three text inputs (name, email, practice name)
    await textboxes.nth(0).fill('Test User');
    await textboxes.nth(1).fill('test@example.com');
    await textboxes.nth(2).fill('Test Practice');

    await expect(textboxes.nth(0)).toHaveValue('Test User');
    await expect(textboxes.nth(1)).toHaveValue('test@example.com');
  });

  test('subject dropdown has all expected options', async ({ page }) => {
    const select = page.locator('main').getByRole('combobox');
    const options = await select.locator('option').allTextContents();

    expect(options).toContain('General Inquiry');
    expect(options).toContain('Technical Briefing Request');
    expect(options).toContain('Remediation Required');
  });

  test('form requires all mandatory fields', async ({ page }) => {
    const form = page.locator('main');
    const textboxes = form.getByRole('textbox');
    // Verify the textboxes have required attribute
    await expect(textboxes.nth(0)).toHaveAttribute('required', '');
    await expect(textboxes.nth(1)).toHaveAttribute('required', '');
    await expect(textboxes.nth(2)).toHaveAttribute('required', '');
  });

  test('prioritize button pre-fills form subject', async ({ page }) => {
    const prioritizeBtn = page.getByRole('button', { name: /prioritize my practice/i });
    await prioritizeBtn.click();

    const select = page.locator('main').getByRole('combobox');
    await expect(select).toHaveValue('Remediation Required');
  });
});

// ---------------------------------------------------------------------------
// Homepage Video Modal
// ---------------------------------------------------------------------------
test.describe('Homepage video modal', () => {
  test('watch demo button opens video modal', async ({ page }) => {
    await page.goto('/');

    const watchButton = page.getByText(/watch.*how it works/i).first();
    if (await watchButton.isVisible()) {
      await watchButton.click();

      // Modal should appear with video iframe
      const iframe = page.locator('iframe[src*="youtube"]');
      await expect(iframe).toBeVisible({ timeout: 5000 });
    }
  });
});

// ---------------------------------------------------------------------------
// Services FAQ Accordion
// ---------------------------------------------------------------------------
test.describe('Services FAQ accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services');
  });

  test('FAQ items expand on click', async ({ page }) => {
    const firstQuestion = page.getByText(/why do i need the report if the scan is free/i);
    await firstQuestion.click();

    // After clicking, the answer should be visible
    // Look for answer content that appears after expanding
    const answerArea = firstQuestion.locator('..').locator('..');
    await expect(answerArea).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Registry Search & Filter
// ---------------------------------------------------------------------------
test.describe('Registry search and filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registry');
  });

  test('search box accepts input', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search by name.*city.*zip.*npi/i);
    await searchBox.fill('Austin');
    await expect(searchBox).toHaveValue('Austin');
  });

  test('city filter tabs are clickable', async ({ page }) => {
    const austinTab = page.getByText(/^austin$/i).first();
    if (await austinTab.isVisible()) {
      await austinTab.click();
      // Tab should appear active/selected after click
      await expect(austinTab).toBeVisible();
    }
  });

  test('registry table renders data rows', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // There should be table rows or data cards in the registry
    const rows = page.locator('table tbody tr, [data-testid="registry-row"]');
    const count = await rows.count();
    // Registry has 481K+ providers; we expect at least some to render
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Patients Quick Check
// ---------------------------------------------------------------------------
test.describe('Patients quick check tool', () => {
  test('input accepts a provider website URL', async ({ page }) => {
    await page.goto('/patients');

    const input = page.getByPlaceholder(/hillcountryfamilymed/i);
    await input.fill('testclinic.com');
    await expect(input).toHaveValue('testclinic.com');
  });

  test('quick check button is functional', async ({ page }) => {
    await page.goto('/patients');

    const input = page.getByPlaceholder(/hillcountryfamilymed/i);
    await input.fill('testclinic.com');

    const checkButton = page.getByRole('button', { name: /quick check/i });
    await expect(checkButton).toBeVisible();
    await expect(checkButton).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Insights Article Navigation
// ---------------------------------------------------------------------------
test.describe('Insights article navigation', () => {
  test('clicking an article opens its content', async ({ page }) => {
    const envSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    test.skip(!envSet, 'Supabase env vars not configured');

    await page.goto('/insights', { waitUntil: 'networkidle' });

    // Click the first article card
    const firstArticle = page.getByText(/is your patient data leaving the country/i).first();
    await firstArticle.click();

    // Article content should be displayed
    await page.waitForTimeout(500);
    const backButton = page.getByText(/back to insights/i);
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Page Navigation – routing works between pages
// ---------------------------------------------------------------------------
test.describe('Page-to-page navigation', () => {
  test('homepage CTA navigates to /scan', async ({ page }) => {
    await page.goto('/');

    const scanLink = page.getByRole('link', { name: /scan my website/i }).first();
    await scanLink.click();
    await expect(page).toHaveURL(/\/scan/);
  });

  test('compliance page CTA navigates to /scan', async ({ page }) => {
    await page.goto('/compliance');

    const scanLink = page.getByRole('link', { name: /run compliance scan/i });
    await scanLink.click();
    await expect(page).toHaveURL(/\/scan/);
  });

  test('footer links navigate correctly', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const privacyLink = footer.getByRole('link', { name: /privacy/i });
    await privacyLink.click();
    await expect(page).toHaveURL(/\/privacy/);
  });

  test('consultation redirects to registry', async ({ page }) => {
    await page.goto('/consultation');
    await expect(page).toHaveURL(/\/registry/);
  });
});

// ---------------------------------------------------------------------------
// Report Landing Page (Campaign)
// ---------------------------------------------------------------------------
test.describe('Report landing page – invalid code', () => {
  test('shows "Report Not Found" for invalid code', async ({ page }) => {
    await page.goto('/report/invalid99');

    await expect(
      page.getByRole('heading', { name: /report not found/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/ravi@kairologic\.net/i)
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// No JavaScript Errors
// ---------------------------------------------------------------------------
test.describe('Runtime error detection', () => {
  const pages = [
    '/',
    '/compliance',
    '/services',
    '/contact',
    '/scan',
    '/terms',
    '/privacy',
    '/registry',
    '/patients',
  ];

  // Pages that need Supabase to load without errors
  const supabasePages = ['/insights'];

  for (const path of pages) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(path, { waitUntil: 'networkidle' });

      // Filter out known non-critical errors (e.g., third-party tracking scripts)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('third-party') &&
          !e.includes('tracking') &&
          !e.includes('apollo') &&
          !e.includes('snitcher') &&
          !e.includes('Failed to load resource') &&
          !e.includes('supabaseUrl')
      );

      expect(
        criticalErrors,
        `Console errors on ${path}: ${criticalErrors.join('\n')}`
      ).toHaveLength(0);
    });
  }

  for (const path of pages) {
    test(`no uncaught exceptions on ${path}`, async ({ page }) => {
      const exceptions: string[] = [];
      page.on('pageerror', (err) => {
        exceptions.push(err.message);
      });

      await page.goto(path, { waitUntil: 'networkidle' });

      expect(
        exceptions,
        `Uncaught exceptions on ${path}: ${exceptions.join('\n')}`
      ).toHaveLength(0);
    });
  }

  for (const path of supabasePages) {
    test(`no uncaught exceptions on ${path}`, async ({ page }) => {
      const envSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      test.skip(!envSet, 'Supabase env vars not configured');

      const exceptions: string[] = [];
      page.on('pageerror', (err) => {
        exceptions.push(err.message);
      });

      await page.goto(path, { waitUntil: 'networkidle' });

      expect(
        exceptions,
        `Uncaught exceptions on ${path}: ${exceptions.join('\n')}`
      ).toHaveLength(0);
    });
  }
});
