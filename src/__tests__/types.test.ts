import type {
  Company,
  CompanyStatus,
  PlanTier,
  Request,
  RequestStatus,
  Priority,
  UserRole,
  CompanyWithStats,
  WooWebhookPayload,
} from '@/types';

describe('Type Definitions', () => {
  describe('CompanyStatus', () => {
    it('should have valid company statuses', () => {
      const validStatuses: CompanyStatus[] = ['active', 'paused', 'churned'];
      expect(validStatuses).toHaveLength(3);
    });
  });

  describe('PlanTier', () => {
    it('should have valid plan tiers', () => {
      const validTiers: PlanTier[] = ['standard', 'pro'];
      expect(validTiers).toHaveLength(2);
    });
  });

  describe('RequestStatus', () => {
    it('should have valid request statuses matching Kanban columns', () => {
      const validStatuses: RequestStatus[] = ['queue', 'active', 'review', 'done'];
      expect(validStatuses).toHaveLength(4);
    });
  });

  describe('Priority', () => {
    it('should have valid priority levels', () => {
      const validPriorities: Priority[] = ['low', 'normal', 'high'];
      expect(validPriorities).toHaveLength(3);
    });
  });

  describe('UserRole', () => {
    it('should have valid user roles', () => {
      const validRoles: UserRole[] = ['admin', 'client'];
      expect(validRoles).toHaveLength(2);
    });
  });

  describe('Company', () => {
    it('should have required properties', () => {
      const company: Company = {
        id: 'test-id',
        name: 'Test Company',
        status: 'active',
        plan_tier: 'standard',
        max_active_limit: 1,
        woo_customer_id: null,
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(company.id).toBeDefined();
      expect(company.name).toBeDefined();
      expect(company.status).toBeDefined();
      expect(company.plan_tier).toBeDefined();
      expect(company.max_active_limit).toBeDefined();
    });
  });

  describe('CompanyWithStats', () => {
    it('should extend Company with active_request_count', () => {
      const companyWithStats: CompanyWithStats = {
        id: 'test-id',
        name: 'Test Company',
        status: 'active',
        plan_tier: 'pro',
        max_active_limit: 2,
        woo_customer_id: '123',
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_request_count: 1,
      };

      expect(companyWithStats.active_request_count).toBe(1);
      expect(companyWithStats.status).toBe('active');
    });
  });

  describe('Request', () => {
    it('should have required properties', () => {
      const request: Request = {
        id: 'req-id',
        company_id: 'comp-id',
        title: 'Test Request',
        description: 'Test description',
        status: 'queue',
        priority: 'normal',
        assets_link: null,
        video_brief: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(request.id).toBeDefined();
      expect(request.company_id).toBeDefined();
      expect(request.title).toBeDefined();
      expect(request.status).toBe('queue');
    });
  });

  describe('WooWebhookPayload', () => {
    it('should have valid subscription statuses', () => {
      const payload: WooWebhookPayload = {
        id: 1,
        status: 'active',
        customer_id: 123,
        billing: {
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          company: 'Test Inc',
        },
        line_items: [
          { product_id: 1, name: 'Standard Plan' },
        ],
      };

      expect(['active', 'on-hold', 'cancelled', 'pending', 'expired']).toContain(
        payload.status
      );
    });
  });
});
