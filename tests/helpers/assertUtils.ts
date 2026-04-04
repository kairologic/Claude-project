/**
 * Assertion utilities for KairoLogic deep QA tests.
 * Shared page health checks, element validators, and error detectors.
 */

import { type Page, type Locator, expect } from '@playwright/test';

// ── Page Health ─────────────────────────────────────────────────────

/** Assert the page loaded without a crash — body visible, no error page. */
export async function assertPageHealthy(page: Page) {
  await expect(page.locator('body')).toBeVisible();
  // Check we didn't land on a Next.js error overlay or custom error page
  const errorOverlay = page.locator('#__next-build-error, [data-nextjs-dialog]');
  await expect(errorOverlay).toHaveCount(0);
}

/** Assert the page has a visible heading (h1 or h2). */
export async function assertHasHeading(page: Page) {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 8_000 });
}

/** Assert no console errors during page load (call after navigation). */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Assert no uncaught exceptions. Attach before navigation. */
export function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── HTTP & Network ──────────────────────────────────────────────────

/** Assert that no network requests returned 5xx during page load. */
export async function assertNoServerErrors(page: Page): Promise<void> {
  const failures: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 500) {
      failures.push(`${res.status()} ${res.url()}`);
    }
  });
  // Wait for network to settle
  await page.waitForLoadState('networkidle').catch(() => {});
  expect(failures, 'Server errors detected during page load').toHaveLength(0);
}

/** Assert a specific API response status. */
export async function assertApiStatus(
  page: Page,
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  expectedStatus: number,
  body?: Record<string, unknown>,
) {
  const options: Parameters<typeof page.request.fetch>[1] = { method };
  if (body) {
    options.data = body;
    options.headers = { 'Content-Type': 'application/json' };
  }
  const res = await page.request.fetch(url, options);
  expect(res.status()).toBe(expectedStatus);
  return res;
}

// ── Element Assertions ──────────────────────────────────────────────

/** Assert an element exists and is visible. */
export async function assertVisible(locator: Locator, label?: string) {
  await expect(locator, label || 'Element should be visible').toBeVisible();
}

/** Assert an element is NOT visible (hidden or absent). */
export async function assertHidden(locator: Locator, label?: string) {
  await expect(locator, label || 'Element should not be visible').not.toBeVisible();
}

/** Assert a form input has a validation error after submit attempt. */
export async function assertFieldInvalid(page: Page, selector: string) {
  const field = page.locator(selector);
  const isInvalid = await field.evaluate((el) => {
    const input = el as HTMLInputElement;
    return !input.validity.valid;
  });
  expect(isInvalid, `Field ${selector} should be invalid`).toBe(true);
}

/** Assert page title matches pattern. */
export async function assertTitle(page: Page, pattern: RegExp) {
  await expect(page).toHaveTitle(pattern);
}

// ── Form Helpers ────────────────────────────────────────────────────

/** Fill a form field by label text. */
export async function fillByLabel(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: false });
  await field.fill(value);
}

/** Submit a form and wait for navigation or response. */
export async function submitForm(page: Page, buttonText?: string | RegExp) {
  const btn = buttonText
    ? page.getByRole('button', { name: buttonText })
    : page.locator('button[type="submit"]');
  await btn.click();
}

// ── Accessibility Helpers ───────────────────────────────────────────

/** Assert all images on page have alt text. */
export async function assertImagesHaveAlt(page: Page) {
  const imagesWithoutAlt = await page.$$eval(
    'img:not([alt]), img[alt=""]',
    (imgs) => imgs.map((img) => img.getAttribute('src') || 'unknown'),
  );
  expect(
    imagesWithoutAlt,
    `Images without alt text: ${imagesWithoutAlt.join(', ')}`,
  ).toHaveLength(0);
}

/** Assert no duplicate IDs on the page. */
export async function assertNoDuplicateIds(page: Page) {
  const dupes = await page.$$eval('[id]', (elements) => {
    const ids = elements.map((el) => el.id).filter(Boolean);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    return duplicates;
  });
  expect(dupes, `Duplicate IDs found: ${dupes.join(', ')}`).toHaveLength(0);
}
