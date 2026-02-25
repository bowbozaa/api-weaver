interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

const cache = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(cache.entries())) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

export function getFromCache<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    misses++;
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    misses++;
    return null;
  }
  hits++;
  return entry.value as T;
}

export function setInCache<T = unknown>(key: string, value: T, ttlMs: number = 60000): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(key: string): boolean {
  return cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
  hits = 0;
  misses = 0;
}

export function getCacheStats(): CacheStats {
  cleanupExpired();
  const total = hits + misses;
  return {
    hits,
    misses,
    size: cache.size,
    hitRate: total > 0 ? hits / total : 0,
  };
}
