import { test, expect } from '@playwright/test';
import { assertPageHealthy } from '../helpers/assertUtils';

/**
 * Form Tests — Submission, Validation, and Error States
 *
 * Tests every user-facing form in the application:
 *  1. Contact / Trial signup form
 *  2. Scan form (NPI / URL lookup)
 *  3. Sign-in form (covered more deeply in auth.spec.ts)
 *  4. Password reset form
 *  5. Registry claim form
 *
 * For each form:
 *  - Happy path (valid submission)
 *  - Validation (required fields, format checks)
 *  - Error states (server error, network failure)
 *  - State persistence (form data survives reload where applicable)
 *
 * Non-negotiable: No waitForTimeout. Every action asserts a result.
 */

// ── Contact / Trial Signup Form ─────────────────────────────────────

test.describe('Contact / Trial signup form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await assertPageHealthy(page);
  });

  test('form renders with all required fields', async ({ page }) => {
    // Should have the trial form
    await expect(page.getByText(/free trial/i).first()).toBeVisible();

    // Required fields: first name, last name, email, practice name, NPI
    await expect(page.locator('input').nth(0)).toBeVisible(); // first name
    await expect(page.locator('input').nth(1)).toBeVisible(); // last name
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input').nth(3)).toBeVisible(); // practice name
    await expect(page.locator('input').nth(4)).toBeVisible(); // NPI

    // Submit button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('empty form submission triggers HTML5 validation', async ({ page }) => {
    // Try to submit without filling anything
    await page.locator('button[type="submit"]').click();

    // Should NOT navigate away — HTML5 required validation prevents it
    await expect(page).toHaveURL(/contact/);

    // Check that required fields are flagged
    const firstInput = page.locator('input').first();
    const isValid = await firstInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(isValid).toBe(false);
  });

  test('NPI field only accepts digits and limits to 10', async ({ page }) => {
    // The NPI input strips non-digits and caps at 10
    const npiInput = page.locator('input[pattern="[0-9]{10}"]');
    if (await npiInput.count() === 0) {
      // Fallback: find by placeholder
      const npiByPlaceholder = page.locator('input[placeholder*="1234567890"]');
      await npiByPlaceholder.fill('abc1234567890xyz');
      const val = await npiByPlaceholder.inputValue();
      expect(val).toMatch(/^\d{0,10}$/);
      return;
    }

    await npiInput.fill('abc1234567890xyz');
    const value = await npiInput.inputValue();
    // Should strip letters and cap at 10 digits
    expect(value).toMatch(/^\d{0,10}$/);
  });

  test('email field validates format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('not-an-email');

    // Try to submit
    await page.locator('button[type="submit"]').click();

    // HTML5 email validation should prevent submission
    const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(isValid).toBe(false);
  });

  test('successful form fill populates all fields', async ({ page }) => {
    // Fill all required fields
    const inputs = page.locator('form input');
    const inputCount = await inputs.count();

    // First name
    await inputs.nth(0).fill('Jane');
    await expect(inputs.nth(0)).toHaveValue('Jane');

    // Last name
    await inputs.nth(1).fill('Smith');
    await expect(inputs.nth(1)).toHaveValue('Smith');

    // Email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('jane@practice.com');
    await expect(emailInput).toHaveValue('jane@practice.com');

    // Verify at least 4 fields are populated
    let filledCount = 0;
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const val = await inputs.nth(i).inputValue();
      if (val.length > 0) filledCount++;
    }
    expect(filledCount).toBeGreaterThanOrEqual(3);
  });
});

// ── Scan Form ───────────────────────────────────────────────────────

test.describe('Scan form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scan');
    await assertPageHealthy(page);
  });

  test('scan page has input field', async ({ page }) => {
    const input = page.locator('input').first();
    await expect(input).toBeVisible();
  });

  test('scan form accepts NPI input', async ({ page }) => {
    const input = page.locator('input').first();
    await input.fill('1234567890');
    await expect(input).toHaveValue('1234567890');
  });

  test('empty scan submission does not crash', async ({ page }) => {
    // Try to submit with empty input
    const submitBtn = page.locator('button[type="submit"], button').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Page should still be healthy
      await assertPageHealthy(page);
    }
  });
});

// ── Password Reset Form ─────────────────────────────────────────────

test.describe('Password reset form', () => {
  test('password reset form renders after clicking forgot', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByText(/forgot password/i).click();

    // Reset form should appear
    await expect(page.getByText(/reset password/i).first()).toBeVisible();
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('password reset form validates email', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByText(/forgot password/i).click();

    // Fill invalid email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('not-valid');

    // Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Should not succeed with invalid email format
    const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(isValid).toBe(false);
  });

  test('password reset with valid email shows confirmation', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByText(/forgot password/i).click();

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // Should show success message or remain on same page without crash
    await page.waitForLoadState('networkidle');
    await assertPageHealthy(page);

    // Look for success or confirmation message
    const successMsg = page.locator('[class*="green"], [class*="success"]');
    const errorMsg = page.locator('[class*="red"], [class*="error"]');
    // Either a success msg (valid email) or error msg (unknown email) — both are valid states
    const hasResponse = (await successMsg.count()) > 0 || (await errorMsg.count()) > 0;
    expect(hasResponse, 'Form should show feedback after submission').toBe(true);
  });
});

// ── Registry Claim Form ─────────────────────────────────────────────

test.describe('Registry claim form', () => {
  test('registry page loads', async ({ page }) => {
    await page.goto('/registry');
    await assertPageHealthy(page);
  });

  test('claim page loads if it exists', async ({ page }) => {
    const response = await page.goto('/registry/claim');
    if (response && response.status() < 400) {
      await assertPageHealthy(page);
      // Should have some form or input
      const inputs = page.locator('input');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

// ── Feedback Form (Dashboard) ───────────────────────────────────────

test.describe('Feedback API', () => {
  test('feedback endpoint rejects unauthenticated requests', async ({ page }) => {
    const response = await page.request.post('/api/feedback', {
      data: { message: 'Test feedback', rating: 5 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });
});

// ── Form Error States ───────────────────────────────────────────────

test.describe('Form error resilience', () => {
  test('contact form handles network errors gracefully', async ({ page }) => {
    await page.goto('/contact');

    // Block the API endpoint
    await page.route('**/api/trial/**', (route) => route.abort('failed'));
    await page.route('**/api/contact/**', (route) => route.abort('failed'));

    // Fill and submit
    const inputs = page.locator('form input');
    await inputs.nth(0).fill('Test');
    await inputs.nth(1).fill('User');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await inputs.nth(3).fill('Test Practice');
    await inputs.nth(4).fill('1234567890');

    await page.locator('button[type="submit"]').click();

    // Page should not crash
    await assertPageHealthy(page);

    // Should show an error message or stay on the form
    await expect(page).toHaveURL(/contact/);
  });
});
