/**
 * Auth helper for Playwright tests.
 * Handles login and session management.
 */

import { type Page, expect } from '@playwright/test';
import { TEST_USER, URLS, TEST_PRACTICE } from './test-data';

export async function loginAsTestUser(page: Page) {
  await page.goto(URLS.signIn);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL(`**/practice/**`, { timeout: 15000 });
}

export async function ensureAuthenticated(page: Page) {
  // Check if already on a practice page
  if (page.url().includes('/practice/')) return;
  await loginAsTestUser(page);
}

export async function navigateToDashboard(page: Page, practiceId = TEST_PRACTICE.id) {
  await ensureAuthenticated(page);
  await page.goto(URLS.dashboard(practiceId));
  await page.waitForLoadState('networkidle');
}
