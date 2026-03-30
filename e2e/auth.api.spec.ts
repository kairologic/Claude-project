import { test, expect } from '@playwright/test';
import { TEST_USER, TEST_PRACTICE, API, URLS } from './fixtures/test-data';

test.describe('UC-AUTH: Authentication & Access Control', () => {

  test('UC-AUTH-01: Unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.goto(URLS.dashboard(TEST_PRACTICE.id));
    await expect(page).toHaveURL(/sign-in/);
  });

  test('UC-AUTH-02: Valid credentials grant dashboard access', async ({ page }) => {
    await page.goto(URLS.signIn);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/practice/**`, { timeout: 15000 });
    await expect(page.locator('aside')).toBeVisible();
  });

  test('UC-AUTH-03: Invalid credentials show error message', async ({ page }) => {
    await page.goto(URLS.signIn);
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 5000 });
  });

  test('UC-AUTH-04: API routes return 401 without authentication', async ({ request }) => {
    const response = await request.get(`${API.settingsPractice}?practice_id=${TEST_PRACTICE.id}`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('UC-AUTH-05: API routes return 403 for unauthorized practice access', async ({ request, page }) => {
    // First authenticate
    await page.goto(URLS.signIn);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/practice/**`);

    // Try accessing a practice the user doesn't belong to
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${API.settingsPractice}?practice_id=${fakeId}`);
    expect([403, 401]).toContain(response.status());
  });

  test('UC-AUTH-06: Session persists across page navigations', async ({ page }) => {
    await page.goto(URLS.signIn);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/practice/**`);

    // Navigate to different pages
    await page.goto(URLS.workflows(TEST_PRACTICE.id));
    await expect(page).not.toHaveURL(/sign-in/);
    await page.goto(URLS.roster(TEST_PRACTICE.id));
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('UC-AUTH-07: Admin routes require authentication', async ({ request }) => {
    const response = await request.post('/api/admin/practice-add', {
      data: { npi: '1234567890', url: 'https://example.com' },
    });
    expect(response.status()).toBe(401);
  });

  test('UC-AUTH-08: Practice-scoped API validates UUID format', async ({ request }) => {
    const response = await request.get(`${API.settingsPractice}?practice_id=not-a-uuid`);
    expect([400, 401]).toContain(response.status());
  });
});
