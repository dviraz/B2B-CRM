import { cache, cacheKeys, cacheTTL, invalidateCache } from '@/lib/cache';

describe('Caching Utilities', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('cache', () => {
    it('should store and retrieve values', () => {
      cache.set('test-key', { value: 42 });
      const result = cache.get<{ value: number }>('test-key');

      expect(result).toEqual({ value: 42 });
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      jest.useFakeTimers();

      cache.set('short-lived', 'value', 1); // 1 second TTL

      expect(cache.get('short-lived')).toBe('value');

      jest.advanceTimersByTime(2000); // 2 seconds

      expect(cache.get('short-lived')).toBeNull();

      jest.useRealTimers();
    });

    it('should delete keys', () => {
      cache.set('to-delete', 'value');
      expect(cache.get('to-delete')).toBe('value');

      cache.delete('to-delete');
      expect(cache.get('to-delete')).toBeNull();
    });

    it('should delete keys by pattern', () => {
      cache.set('prefix:1', 'value1');
      cache.set('prefix:2', 'value2');
      cache.set('other:1', 'value3');

      const count = cache.deletePattern('prefix:*');

      expect(count).toBe(2);
      expect(cache.get('prefix:1')).toBeNull();
      expect(cache.get('prefix:2')).toBeNull();
      expect(cache.get('other:1')).toBe('value3');
    });

    it('should check if key exists', () => {
      cache.set('exists', 'value');

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('does-not-exist')).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size()).toBe(0);
    });

    it('should get or set values', async () => {
      const factory = jest.fn().mockResolvedValue('computed-value');

      // First call should invoke factory
      const result1 = await cache.getOrSet('computed', factory);
      expect(result1).toBe('computed-value');
      expect(factory).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cache.getOrSet('computed', factory);
      expect(result2).toBe('computed-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('cacheKeys', () => {
    it('should generate analytics key', () => {
      expect(cacheKeys.analytics('30d')).toBe('analytics:30d');
      expect(cacheKeys.analytics()).toBe('analytics:all');
    });

    it('should generate company key', () => {
      expect(cacheKeys.company('123')).toBe('company:123');
    });

    it('should generate requests key', () => {
      expect(cacheKeys.requests('company-1', 'status=active')).toBe(
        'requests:company-1:status=active'
      );
    });

    it('should generate team members key', () => {
      expect(cacheKeys.teamMembers()).toBe('team-members:list');
    });
  });

  describe('cacheTTL', () => {
    it('should have correct TTL values', () => {
      expect(cacheTTL.short).toBe(30);
      expect(cacheTTL.medium).toBe(300);
      expect(cacheTTL.long).toBe(900);
      expect(cacheTTL.hour).toBe(3600);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate exact keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      invalidateCache(['key1']);

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should invalidate pattern keys', () => {
      cache.set('requests:company-1:all', 'value1');
      cache.set('requests:company-2:all', 'value2');

      invalidateCache(['requests:*']);

      expect(cache.get('requests:company-1:all')).toBeNull();
      expect(cache.get('requests:company-2:all')).toBeNull();
    });
  });
});
