/**
 * UC-WF1/WF2/WF3/WF4/WF5/WF6 Workflow CRUD API Tests
 * Tests for workflow creation and retrieval across all workflow types
 * Maps to: USE_CASES_AND_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import {
  TEST_PRACTICE,
  TEST_LICENSE_WORKFLOW,
  WORKFLOW_TYPES,
  API,
  SAMPLE_PAYLOADS,
} from '../fixtures/test-data';

const BASE = process.env.TEST_BASE_URL || 'https://kairologic.net';

test.describe('UC-WF1-01: NPPES Update workflow creation', () => {
  test('UC-WF1-01: POST /api/workflows/create type=nppes_update → 201, workflow + 4 tasks', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('nppes_update');
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(WORKFLOW_TYPES.nppes_update.taskCount);
  });
});

test.describe('UC-WF2-01: Payer Directory workflow creation', () => {
  test('UC-WF2-01: POST /api/workflows/create type=payer_directory → 201, workflow + 4 tasks, comparison data in metadata', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.payerDirectory,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('payer_directory');
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(WORKFLOW_TYPES.payer_directory.taskCount);
    // Verify comparison data in metadata
    expect(body).toHaveProperty('metadata');
    expect(body.metadata).toHaveProperty('finding_details');
  });
});

test.describe('UC-WF3-01: Onboarding workflow creation', () => {
  test('UC-WF3-01: POST /api/workflows/create type=onboarding → 201, workflow + 6 tasks', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.onboarding,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('onboarding');
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(WORKFLOW_TYPES.onboarding.taskCount);
  });
});

test.describe('UC-WF4-01: Release workflow creation', () => {
  test('UC-WF4-01: POST /api/workflows/create type=release → 201, workflow + 5 tasks', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.release,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('release');
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(WORKFLOW_TYPES.release.taskCount);
  });
});

test.describe('UC-WF5-01: Compliance workflow creation', () => {
  test('UC-WF5-01: POST /api/workflows/create type=compliance → 201, workflow + 3 tasks', async ({
    request,
  }) => {
    const response = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.compliance,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('compliance');
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks).toHaveLength(WORKFLOW_TYPES.compliance.taskCount);
  });
});

test.describe('UC-WF6-01: License Renewal workflow retrieval', () => {
  test('UC-WF6-01: GET existing license renewal workflow → correct task count', async ({
    request,
  }) => {
    const response = await request.get(`${BASE}${API.workflowDetail(TEST_LICENSE_WORKFLOW.id)}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBe(TEST_LICENSE_WORKFLOW.id);
    expect(body.type).toBe('license_renewal');
    expect(body).toHaveProperty('tasks');
    expect(body.tasks).toHaveLength(TEST_LICENSE_WORKFLOW.taskCount);
  });
});

test.describe('UC-WF1-02: Workflow detail retrieval', () => {
  test('UC-WF1-02: GET /api/workflows/[id] → returns workflow + tasks + events', async ({
    request,
  }) => {
    // First create a workflow
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const createdWorkflow = await createResponse.json();
    const workflowId = createdWorkflow.id;

    // Then retrieve it
    const getResponse = await request.get(`${BASE}${API.workflowDetail(workflowId)}`);

    expect(getResponse.status()).toBe(200);
    const body = await getResponse.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBe(workflowId);
    expect(body).toHaveProperty('tasks');
    expect(Array.isArray(body.tasks)).toBe(true);
    // Events should be present (audit trail)
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });
});

test.describe('UC-WF1-04: Workflow status transition - approve correction', () => {
  test('UC-WF1-04: PATCH /api/workflows/[id] approve correction → status changes to in_progress', async ({
    request,
  }) => {
    // Create a workflow
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const createdWorkflow = await createResponse.json();
    const workflowId = createdWorkflow.id;

    // Update to in_progress (approve correction)
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
      data: {
        status: 'in_progress',
        action: 'approve_correction',
      },
    });

    expect(patchResponse.status()).toBe(200);
    const body = await patchResponse.json();
    expect(body.status).toBe('in_progress');
  });
});

test.describe('UC-WF1-06: Workflow status transition - mark submitted', () => {
  test('UC-WF1-06: PATCH /api/workflows/[id] mark submitted → status changes to awaiting', async ({
    request,
  }) => {
    // Create a workflow
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const createdWorkflow = await createResponse.json();
    const workflowId = createdWorkflow.id;

    // First move to in_progress
    await request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
      data: { status: 'in_progress' },
    });

    // Then mark submitted (awaiting)
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
      data: {
        status: 'awaiting',
        action: 'mark_submitted',
      },
    });

    expect(patchResponse.status()).toBe(200);
    const body = await patchResponse.json();
    expect(body.status).toBe('awaiting');
  });
});

test.describe('UC-WF1-07: NPPES monitor cron endpoint', () => {
  test('UC-WF1-07: Test NPPES monitor cron endpoint responds', async ({ request }) => {
    const response = await request.post(`${BASE}${API.cronNppesMonitor}`, {
      data: {},
    });

    // Should succeed (200) or return OK status
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toHaveProperty('success');
  });
});

test.describe('UC-WF1-09: Workflow cancellation', () => {
  test('UC-WF1-09: PATCH /api/workflows/[id] cancel → status becomes cancelled', async ({
    request,
  }) => {
    // Create a workflow
    const createResponse = await request.post(`${BASE}${API.workflowCreate}`, {
      data: SAMPLE_PAYLOADS.nppesUpdate,
    });
    const createdWorkflow = await createResponse.json();
    const workflowId = createdWorkflow.id;

    // Cancel the workflow
    const patchResponse = await request.patch(`${BASE}${API.workflowDetail(workflowId)}`, {
      data: {
        status: 'cancelled',
        action: 'cancel',
      },
    });

    expect(patchResponse.status()).toBe(200);
    const body = await patchResponse.json();
    expect(body.status).toBe('cancelled');
  });
});
