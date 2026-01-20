/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solutions like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

// In-memory store (consider Redis for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // General API endpoints
  default: { interval: 60000, maxRequests: 100 }, // 100 requests per minute
  // Authentication endpoints
  auth: { interval: 300000, maxRequests: 10 }, // 10 requests per 5 minutes
  // Write operations
  write: { interval: 60000, maxRequests: 30 }, // 30 writes per minute
  // Bulk operations
  bulk: { interval: 60000, maxRequests: 10 }, // 10 bulk operations per minute
  // File uploads
  upload: { interval: 60000, maxRequests: 20 }, // 20 uploads per minute
  // Search/filter operations
  search: { interval: 60000, maxRequests: 60 }, // 60 searches per minute
  // Webhook endpoints (from external sources)
  webhook: { interval: 1000, maxRequests: 10 }, // 10 per second for webhooks
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // Seconds until reset
  limit: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID, API key)
 * @param type - Type of rate limit to apply
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.interval,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  return {
    success: entry.count <= config.maxRequests,
    remaining,
    resetIn,
    limit: config.maxRequests,
  };
}

/**
 * Get client identifier from request
 * Extracts IP address or falls back to a default
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for IP (behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
  };
}

/**
 * Rate limit middleware helper for API routes
 * Returns null if allowed, or a Response if rate limited
 */
export function rateLimit(
  request: Request,
  type: RateLimitType = 'default',
  customIdentifier?: string
): { allowed: true; result: RateLimitResult } | { allowed: false; response: Response } {
  const identifier = customIdentifier || getClientIdentifier(request);
  const result = checkRateLimit(identifier, type);

  if (!result.success) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.resetIn,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.resetIn.toString(),
            ...createRateLimitHeaders(result),
          },
        }
      ),
    };
  }

  return { allowed: true, result };
}
