import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset the rate limit store between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within the limit', () => {
      const identifier = 'test-user-1';
      const result = checkRateLimit(identifier, 'default');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.default.maxRequests - 1);
    });

    it('should block requests exceeding the limit', () => {
      const identifier = 'test-user-2';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMITS.default.maxRequests; i++) {
        checkRateLimit(identifier, 'default');
      }

      // Next request should be blocked
      const result = checkRateLimit(identifier, 'default');
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after the interval expires', () => {
      const identifier = 'test-user-3';

      // Exhaust the limit
      for (let i = 0; i <= RATE_LIMITS.default.maxRequests; i++) {
        checkRateLimit(identifier, 'default');
      }

      // Fast-forward past the interval
      jest.advanceTimersByTime(RATE_LIMITS.default.interval + 1000);

      // Should be allowed again
      const result = checkRateLimit(identifier, 'default');
      expect(result.success).toBe(true);
    });

    it('should use different limits for different types', () => {
      const identifier = 'test-user-4';

      // Auth has stricter limits
      for (let i = 0; i < RATE_LIMITS.auth.maxRequests; i++) {
        checkRateLimit(identifier, 'auth');
      }

      const authResult = checkRateLimit(identifier, 'auth');
      expect(authResult.success).toBe(false);

      // But default should still work (different namespace)
      const defaultResult = checkRateLimit(identifier, 'default');
      expect(defaultResult.success).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.2');
    });

    it('should return unknown for requests without IP headers', () => {
      const request = new Request('https://example.com');
      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('unknown');
    });
  });

  describe('rateLimit middleware', () => {
    it('should return allowed: true when within limits', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const result = rateLimit(request, 'default');

      if (result.allowed) {
        expect(result.result.success).toBe(true);
      } else {
        fail('Expected allowed to be true');
      }
    });

    it('should return a 429 response when rate limited', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.101',
        },
      });

      // Exhaust the limit
      for (let i = 0; i <= RATE_LIMITS.default.maxRequests; i++) {
        rateLimit(request, 'default');
      }

      const result = rateLimit(request, 'default');

      if (!result.allowed) {
        expect(result.response.status).toBe(429);
      } else {
        fail('Expected allowed to be false');
      }
    });
  });
});
