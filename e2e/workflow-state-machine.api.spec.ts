import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, API, VALID_TRANSITIONS } from './fixtures/test-data';
import { loginAsTestUser } from './fixtures/auth';

test.describe('UC-REG-04: Workflow State Machine Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Valid transitions are accepted', async ({ request }) => {
    // Create a workflow in action_needed state
    const createRes = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'State machine test',
      },
    });
    const { workflow } = await createRes.json();

    // action_needed → in_progress (valid)
    const res1 = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'in_progress' },
    });
    expect(res1.status()).toBe(200);

    // in_progress → awaiting (valid)
    const res2 = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'awaiting' },
    });
    expect(res2.status()).toBe(200);

    // awaiting → resolved (valid)
    const res3 = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'resolved' },
    });
    expect(res3.status()).toBe(200);
  });

  test('Invalid transitions are rejected', async ({ request }) => {
    const createRes = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'Invalid transition test',
      },
    });
    const { workflow } = await createRes.json();

    // action_needed → resolved (invalid — must go through in_progress first)
    const res = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'resolved' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.details.code).toBe('INVALID_TRANSITION');
  });

  test('Resolved workflows cannot transition', async ({ request }) => {
    const createRes = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'Resolved immutability test',
      },
    });
    const { workflow } = await createRes.json();

    // Move to resolved state
    await request.patch(API.workflowById(workflow.id), { data: { status: 'in_progress' } });
    await request.patch(API.workflowById(workflow.id), { data: { status: 'resolved' } });

    // Try transitioning out of resolved
    const res = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'action_needed' },
    });
    expect(res.status()).toBe(400);
  });

  test('Cancelled workflows can be reopened', async ({ request }) => {
    const createRes = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'Cancel/reopen test',
      },
    });
    const { workflow } = await createRes.json();

    // Cancel then reopen
    await request.patch(API.workflowById(workflow.id), { data: { status: 'cancelled' } });
    const res = await request.patch(API.workflowById(workflow.id), {
      data: { status: 'action_needed' },
    });
    expect(res.status()).toBe(200);
  });
});
