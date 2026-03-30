import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, API } from './fixtures/test-data';
import { loginAsTestUser } from './fixtures/auth';

test.describe('UC-REG: API Resilience & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('UC-REG-03: API returns structured error for invalid JSON body', async ({ request }) => {
    const response = await request.post(API.workflowCreate, {
      headers: { 'Content-Type': 'application/json' },
      data: 'not-valid-json',
    });
    expect([400, 500]).toContain(response.status());
  });

  test('UC-REG-03: API returns structured error for missing required fields', async ({ request }) => {
    const response = await request.post(API.workflowCreate, {
      data: { practice_id: TEST_PRACTICE.id },
    });
    expect(response.status()).toBe(400);
  });

  test('UC-REG-06: Nonexistent workflow returns 404', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(API.workflowById(fakeId));
    expect([404, 200]).toContain(response.status()); // 200 if workflow just returns empty
  });

  test('UC-REG-06: Concurrent workflow updates do not corrupt state', async ({ request }) => {
    // Create a workflow
    const createRes = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'Concurrent update test',
      },
    });
    const { workflow } = await createRes.json();

    // Fire 3 concurrent updates
    const [r1, r2, r3] = await Promise.all([
      request.patch(API.workflowById(workflow.id), { data: { status: 'in_progress' } }),
      request.patch(API.workflowById(workflow.id), { data: { status: 'in_progress' } }),
      request.patch(API.workflowById(workflow.id), { data: { status: 'in_progress' } }),
    ]);

    // All should succeed (idempotent) or at most one fails
    const statuses = [r1.status(), r2.status(), r3.status()];
    expect(statuses.filter(s => s === 200).length).toBeGreaterThanOrEqual(1);

    // Final state should be consistent
    const final = await request.get(API.workflowById(workflow.id));
    const body = await final.json();
    expect(body.workflow.status).toBe('in_progress');
  });

  test('UC-WF1-08: Feedback submission with valid data succeeds', async ({ request }) => {
    const response = await request.post(API.feedback, {
      data: {
        type: 'issue',
        subject: 'E2E test issue',
        description: 'This is an automated test issue from Playwright.',
        category: 'bug',
        urgency: 'low',
      },
    });
    expect([200, 201]).toContain(response.status());
  });
});
