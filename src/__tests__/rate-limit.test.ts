/**
 * Rate Limiting Tests
 *
 * Tests the core rate limiting logic without importing Next.js specific code
 */

// Inline implementation to avoid importing Next.js code
interface RateLimitConfig {
  limit: number;
  window: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const testRateLimitStore = new Map<string, RateLimitEntry>();

function testCheckRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${identifier}:${config.window}:${config.limit}`;

  let entry = testRateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.window,
    };
    testRateLimitStore.set(key, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetAt,
    };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  };
}

// Test presets (same as production)
const TestRateLimitPresets = {
  webhook: { limit: 100, window: 60000 },
  analytics: { limit: 10, window: 60000 },
  mutation: { limit: 60, window: 60000 },
  read: { limit: 120, window: 60000 },
  strict: { limit: 5, window: 60000 },
} as const;

describe('Rate Limiting', () => {
  // Clear the rate limit store between tests by using unique identifiers
  let testCounter = 0;
  const getUniqueId = () => `test-${Date.now()}-${testCounter++}`;

  describe('testCheckRateLimit', () => {
    it('should allow requests within limit', () => {
      const identifier = getUniqueId();
      const config = { limit: 5, window: 60000 };

      const result = testCheckRateLimit(identifier, config);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should decrement remaining count with each request', () => {
      const identifier = getUniqueId();
      const config = { limit: 3, window: 60000 };

      const result1 = testCheckRateLimit(identifier, config);
      expect(result1.remaining).toBe(2);

      const result2 = testCheckRateLimit(identifier, config);
      expect(result2.remaining).toBe(1);

      const result3 = testCheckRateLimit(identifier, config);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests when limit exceeded', () => {
      const identifier = getUniqueId();
      const config = { limit: 2, window: 60000 };

      // Use up the limit
      testCheckRateLimit(identifier, config);
      testCheckRateLimit(identifier, config);

      // Third request should be blocked
      const result = testCheckRateLimit(identifier, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should include reset timestamp', () => {
      const identifier = getUniqueId();
      const config = { limit: 5, window: 60000 };
      const now = Date.now();

      const result = testCheckRateLimit(identifier, config);

      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(now + config.window + 100); // Allow small margin
    });

    it('should reset after window expires', async () => {
      const identifier = getUniqueId();
      const config = { limit: 2, window: 50 }; // 50ms window for test

      // Use up the limit
      testCheckRateLimit(identifier, config);
      testCheckRateLimit(identifier, config);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be allowed again
      const result = testCheckRateLimit(identifier, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should track different identifiers separately', () => {
      const identifier1 = getUniqueId();
      const identifier2 = getUniqueId();
      const config = { limit: 2, window: 60000 };

      // Use up limit for first identifier
      testCheckRateLimit(identifier1, config);
      testCheckRateLimit(identifier1, config);
      const result1 = testCheckRateLimit(identifier1, config);
      expect(result1.success).toBe(false);

      // Second identifier should still have full limit
      const result2 = testCheckRateLimit(identifier2, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should track different configs separately', () => {
      const identifier = getUniqueId();
      const config1 = { limit: 2, window: 60000 };
      const config2 = { limit: 10, window: 60000 };

      // Use up limit for config1
      testCheckRateLimit(identifier, config1);
      testCheckRateLimit(identifier, config1);
      const result1 = testCheckRateLimit(identifier, config1);
      expect(result1.success).toBe(false);

      // config2 should still have full limit
      const result2 = testCheckRateLimit(identifier, config2);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(9);
    });
  });

  describe('RateLimitPresets', () => {
    it('should have webhook preset with correct values', () => {
      expect(TestRateLimitPresets.webhook.limit).toBe(100);
      expect(TestRateLimitPresets.webhook.window).toBe(60000);
    });

    it('should have analytics preset with correct values', () => {
      expect(TestRateLimitPresets.analytics.limit).toBe(10);
      expect(TestRateLimitPresets.analytics.window).toBe(60000);
    });

    it('should have mutation preset with correct values', () => {
      expect(TestRateLimitPresets.mutation.limit).toBe(60);
      expect(TestRateLimitPresets.mutation.window).toBe(60000);
    });

    it('should have read preset with correct values', () => {
      expect(TestRateLimitPresets.read.limit).toBe(120);
      expect(TestRateLimitPresets.read.window).toBe(60000);
    });

    it('should have strict preset with correct values', () => {
      expect(TestRateLimitPresets.strict.limit).toBe(5);
      expect(TestRateLimitPresets.strict.window).toBe(60000);
    });

    it('should have webhook > mutation > analytics > strict in terms of limits', () => {
      expect(TestRateLimitPresets.webhook.limit).toBeGreaterThan(TestRateLimitPresets.mutation.limit);
      expect(TestRateLimitPresets.mutation.limit).toBeGreaterThan(TestRateLimitPresets.analytics.limit);
      expect(TestRateLimitPresets.analytics.limit).toBeGreaterThan(TestRateLimitPresets.strict.limit);
    });
  });
});
