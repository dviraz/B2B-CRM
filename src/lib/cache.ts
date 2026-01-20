/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis or a dedicated caching service
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (default: 60)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all values matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or set - returns cached value or computes and caches new value
   */
  async getOrSet<T>(
    key: string,
    factory: () => T | Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cache = new MemoryCache();

// Cache key generators for common patterns
export const cacheKeys = {
  analytics: (period?: string) => `analytics:${period || 'all'}`,
  mrr: () => 'analytics:mrr',
  company: (id: string) => `company:${id}`,
  companyList: (filters?: string) => `companies:list:${filters || 'all'}`,
  requests: (companyId?: string, filters?: string) =>
    `requests:${companyId || 'all'}:${filters || 'default'}`,
  request: (id: string) => `request:${id}`,
  teamMembers: () => 'team-members:list',
  templates: (companyId?: string) => `templates:${companyId || 'global'}`,
  workflows: (companyId?: string) => `workflows:${companyId || 'global'}`,
};

// Cache TTL presets in seconds
export const cacheTTL = {
  short: 30, // 30 seconds
  medium: 300, // 5 minutes
  long: 900, // 15 minutes
  hour: 3600, // 1 hour
};

/**
 * Decorator to cache function results
 */
export function cached<T>(
  keyFn: (...args: unknown[]) => string,
  ttlSeconds: number = cacheTTL.medium
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyFn(...args);
      const cachedValue = cache.get<T>(key);

      if (cachedValue !== null) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttlSeconds);
      return result;
    };

    return descriptor;
  };
}

/**
 * Helper to invalidate cache on mutations
 */
export function invalidateCache(patterns: string[]): void {
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      cache.deletePattern(pattern);
    } else {
      cache.delete(pattern);
    }
  }
}

/**
 * Cache middleware for API routes
 */
export function withCache<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number = cacheTTL.medium
): Promise<T> {
  return cache.getOrSet(key, factory, ttlSeconds);
}
