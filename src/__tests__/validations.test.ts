import {
  uuidSchema,
  createRequestSchema,
  updateRequestSchema,
  moveRequestSchema,
  bulkRequestSchema,
  createContactSchema,
  createServiceSchema,
  createCommentSchema,
  markNotificationsSchema,
  createTemplateSchema,
  createWorkflowSchema,
  createAssignmentSchema,
  createFileSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = uuidSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuid = 'not-a-uuid';
      const result = uuidSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
    });

    it('should reject empty strings', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('createRequestSchema', () => {
    const validRequest = {
      title: 'Test Request',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid request with required fields', () => {
      const result = createRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept request with all optional fields', () => {
      const fullRequest = {
        ...validRequest,
        description: 'Test description',
        priority: 'high',
        assets_link: 'https://example.com/assets',
        video_brief: 'https://example.com/video',
      };
      const result = createRequestSchema.safeParse(fullRequest);
      expect(result.success).toBe(true);
    });

    it('should default priority to normal', () => {
      const result = createRequestSchema.safeParse(validRequest);
      if (result.success) {
        expect(result.data.priority).toBe('normal');
      }
    });

    it('should reject empty title', () => {
      const result = createRequestSchema.safeParse({ ...validRequest, title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 500 characters', () => {
      const longTitle = 'a'.repeat(501);
      const result = createRequestSchema.safeParse({ ...validRequest, title: longTitle });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = createRequestSchema.safeParse({ ...validRequest, priority: 'urgent' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL for assets_link', () => {
      const result = createRequestSchema.safeParse({ ...validRequest, assets_link: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid company_id', () => {
      const result = createRequestSchema.safeParse({ ...validRequest, company_id: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateRequestSchema', () => {
    it('should accept partial updates', () => {
      const result = updateRequestSchema.safeParse({ title: 'Updated Title' });
      expect(result.success).toBe(true);
    });

    it('should accept status updates', () => {
      const result = updateRequestSchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateRequestSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('moveRequestSchema', () => {
    it('should accept valid statuses', () => {
      const statuses = ['queue', 'active', 'review', 'done'];
      statuses.forEach((status) => {
        const result = moveRequestSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = moveRequestSchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(false);
    });

    it('should require status field', () => {
      const result = moveRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('bulkRequestSchema', () => {
    const validBulk = {
      request_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      action: 'update_status',
    };

    it('should accept valid bulk operation', () => {
      const result = bulkRequestSchema.safeParse(validBulk);
      expect(result.success).toBe(true);
    });

    it('should accept all valid actions', () => {
      const actions = ['update_status', 'update_priority', 'assign', 'delete'];
      actions.forEach((action) => {
        const result = bulkRequestSchema.safeParse({ ...validBulk, action });
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty request_ids array', () => {
      const result = bulkRequestSchema.safeParse({ ...validBulk, request_ids: [] });
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 request_ids', () => {
      const tooManyIds = Array(101).fill('550e8400-e29b-41d4-a716-446655440000');
      const result = bulkRequestSchema.safeParse({ ...validBulk, request_ids: tooManyIds });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUIDs in request_ids', () => {
      const result = bulkRequestSchema.safeParse({ ...validBulk, request_ids: ['invalid-id'] });
      expect(result.success).toBe(false);
    });

    it('should reject invalid action', () => {
      const result = bulkRequestSchema.safeParse({ ...validBulk, action: 'invalid_action' });
      expect(result.success).toBe(false);
    });
  });

  describe('createContactSchema', () => {
    it('should accept valid contact', () => {
      const result = createContactSchema.safeParse({ name: 'John Doe' });
      expect(result.success).toBe(true);
    });

    it('should accept contact with all fields', () => {
      const fullContact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'CEO',
        is_primary: true,
        is_billing_contact: true,
        notes: 'Important client',
      };
      const result = createContactSchema.safeParse(fullContact);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createContactSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = createContactSchema.safeParse({ name: 'John', email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should default is_primary to false', () => {
      const result = createContactSchema.safeParse({ name: 'John' });
      if (result.success) {
        expect(result.data.is_primary).toBe(false);
      }
    });
  });

  describe('createServiceSchema', () => {
    const validService = {
      service_name: 'Premium Plan',
      service_type: 'subscription',
    };

    it('should accept valid service', () => {
      const result = createServiceSchema.safeParse(validService);
      expect(result.success).toBe(true);
    });

    it('should accept both service types', () => {
      const types = ['subscription', 'one_time'];
      types.forEach((type) => {
        const result = createServiceSchema.safeParse({ ...validService, service_type: type });
        expect(result.success).toBe(true);
      });
    });

    it('should accept all valid statuses', () => {
      const statuses = ['active', 'paused', 'cancelled', 'completed', 'pending'];
      statuses.forEach((status) => {
        const result = createServiceSchema.safeParse({ ...validService, status });
        expect(result.success).toBe(true);
      });
    });

    it('should accept all valid billing cycles', () => {
      const cycles = ['monthly', 'quarterly', 'yearly', 'one_time'];
      cycles.forEach((billing_cycle) => {
        const result = createServiceSchema.safeParse({ ...validService, billing_cycle });
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty service_name', () => {
      const result = createServiceSchema.safeParse({ ...validService, service_name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid service_type', () => {
      const result = createServiceSchema.safeParse({ ...validService, service_type: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const result = createServiceSchema.safeParse({ ...validService, price: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject price over 1 million', () => {
      const result = createServiceSchema.safeParse({ ...validService, price: 1000001 });
      expect(result.success).toBe(false);
    });
  });

  describe('createCommentSchema', () => {
    it('should accept valid comment', () => {
      const result = createCommentSchema.safeParse({ content: 'Test comment' });
      expect(result.success).toBe(true);
    });

    it('should accept internal comment', () => {
      const result = createCommentSchema.safeParse({ content: 'Internal note', is_internal: true });
      expect(result.success).toBe(true);
    });

    it('should default is_internal to false', () => {
      const result = createCommentSchema.safeParse({ content: 'Test' });
      if (result.success) {
        expect(result.data.is_internal).toBe(false);
      }
    });

    it('should reject empty content', () => {
      const result = createCommentSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('should reject content longer than 10000 characters', () => {
      const longContent = 'a'.repeat(10001);
      const result = createCommentSchema.safeParse({ content: longContent });
      expect(result.success).toBe(false);
    });
  });

  describe('markNotificationsSchema', () => {
    it('should accept notification_ids', () => {
      const result = markNotificationsSchema.safeParse({
        notification_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept mark_all', () => {
      const result = markNotificationsSchema.safeParse({ mark_all: true });
      expect(result.success).toBe(true);
    });

    it('should reject when neither notification_ids nor mark_all provided', () => {
      const result = markNotificationsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty notification_ids without mark_all', () => {
      const result = markNotificationsSchema.safeParse({ notification_ids: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('createTemplateSchema', () => {
    const validTemplate = {
      name: 'Bug Report',
      title_template: '[Bug] {title}',
    };

    it('should accept valid template', () => {
      const result = createTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should accept all valid priorities', () => {
      const priorities = ['low', 'normal', 'high'];
      priorities.forEach((default_priority) => {
        const result = createTemplateSchema.safeParse({ ...validTemplate, default_priority });
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty name', () => {
      const result = createTemplateSchema.safeParse({ ...validTemplate, name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty title_template', () => {
      const result = createTemplateSchema.safeParse({ ...validTemplate, title_template: '' });
      expect(result.success).toBe(false);
    });

    it('should reject SLA hours outside valid range', () => {
      const result1 = createTemplateSchema.safeParse({ ...validTemplate, default_sla_hours: 0 });
      expect(result1.success).toBe(false);

      const result2 = createTemplateSchema.safeParse({ ...validTemplate, default_sla_hours: 721 });
      expect(result2.success).toBe(false);
    });

    it('should accept SLA hours within range', () => {
      const result = createTemplateSchema.safeParse({ ...validTemplate, default_sla_hours: 24 });
      expect(result.success).toBe(true);
    });
  });

  describe('createWorkflowSchema', () => {
    const validWorkflow = {
      name: 'Auto-assign',
      trigger_type: 'status_change',
      action_type: 'assign',
    };

    it('should accept valid workflow', () => {
      const result = createWorkflowSchema.safeParse(validWorkflow);
      expect(result.success).toBe(true);
    });

    it('should accept workflow with conditions and config', () => {
      const fullWorkflow = {
        ...validWorkflow,
        description: 'Auto-assign on status change',
        trigger_conditions: { from_status: 'queue', to_status: 'active' },
        action_config: { assign_to: 'user-id' },
        is_active: true,
      };
      const result = createWorkflowSchema.safeParse(fullWorkflow);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createWorkflowSchema.safeParse({ ...validWorkflow, name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty trigger_type', () => {
      const result = createWorkflowSchema.safeParse({ ...validWorkflow, trigger_type: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty action_type', () => {
      const result = createWorkflowSchema.safeParse({ ...validWorkflow, action_type: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createAssignmentSchema', () => {
    it('should accept valid assignment', () => {
      const result = createAssignmentSchema.safeParse({
        assigned_to: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept assignment with notes', () => {
      const result = createAssignmentSchema.safeParse({
        assigned_to: '550e8400-e29b-41d4-a716-446655440000',
        notes: 'Priority task',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for assigned_to', () => {
      const result = createAssignmentSchema.safeParse({ assigned_to: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 characters', () => {
      const longNotes = 'a'.repeat(1001);
      const result = createAssignmentSchema.safeParse({
        assigned_to: '550e8400-e29b-41d4-a716-446655440000',
        notes: longNotes,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createFileSchema', () => {
    const validFile = {
      file_name: 'document.pdf',
      file_size: 1024,
      storage_path: '/uploads/document.pdf',
      storage_url: 'https://storage.example.com/document.pdf',
    };

    it('should accept valid file', () => {
      const result = createFileSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should accept file with optional fields', () => {
      const fullFile = {
        ...validFile,
        mime_type: 'application/pdf',
        thumbnail_url: 'https://storage.example.com/thumb.png',
      };
      const result = createFileSchema.safeParse(fullFile);
      expect(result.success).toBe(true);
    });

    it('should reject empty file_name', () => {
      const result = createFileSchema.safeParse({ ...validFile, file_name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject zero file_size', () => {
      const result = createFileSchema.safeParse({ ...validFile, file_size: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject file_size over 100MB', () => {
      const result = createFileSchema.safeParse({ ...validFile, file_size: 100 * 1024 * 1024 + 1 });
      expect(result.success).toBe(false);
    });

    it('should accept file_size exactly at 100MB', () => {
      const result = createFileSchema.safeParse({ ...validFile, file_size: 100 * 1024 * 1024 });
      expect(result.success).toBe(true);
    });

    it('should reject invalid storage_url', () => {
      const result = createFileSchema.safeParse({ ...validFile, storage_url: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid thumbnail_url', () => {
      const result = createFileSchema.safeParse({ ...validFile, thumbnail_url: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });
});
