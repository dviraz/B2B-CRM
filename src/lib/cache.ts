/**
 * Cache Utilities for API Routes
 *
 * Provides caching helpers for API responses to improve performance.
 * Uses HTTP cache headers and Next.js revalidation strategies.
 */

import { NextResponse } from 'next/server';

/**
 * Cache duration presets in seconds
 */
export const CacheDurations = {
  /** No caching - for sensitive/real-time data */
  none: 0,
  /** Short cache - 30 seconds (for frequently changing data) */
  short: 30,
  /** Medium cache - 5 minutes (for semi-static data) */
  medium: 5 * 60,
  /** Long cache - 1 hour (for rarely changing data) */
  long: 60 * 60,
  /** Static cache - 1 day (for static reference data) */
  static: 24 * 60 * 60,
} as const;

/**
 * Stale-While-Revalidate durations in seconds
 */
export const SWRDurations = {
  /** SWR for 1 minute after stale */
  short: 60,
  /** SWR for 5 minutes after stale */
  medium: 5 * 60,
  /** SWR for 1 hour after stale */
  long: 60 * 60,
} as const;

interface CacheConfig {
  /** Max age in seconds */
  maxAge?: number;
  /** Stale-while-revalidate duration in seconds */
  swr?: number;
  /** Whether the response can be cached by shared caches (CDN) */
  public?: boolean;
  /** Disable caching entirely */
  noStore?: boolean;
  /** Must revalidate after stale */
  mustRevalidate?: boolean;
}

/**
 * Generate Cache-Control header value from config
 */
export function generateCacheControl(config: CacheConfig): string {
  if (config.noStore) {
    return 'no-store, no-cache, must-revalidate';
  }

  const directives: string[] = [];

  // Public vs private
  directives.push(config.public ? 'public' : 'private');

  // Max age
  if (config.maxAge !== undefined && config.maxAge > 0) {
    directives.push(`max-age=${config.maxAge}`);
  }

  // Stale-while-revalidate
  if (config.swr !== undefined && config.swr > 0) {
    directives.push(`stale-while-revalidate=${config.swr}`);
  }

  // Must revalidate
  if (config.mustRevalidate) {
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}

/**
 * Add cache headers to a NextResponse
 */
export function withCacheHeaders<T>(
  data: T,
  config: CacheConfig,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status });

  response.headers.set('Cache-Control', generateCacheControl(config));

  // Add ETag support for conditional requests
  if (config.maxAge && config.maxAge > 0) {
    const etag = `"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32)}"`;
    response.headers.set('ETag', etag);
  }

  return response;
}

/**
 * Common cache configurations for different data types
 */
export const CachePresets = {
  /**
   * User-specific data (profile, settings)
   * Private, short cache with SWR
   */
  userPrivate: {
    maxAge: CacheDurations.short,
    swr: SWRDurations.short,
    public: false,
  },

  /**
   * List data (requests, companies)
   * Private, short cache
   */
  listData: {
    maxAge: CacheDurations.short,
    swr: SWRDurations.short,
    public: false,
  },

  /**
   * Analytics/aggregated data
   * Private, medium cache with SWR
   */
  analytics: {
    maxAge: CacheDurations.medium,
    swr: SWRDurations.medium,
    public: false,
  },

  /**
   * Reference data (templates, workflows)
   * Private, medium cache
   */
  referenceData: {
    maxAge: CacheDurations.medium,
    swr: SWRDurations.long,
    public: false,
  },

  /**
   * Static data (enums, config)
   * Public, long cache
   */
  staticData: {
    maxAge: CacheDurations.long,
    swr: SWRDurations.long,
    public: true,
  },

  /**
   * No caching - for mutations, sensitive data
   */
  noCache: {
    noStore: true,
  },
} as const;

/**
 * In-memory cache for expensive operations
 * Use with caution - only for single-instance deployments
 */
class SimpleMemoryCache {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all cached values matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const memoryCache = new SimpleMemoryCache();

/**
 * Cache key generators for common entities
 */
export const CacheKeys = {
  company: (id: string) => `company:${id}`,
  companyRequests: (id: string) => `company:${id}:requests`,
  companyServices: (id: string) => `company:${id}:services`,
  userProfile: (id: string) => `user:${id}:profile`,
  userNotifications: (id: string) => `user:${id}:notifications`,
  templates: () => 'templates:all',
  workflows: () => 'workflows:all',
  analytics: (type: string) => `analytics:${type}`,
} as const;

/**
 * Wrap an async function with caching
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  memoryCache.set(key, data, ttlSeconds);

  return data;
}
