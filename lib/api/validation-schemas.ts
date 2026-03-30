/**
 * lib/api/validation-schemas.ts
 *
 * Centralized Zod schemas for API request validation.
 */
import { z } from 'zod';

// Common validators
export const uuidSchema = z.string().uuid('Must be a valid UUID');
export const emailSchema = z.string().email('Must be a valid email address');
export const npiSchema = z.string().regex(/^\d{10}$/, 'NPI must be a 10-digit number');
export const urlSchema = z.string().url('Must be a valid URL');

// Practice settings update
export const practiceUpdateSchema = z.object({
  practice_id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  phone: z.string().max(20).optional(),
  email: emailSchema.optional(),
  url: urlSchema.optional(),
}).strict(); // strict() rejects unknown keys - prevents setting arbitrary DB columns

// Team invite
export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'viewer', 'editor']),
  practice_id: uuidSchema,
});

// Team member update
export const teamMemberUpdateSchema = z.object({
  role: z.enum(['admin', 'viewer', 'editor']).optional(),
  is_primary: z.boolean().optional(),
});

// Feedback submission
export const feedbackSchema = z.object({
  type: z.enum(['issue', 'feature']),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().max(50).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  contactEmail: emailSchema.optional(),
  practiceId: uuidSchema.optional(),
  practiceName: z.string().max(255).optional(),
  userName: z.string().max(255).optional(),
});

// Contact form
export const contactSchema = z.object({
  contactName: z.string().min(1).max(200),
  email: emailSchema,
  practiceName: z.string().min(1).max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

// Workflow creation
export const workflowCreateSchema = z.object({
  practice_id: uuidSchema,
  workflow_type: z.string().min(1).max(50),
  provider_npi: npiSchema.optional(),
  provider_name: z.string().max(255).optional(),
  finding_summary: z.string().max(1000).optional(),
  finding_details: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().int().min(0).max(5).optional(),
});

// Workflow update
export const workflowUpdateSchema = z.object({
  status: z.enum(['action_needed', 'in_progress', 'awaiting', 'resolved', 'cancelled']).optional(),
  approved_value: z.string().max(500).optional(),
  approved_at: z.string().datetime().optional(),
}).strict();

// Admin practice add
export const practiceAddSchema = z.object({
  npi: npiSchema.optional(),
  url: z.string().min(3).max(500),
});

// Search query
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  practice_id: uuidSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
});

// Notification settings
export const notificationSettingsSchema = z.object({
  practice_id: uuidSchema,
  email_alerts: z.boolean().optional(),
  alert_frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  alert_types: z.array(z.string()).optional(),
});

// Agent settings
export const agentSettingsSchema = z.object({
  practice_id: uuidSchema,
  auto_scan: z.boolean().optional(),
  scan_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  enabled_checks: z.array(z.string()).optional(),
});

// Password change
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});
