/**
 * UC-AUTH API Tests
 * Tests for authentication and team management workflows
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import { TEST_USER, API } from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-AUTH-01: Magic link authentication', () => {
  test('UC-AUTH-01: POST /api/auth/magic-link with valid email → 200', async ({ request }) => {
    const response = await request.post(`${BASE}${API.magicLink}`, {
      data: {
        email: TEST_USER.email,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);
  });

  test('UC-AUTH-01 regression: POST /api/auth/magic-link with invalid email → error (not crash)', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.magicLink}`, {
      data: {
        email: 'not-an-email-format',
      },
    });

    // Should return error response, not crash (5xx)
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('UC-AUTH-02: PIN verification rate limiting', () => {
  test('UC-AUTH-02: POST /api/auth/verify-pin with wrong PIN 5x → rate limited', async ({
    request,
  }) => {
    // Attempt to verify with wrong PIN multiple times
    const wrongPin = '000000';
    let lastResponse = null;

    for (let i = 0; i < 5; i++) {
      lastResponse = await request.post(`${BASE}${API.verifyPin}`, {
        data: {
          email: TEST_USER.email,
          pin: wrongPin,
        },
      });
    }

    // After 5 failed attempts, should be rate limited (429 or error)
    expect(lastResponse!.status()).toBeGreaterThanOrEqual(429);
    const body = await lastResponse!.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('UC-AUTH-04: Expired session token', () => {
  test('UC-AUTH-04: Expired session token → 401', async ({ request }) => {
    // Use an obviously expired/invalid token
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const response = await request.get(`${BASE}${API.workflowDetail('any-id')}`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('UC-AUTH-05: Team member invitation', () => {
  test('UC-AUTH-05: POST /api/settings/team/invite → 200 with valid body', async ({ request }) => {
    const response = await request.post(`${BASE}${API.teamInvite}`, {
      data: {
        email: 'newteammember@example.com',
        role: 'viewer',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);
  });
});
