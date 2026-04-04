/**
 * UC-REG-04 Workflow State Machine Tests
 * Tests for valid and invalid workflow status transitions
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import {
  VALID_TRANSITIONS,
  INVALID_TRANSITIONS,
  API,
  SAMPLE_PAYLOADS,
} from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-REG-04: Workflow state transitions', () => {
  test('Valid: action_needed → in_progress', async ({ request }) => {
    // Create a workflow (starts as action_needed)
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Transition to in_progress
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('in_progress');
  });

  test('Valid: action_needed → cancelled', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'cancelled' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('cancelled');
  });

  test('Valid: in_progress → awaiting', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress first
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    // Then to awaiting
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('awaiting');
  });

  test('Valid: in_progress → action_needed', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress first
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    // Then back to action_needed
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'action_needed' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('action_needed');
  });

  test('Valid: in_progress → cancelled', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress first
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    // Then cancel
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'cancelled' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('cancelled');
  });

  test('Valid: awaiting → resolved', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress, then awaiting
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });

    // Then resolve
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'resolved' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('resolved');
  });

  test('Valid: awaiting → in_progress', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress, then awaiting
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });

    // Then back to in_progress
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('in_progress');
  });

  test('Valid: awaiting → cancelled', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to in_progress, then awaiting
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });

    // Then cancel
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'cancelled' },
    });

    expect(patchResponse.status()).toBe(200);
    const updated = await patchResponse.json();
    expect(updated.status).toBe('cancelled');
  });
});

test.describe('UC-REG-04: Invalid workflow transitions', () => {
  test('Invalid: action_needed → resolved', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Attempt invalid transition
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'resolved' },
    });

    expect(patchResponse.status()).toBe(400);
    const body = await patchResponse.json();
    expect(body).toHaveProperty('error');
  });

  test('Invalid: action_needed → awaiting', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });

    expect(patchResponse.status()).toBe(400);
    const body = await patchResponse.json();
    expect(body).toHaveProperty('error');
  });

  test('Invalid: resolved → in_progress', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to resolved
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'awaiting' },
    });
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'resolved' },
    });

    // Attempt to transition from resolved
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'in_progress' },
    });

    expect(patchResponse.status()).toBe(400);
    const body = await patchResponse.json();
    expect(body).toHaveProperty('error');
  });

  test('Invalid: cancelled → action_needed', async ({ request }) => {
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();

    // Move to cancelled
    await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'cancelled' },
    });

    // Attempt to transition from cancelled
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflow.id)}`, {
      data: { status: 'action_needed' },
    });

    expect(patchResponse.status()).toBe(400);
    const body = await patchResponse.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('UC-REG-05: Concurrent workflow updates', () => {
  test('UC-REG-05: Concurrent PATCH calls to same workflow handled correctly', async ({
    request,
  }) => {
    // Create a workflow
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const workflow = await createResponse.json();
    const workflowId = workflow.id;

    // Launch two concurrent PATCH requests
    const [response1, response2] = await Promise.all([
      request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
        data: { status: 'in_progress' },
      }),
      request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
        data: { status: 'in_progress' },
      }),
    ]);

    // Both should succeed (idempotent) or one should succeed and one should be rejected
    const statuses = [response1.status(), response2.status()];
    expect(statuses.some((s) => s === 200)).toBe(true);
    // Should not crash (no 5xx errors)
    expect(statuses.every((s) => s < 500)).toBe(true);

    // Verify final state is correct
    const getResponse = await request.get(`${BASE}${API.workflowDetail(workflowId)}`);
    const final = await getResponse.json();
    expect(final.status).toBe('in_progress');
  });
});
