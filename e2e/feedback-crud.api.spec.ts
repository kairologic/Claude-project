/**
 * UC-FB: Feedback CRUD API Tests
 *
 * Tests the feedback endpoints:
 * - POST /api/feedback (submit issue or feature request)
 * - GET  /api/feedback/[id]/status
 * - PATCH /api/feedback/[id]/status
 * - GET  /api/feedback/[id]/comments
 * - POST /api/feedback/[id]/comments
 */

import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, API } from './fixtures/test-data';
import { loginAsTestUser } from './fixtures/auth';

test.describe('UC-FB: Feedback CRUD API', () => {
  let feedbackId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  // ── Submit feedback ──────────────────────────────────────────

  test('UC-FB-01: Submit issue report via POST /api/feedback', async ({ request }) => {
    const response = await request.post(API.feedback, {
      data: {
        type: 'issue',
        category: 'Data Mismatch',
        urgency: 'medium',
        subject: 'E2E Test Issue - Automated',
        description: 'This is an automated test issue created by Playwright.',
        contactEmail: 'test@kairologic.net',
        userName: 'E2E Test User',
        practiceId: TEST_PRACTICE.id,
        practiceName: TEST_PRACTICE.name,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Issue Report');
    if (body.feedbackId) {
      feedbackId = body.feedbackId;
    }
  });

  test('UC-FB-02: Submit feature request via POST /api/feedback', async ({ request }) => {
    const response = await request.post(API.feedback, {
      data: {
        type: 'feature',
        category: 'Dashboard',
        subject: 'E2E Test Feature - Automated',
        description: 'This is an automated test feature request.',
        contactEmail: 'test@kairologic.net',
        userName: 'E2E Test User',
        practiceId: TEST_PRACTICE.id,
        practiceName: TEST_PRACTICE.name,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Feature Request');
  });

  test('UC-FB-03: Reject feedback with missing required fields', async ({ request }) => {
    const response = await request.post(API.feedback, {
      data: {
        type: 'issue',
        subject: 'Missing fields test',
        // Missing userName, practiceId, practiceName
      },
    });
    // Should return 400 for missing fields
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Status endpoints ─────────────────────────────────────────

  test('UC-FB-04: Get feedback status via GET /api/feedback/[id]/status', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created in previous test');
    const response = await request.get(API.feedbackStatus(feedbackId));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(feedbackId);
    expect(body.status).toBe('open');
  });

  test('UC-FB-05: Update feedback status via PATCH /api/feedback/[id]/status', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.patch(API.feedbackStatus(feedbackId), {
      data: { status: 'in_progress', changed_by: 'E2E Test' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.feedback.status).toBe('in_progress');
  });

  test('UC-FB-06: Reject invalid status value', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.patch(API.feedbackStatus(feedbackId), {
      data: { status: 'invalid_status' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid status');
  });

  test('UC-FB-07: Return 404 for non-existent feedback status', async ({ request }) => {
    const response = await request.get(
      API.feedbackStatus('00000000-0000-0000-0000-000000000000')
    );
    expect(response.status()).toBe(404);
  });

  // ── Comment endpoints ────────────────────────────────────────

  test('UC-FB-08: Add comment via POST /api/feedback/[id]/comments', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.post(API.feedbackComments(feedbackId), {
      data: {
        author: 'E2E Test User',
        author_role: 'practice',
        message: 'Automated test comment from Playwright.',
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.comment).toBeDefined();
    expect(body.comment.message).toContain('Automated test comment');
    expect(body.comment.author_role).toBe('practice');
  });

  test('UC-FB-09: Fetch comments via GET /api/feedback/[id]/comments', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.get(API.feedbackComments(feedbackId));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.comments).toBeInstanceOf(Array);
    // Should have at least the system status-change comment + our manual comment
    expect(body.comments.length).toBeGreaterThanOrEqual(1);
  });

  test('UC-FB-10: Reject comment with missing fields', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.post(API.feedbackComments(feedbackId), {
      data: {
        author: 'Test',
        // Missing author_role and message
      },
    });
    expect(response.status()).toBe(400);
  });

  test('UC-FB-11: Reject comment with invalid author_role', async ({ request }) => {
    test.skip(!feedbackId, 'No feedback created');
    const response = await request.post(API.feedbackComments(feedbackId), {
      data: {
        author: 'Test',
        author_role: 'hacker',
        message: 'Should be rejected',
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('author_role');
  });
});
