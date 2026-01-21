/**
 * Rate Limiting Middleware
 *
 * Provides in-memory rate limiting for API routes.
 * For production with multiple instances, consider using @upstash/ratelimit with Redis.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  window: number;

  /**
   * Optional custom identifier function (defaults to IP address)
   */
  identifier?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
// NOTE: This resets on server restart and doesn't work across multiple instances
// For production, use Redis/Upstash instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Get client identifier (IP address or custom identifier)
 */
function getIdentifier(req: NextRequest, customIdentifier?: (req: NextRequest) => string): string {
  if (customIdentifier) {
    return customIdentifier(req);
  }

  // Try to get real IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  return (
    cfConnectingIp ||
    realIp ||
    forwarded?.split(',')[0].trim() ||
    'unknown'
  );
}

/**
 * Rate limit check
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${identifier}:${config.window}:${config.limit}`;

  let entry = rateLimitStore.get(key);

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.window,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
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

/**
 * Rate limiting middleware for Next.js API routes
 */
export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const identifier = getIdentifier(req, config.identifier);
    const result = checkRateLimit(identifier, config);

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    };

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Return null to indicate rate limit passed, add headers in route handler
    return null;
  };
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  /**
   * Webhook endpoints: 100 requests per minute per IP
   */
  webhook: {
    limit: 100,
    window: 60 * 1000, // 1 minute
  },

  /**
   * Analytics endpoints: 10 requests per minute per user
   */
  analytics: {
    limit: 10,
    window: 60 * 1000, // 1 minute
  },

  /**
   * Mutation endpoints (POST/PUT/DELETE): 60 requests per minute per user
   */
  mutation: {
    limit: 60,
    window: 60 * 1000, // 1 minute
  },

  /**
   * Read endpoints (GET): 120 requests per minute per user
   */
  read: {
    limit: 120,
    window: 60 * 1000, // 1 minute
  },

  /**
   * Strict rate limit for sensitive operations
   */
  strict: {
    limit: 5,
    window: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Helper to apply rate limiting in API routes
 *
 * Usage:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const rateLimitResult = await applyRateLimit(req, RateLimitPresets.mutation);
 *   if (rateLimitResult) return rateLimitResult;
 *
 *   // Your route logic here
 * }
 * ```
 */
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiter = rateLimit(config);
  return limiter(req);
}

/**
 * Get user ID from Supabase session for user-based rate limiting
 */
export function userIdentifier(req: NextRequest): string {
  // This will be populated if you add it to the request context
  // For now, fall back to IP-based limiting
  const userId = req.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // Fallback to IP
  return getIdentifier(req);
}
