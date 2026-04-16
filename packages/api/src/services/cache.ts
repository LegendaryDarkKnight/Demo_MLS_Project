import NodeCache from 'node-cache';

// 5-minute TTL; check expired keys every 10 minutes
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 600, useClones: false });

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, data: T, ttl = 300): void {
  cache.set(key, data, ttl);
}
