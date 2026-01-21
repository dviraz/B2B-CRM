import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Request schemas
export const createRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(10000, 'Description too long').optional(),
  company_id: uuidSchema,
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  assets_link: z.string().url('Invalid URL').max(2000).optional().nullable(),
  video_brief: z.string().url('Invalid URL').max(2000).optional().nullable(),
});

export const updateRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  status: z.enum(['queue', 'active', 'review', 'done']).optional(),
  assets_link: z.string().url().max(2000).optional().nullable(),
  video_brief: z.string().url().max(2000).optional().nullable(),
});

export const moveRequestSchema = z.object({
  status: z.enum(['queue', 'active', 'review', 'done'], {
    message: 'Invalid status. Must be one of: queue, active, review, done',
  }),
});

export const bulkRequestSchema = z.object({
  request_ids: z.array(uuidSchema).min(1, 'At least one request ID required').max(100, 'Maximum 100 items allowed per bulk operation'),
  action: z.enum(['update_status', 'update_priority', 'assign', 'delete'], {
    message: 'Invalid action. Must be one of: update_status, update_priority, assign, delete',
  }),
  value: z.string().optional(),
});

// Company schemas
export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  status: z.enum(['active', 'paused', 'churned']).optional(),
  plan_tier: z.enum(['standard', 'pro']).optional(),
  max_active_limit: z.number().int().min(1).max(100).optional(),
  industry: z.enum([
    'restaurant', 'dental', 'medical', 'legal', 'real_estate', 'home_services',
    'automotive', 'retail', 'fitness', 'beauty_spa', 'professional_services',
    'construction', 'financial_services', 'technology', 'education', 'nonprofit', 'other'
  ]).optional().nullable(),
  business_type: z.enum(['b2b', 'b2c', 'both']).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  website_url: z.string().url().max(500).optional().nullable(),
  google_business_url: z.string().url().max(500).optional().nullable(),
  facebook_url: z.string().url().max(500).optional().nullable(),
  instagram_handle: z.string().max(100).optional().nullable(),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  employee_count: z.number().int().min(0).max(1000000).optional().nullable(),
  annual_revenue_range: z.enum([
    'under_100k', '100k_500k', '500k_1m', '1m_5m', '5m_10m', 'over_10m'
  ]).optional().nullable(),
  logo_url: z.string().url().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// Contact schemas
export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email').max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  is_primary: z.boolean().optional().default(false),
  is_billing_contact: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// Service schemas
export const createServiceSchema = z.object({
  service_name: z.string().min(1, 'Service name is required').max(255),
  service_type: z.enum(['subscription', 'one_time']),
  status: z.enum(['active', 'paused', 'cancelled', 'completed', 'pending']).optional().default('active'),
  price: z.number().min(0).max(1000000).optional().nullable(),
  billing_cycle: z.enum(['monthly', 'quarterly', 'yearly', 'one_time']).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  renewal_date: z.string().optional().nullable(),
  woo_product_id: z.string().max(100).optional().nullable(),
  woo_subscription_id: z.string().max(100).optional().nullable(),
  woo_order_id: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateServiceSchema = createServiceSchema.partial();

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  is_internal: z.boolean().optional().default(false),
});

// Notification schemas
export const markNotificationsSchema = z.object({
  notification_ids: z.array(uuidSchema).optional(),
  mark_all: z.boolean().optional(),
}).refine(
  (data) => data.mark_all || (data.notification_ids && data.notification_ids.length > 0),
  { message: 'Either notification_ids or mark_all must be provided' }
);

export const updateNotificationPreferencesSchema = z.object({
  email_on_comment: z.boolean().optional(),
  email_on_status_change: z.boolean().optional(),
  email_on_assignment: z.boolean().optional(),
  email_on_mention: z.boolean().optional(),
  email_on_due_date: z.boolean().optional(),
  email_digest_enabled: z.boolean().optional(),
  email_digest_frequency: z.enum(['daily', 'weekly']).optional(),
  push_enabled: z.boolean().optional(),
});

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  title_template: z.string().min(1, 'Title template is required').max(500),
  description_template: z.string().max(5000).optional().nullable(),
  default_priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  default_sla_hours: z.number().int().min(1).max(720).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  is_global: z.boolean().optional().default(false),
  company_id: uuidSchema.optional().nullable(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  trigger_type: z.string().min(1, 'Trigger type is required').max(100),
  trigger_conditions: z.record(z.string(), z.unknown()).optional(),
  action_type: z.string().min(1, 'Action type is required').max(100),
  action_config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

// Assignment schemas
export const createAssignmentSchema = z.object({
  assigned_to: uuidSchema,
  notes: z.string().max(1000).optional().nullable(),
});

// File schemas
export const createFileSchema = z.object({
  file_name: z.string().min(1, 'File name is required').max(500),
  file_size: z.number().int().min(1, 'File size is required').max(100 * 1024 * 1024), // Max 100MB
  storage_path: z.string().min(1, 'Storage path is required').max(1000),
  storage_url: z.string().url('Invalid storage URL').max(2000),
  mime_type: z.string().max(255).optional(),
  thumbnail_url: z.string().url().max(2000).optional().nullable(),
});

// Helper to validate and parse request body
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      // Zod v4 uses issues instead of errors
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { data: null, error: errors.join(', ') };
    }

    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
}

// Type exports
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type MoveRequestInput = z.infer<typeof moveRequestSchema>;
export type BulkRequestInput = z.infer<typeof bulkRequestSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type MarkNotificationsInput = z.infer<typeof markNotificationsSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
