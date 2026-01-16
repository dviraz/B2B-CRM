import type { UserRole, RequestStatus } from '@/types';

describe('Permission System', () => {
  // Helper to check if user can perform action
  function canMoveRequest(
    userRole: UserRole,
    userCompanyId: string | null,
    requestCompanyId: string,
    currentStatus: RequestStatus,
    targetStatus: RequestStatus
  ): { allowed: boolean; reason?: string } {
    const isAdmin = userRole === 'admin';

    // Only admins can move to active
    if (targetStatus === 'active' && !isAdmin) {
      return { allowed: false, reason: 'Only admins can activate requests' };
    }

    // Clients can only move their own company's requests
    if (!isAdmin && userCompanyId !== requestCompanyId) {
      return { allowed: false, reason: 'Not authorized to move this request' };
    }

    // Clients can only move from review to done
    if (!isAdmin && !(currentStatus === 'review' && targetStatus === 'done')) {
      return {
        allowed: false,
        reason: 'Clients can only mark reviewed requests as complete',
      };
    }

    return { allowed: true };
  }

  describe('Admin Permissions', () => {
    const adminRole: UserRole = 'admin';

    it('should allow admins to move any request to active', () => {
      const result = canMoveRequest(adminRole, null, 'comp-1', 'queue', 'active');
      expect(result.allowed).toBe(true);
    });

    it('should allow admins to move requests to review', () => {
      const result = canMoveRequest(adminRole, null, 'comp-1', 'active', 'review');
      expect(result.allowed).toBe(true);
    });

    it('should allow admins to move any request regardless of company', () => {
      const result = canMoveRequest(adminRole, 'comp-2', 'comp-1', 'review', 'done');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Client Permissions', () => {
    const clientRole: UserRole = 'client';
    const clientCompanyId = 'client-company';

    it('should not allow clients to move to active', () => {
      const result = canMoveRequest(
        clientRole,
        clientCompanyId,
        clientCompanyId,
        'queue',
        'active'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Only admins can activate requests');
    });

    it('should allow clients to move from review to done for their own requests', () => {
      const result = canMoveRequest(
        clientRole,
        clientCompanyId,
        clientCompanyId,
        'review',
        'done'
      );
      expect(result.allowed).toBe(true);
    });

    it('should not allow clients to move other companies requests', () => {
      const result = canMoveRequest(
        clientRole,
        clientCompanyId,
        'other-company',
        'review',
        'done'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Not authorized to move this request');
    });

    it('should not allow clients to move from queue to done directly', () => {
      const result = canMoveRequest(
        clientRole,
        clientCompanyId,
        clientCompanyId,
        'queue',
        'done'
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('Comment Permissions', () => {
    function canComment(
      userRole: UserRole,
      userCompanyId: string | null,
      requestCompanyId: string,
      companyStatus: 'active' | 'paused' | 'churned'
    ): { allowed: boolean; reason?: string } {
      const isAdmin = userRole === 'admin';

      // Non-admins can only comment on their company's requests
      if (!isAdmin && userCompanyId !== requestCompanyId) {
        return { allowed: false, reason: 'Not authorized to comment on this request' };
      }

      // Check company status for non-admins
      if (!isAdmin && companyStatus !== 'active') {
        return { allowed: false, reason: 'Cannot comment while subscription is not active' };
      }

      return { allowed: true };
    }

    it('should allow admins to comment on any request', () => {
      const result = canComment('admin', null, 'any-company', 'active');
      expect(result.allowed).toBe(true);
    });

    it('should allow active clients to comment on their requests', () => {
      const result = canComment('client', 'comp-1', 'comp-1', 'active');
      expect(result.allowed).toBe(true);
    });

    it('should not allow paused clients to comment', () => {
      const result = canComment('client', 'comp-1', 'comp-1', 'paused');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Cannot comment while subscription is not active');
    });

    it('should not allow clients to comment on other companies requests', () => {
      const result = canComment('client', 'comp-1', 'comp-2', 'active');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Internal Comments', () => {
    function canCreateInternalComment(userRole: UserRole): boolean {
      return userRole === 'admin';
    }

    function canViewInternalComments(userRole: UserRole): boolean {
      return userRole === 'admin';
    }

    it('should allow admins to create internal comments', () => {
      expect(canCreateInternalComment('admin')).toBe(true);
    });

    it('should not allow clients to create internal comments', () => {
      expect(canCreateInternalComment('client')).toBe(false);
    });

    it('should allow admins to view internal comments', () => {
      expect(canViewInternalComments('admin')).toBe(true);
    });

    it('should not allow clients to view internal comments', () => {
      expect(canViewInternalComments('client')).toBe(false);
    });
  });
});
