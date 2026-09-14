// src/lib/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Obtiene el dato en caché si existe (incluso si está stale para renderizado instantáneo).
 */
export function getCached<T>(key: string, maxAgeMs = 60_000): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data;
}

/**
 * Retorna true solo si el dato en caché existe y es fresco (menos de maxAgeMs de antigüedad).
 */
export function isCacheValid(key: string, maxAgeMs = 30_000): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp <= maxAgeMs;
}

/**
 * Guarda un dato en el caché en memoria con la marca de tiempo actual.
 */
export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalida entradas de caché por prefijo o todo el caché.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Ejecuta una petición con soporte SWR inteligente:
 * Si el caché es fresco (< freshMs), retorna inmediatamente sin tocar la red.
 * Si no hay caché o es stale, ejecuta fetcher y actualiza el caché.
 */
export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshMs = 30_000
): Promise<T> {
  const entry = cache.get(key);
  const now = Date.now();

  if (entry && now - entry.timestamp < freshMs) {
    return entry.data as T;
  }

  const freshData = await fetcher();
  setCached(key, freshData);
  return freshData;
}
