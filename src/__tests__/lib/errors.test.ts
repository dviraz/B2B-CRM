import { ApiError, Errors, ErrorCode, handleError } from '@/lib/errors';

describe('Error Handling', () => {
  describe('ApiError', () => {
    it('should create an error with correct properties', () => {
      const error = new ApiError('Test error', ErrorCode.VALIDATION_ERROR, 400, { field: 'name' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'name' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new ApiError('Not found', ErrorCode.NOT_FOUND, 404);
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Not found',
        code: 'NOT_FOUND',
      });
    });

    it('should include details in JSON when present', () => {
      const error = new ApiError('Validation failed', ErrorCode.VALIDATION_ERROR, 400, {
        fields: ['name', 'email'],
      });
      const json = error.toJSON();

      expect(json.details).toEqual({ fields: ['name', 'email'] });
    });
  });

  describe('Error Factories', () => {
    it('should create unauthorized error', () => {
      const error = Errors.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create forbidden error', () => {
      const error = Errors.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create not found error', () => {
      const error = Errors.notFound('User');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create validation error', () => {
      const error = Errors.validation('Invalid input', { field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create missing field error', () => {
      const error = Errors.missingField('name');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('name is required');
    });

    it('should create rate limited error', () => {
      const error = Errors.rateLimited(60);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should create invalid status transition error', () => {
      const error = Errors.invalidStatusTransition('queue', 'done');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(error.details).toEqual({ from: 'queue', to: 'done' });
    });

    it('should create company inactive error', () => {
      const error = Errors.companyInactive();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('COMPANY_INACTIVE');
    });

    it('should create limit reached error', () => {
      const error = Errors.limitReached('Active request limit reached', { limit: 2 });
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('LIMIT_REACHED');
    });
  });

  describe('handleError', () => {
    it('should handle ApiError', () => {
      const error = Errors.notFound('Request');
      const response = handleError(error);

      expect(response.status).toBe(404);
    });

    it('should handle Supabase unique violation', () => {
      const error = { code: '23505', message: 'Unique constraint violated' };
      const response = handleError(error);

      expect(response.status).toBe(409);
    });

    it('should handle Supabase foreign key violation', () => {
      const error = { code: '23503', message: 'Foreign key constraint violated' };
      const response = handleError(error);

      expect(response.status).toBe(400);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const response = handleError(error);

      expect(response.status).toBe(500);
    });

    it('should handle unknown errors', () => {
      const response = handleError('Unknown error type');

      expect(response.status).toBe(500);
    });
  });
});
