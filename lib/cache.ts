type CacheEntry<T> = { value: T; expiresAt: number; staleAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): { value: T; isStale: boolean } | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return { value: entry.value, isStale: Date.now() > entry.staleAt };
}

export function setCached<T>(key: string, value: T, staleMs: number, hardExpireMs: number): void {
  store.set(key, {
    value,
    staleAt: Date.now() + staleMs,
    expiresAt: Date.now() + hardExpireMs,
  });
}
