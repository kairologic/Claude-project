import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, API, WORKFLOW_TYPES } from './fixtures/test-data';
import { loginAsTestUser } from './fixtures/auth';

test.describe('UC-WF: Workflow CRUD API', () => {
  let createdWorkflowId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('UC-WF1-01: Create NPPES update workflow via API', async ({ request }) => {
    const response = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        provider_npi: '1234567890',
        provider_name: 'Dr. Test Provider',
        finding_summary: 'Address mismatch detected',
        priority: 2,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.workflow).toBeDefined();
    expect(body.workflow.id).toBeDefined();
    expect(body.workflow.workflow_type).toBe('nppes_update');
    expect(body.workflow.status).toBe('action_needed');
    expect(body.tasks).toBeDefined();
    expect(body.tasks.length).toBeGreaterThan(0);
    createdWorkflowId = body.workflow.id;
  });

  test('UC-WF1-02: Fetch workflow detail via API', async ({ request }) => {
    test.skip(!createdWorkflowId, 'No workflow created in previous test');
    const response = await request.get(API.workflowById(createdWorkflowId));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.workflow.id).toBe(createdWorkflowId);
    expect(body.tasks).toBeInstanceOf(Array);
    expect(body.events).toBeInstanceOf(Array);
  });

  test('UC-WF1-03: Update workflow status via API', async ({ request }) => {
    test.skip(!createdWorkflowId, 'No workflow created');
    const response = await request.patch(API.workflowById(createdWorkflowId), {
      data: { status: 'in_progress' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.workflow.status).toBe('in_progress');
  });

  test('UC-WF1-04: Invalid workflow type rejected', async ({ request }) => {
    const response = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'invalid_type',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('UC-WF1-05: Create workflow for each valid type', async ({ request }) => {
    for (const wfType of WORKFLOW_TYPES) {
      const response = await request.post(API.workflowCreate, {
        data: {
          practice_id: TEST_PRACTICE.id,
          workflow_type: wfType,
          finding_summary: `Test ${wfType} workflow`,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.workflow.workflow_type).toBe(wfType);
    }
  });

  test('UC-WF1-06: Workflow creation returns task templates', async ({ request }) => {
    const response = await request.post(API.workflowCreate, {
      data: {
        practice_id: TEST_PRACTICE.id,
        workflow_type: 'nppes_update',
        finding_summary: 'Task template test',
      },
    });
    const body = await response.json();
    expect(body.tasks.length).toBeGreaterThan(0);
    expect(body.tasks[0]).toHaveProperty('title');
    expect(body.tasks[0]).toHaveProperty('task_type');
    expect(body.tasks[0]).toHaveProperty('status');
  });
});
