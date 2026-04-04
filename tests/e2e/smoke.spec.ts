import { test, expect } from '@playwright/test';
import { assertPageHealthy, assertHasHeading, collectPageErrors } from '../helpers/assertUtils';

/**
 * Smoke Tests — Critical User Flows
 *
 * These tests verify the most essential paths through the application:
 *  1. Public marketing pages load without errors
 *  2. Auth page renders and accepts input
 *  3. Dashboard redirects unauthenticated users
 *  4. Admin portal loads (if authenticated)
 *  5. No server errors (5xx) on any critical page
 *  6. Key interactive elements are present and clickable
 *
 * Run: npx playwright test --config=tests/playwright.config.ts --project=smoke
 */

// ── Public Marketing Pages ──────────────────────────────────────────

const PUBLIC_ROUTES = [
  { path: '/', name: 'Homepage' },
  { path: '/compliance', name: 'Compliance' },
  { path: '/platform', name: 'Platform' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/solutions', name: 'Solutions' },
  { path: '/contact', name: 'Contact / Trial' },
  { path: '/about', name: 'About' },
  { path: '/resources', name: 'Resources' },
  { path: '/support', name: 'Support' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/blog', name: 'Blog' },
  { path: '/roi', name: 'ROI Calculator' },
];

test.describe('Smoke: Public pages load', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) loads without errors`, async ({ page }) => {
      const pageErrors = collectPageErrors(page);

      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      // Assert HTTP status is not an error
      expect(response?.status(), `${route.path} returned error status`).toBeLessThan(400);

      // Assert page is healthy
      await assertPageHealthy(page);

      // Assert page has a heading
      await assertHasHeading(page);

      // Assert no uncaught JS errors
      expect(pageErrors, `JS errors on ${route.path}`).toHaveLength(0);
    });
  }
});

// ── Auth Flow Smoke ─────────────────────────────────────────────────

test.describe('Smoke: Auth page', () => {
  test('sign-in page renders login form', async ({ page }) => {
    await page.goto('/sign-in');
    await assertPageHealthy(page);

    // Email and password fields exist
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('sign-in form accepts input', async ({ page }) => {
    await page.goto('/sign-in');

    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('TestPass123');

    // Verify values were accepted
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('TestPass123');
  });

  test('sign-in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/sign-in');

    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('WrongPassword');
    await page.locator('button[type="submit"]').click();

    // Should show an error message (not redirect)
    const errorMsg = page.locator('[class*="red"], [class*="error"], [role="alert"]');
    await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });
  });

  test('password reset form toggles', async ({ page }) => {
    await page.goto('/sign-in');

    // Click "Forgot password?"
    const forgotLink = page.getByText(/forgot password/i);
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    // Should show reset form
    await expect(page.getByText(/reset password/i).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ── Dashboard Auth Guard ────────────────────────────────────────────

test.describe('Smoke: Dashboard auth guard', () => {
  test('unauthenticated users are redirected from dashboard', async ({ page }) => {
    // Navigate to a dashboard URL without auth
    await page.goto('/practice/5d195c8b-7f3c-498e-b5cf-24a7c0f8a215');

    // Should redirect to sign-in or show auth prompt
    await page.waitForURL(/sign-in|auth/, { timeout: 10_000 });
    await assertPageHealthy(page);
  });

  test('unauthenticated API calls return 401', async ({ page }) => {
    const response = await page.request.get('/api/settings/practice');
    expect(response.status()).toBe(401);
  });
});

// ── Critical Interactive Elements ───────────────────────────────────

test.describe('Smoke: Key interactive elements', () => {
  test('homepage CTA buttons are visible and clickable', async ({ page }) => {
    await page.goto('/');

    // Should have at least one call-to-action link/button
    const ctas = page.locator('a[href*="contact"], a[href*="scan"], a[href*="trial"]');
    const count = await ctas.count();
    expect(count, 'Homepage should have CTA buttons').toBeGreaterThan(0);

    // First CTA should be clickable
    const firstCta = ctas.first();
    await expect(firstCta).toBeVisible();
    await expect(firstCta).toBeEnabled();
  });

  test('header navigation is present', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Should have nav links
    const navLinks = header.locator('a');
    const count = await navLinks.count();
    expect(count, 'Header should have navigation links').toBeGreaterThan(2);
  });

  test('footer renders with contact info', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/kairologic/i).first()).toBeVisible();
  });
});

// ── 5xx Error Detection ─────────────────────────────────────────────

test.describe('Smoke: No server errors on critical routes', () => {
  const CRITICAL_ROUTES = ['/', '/compliance', '/contact', '/sign-in', '/pricing'];

  for (const route of CRITICAL_ROUTES) {
    test(`${route} returns no 5xx errors`, async ({ page }) => {
      const serverErrors: string[] = [];

      page.on('response', (res) => {
        if (res.status() >= 500 && res.url().includes(route)) {
          serverErrors.push(`${res.status()} ${res.url()}`);
        }
      });

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(serverErrors, `5xx errors on ${route}`).toHaveLength(0);
    });
  }
});

// ── Scan Page ───────────────────────────────────────────────────────

test.describe('Smoke: Scan page', () => {
  test('scan page loads with input form', async ({ page }) => {
    await page.goto('/scan');
    await assertPageHealthy(page);

    // Should have an NPI or URL input
    const input = page.locator('input').first();
    await expect(input).toBeVisible();
  });
});

// ── Registry ────────────────────────────────────────────────────────

test.describe('Smoke: Registry', () => {
  test('registry page loads', async ({ page }) => {
    await page.goto('/registry');
    await assertPageHealthy(page);
    await assertHasHeading(page);
  });
});
