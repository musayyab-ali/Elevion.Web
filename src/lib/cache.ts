/**
 * Tiny in-memory cache for read-only API calls that many components make at the same time (menu, home sections, footer):
 * callers asking while a request is already running share that one request, and the answer is reused for a short time.
 * A failed request is never cached.
 */

type Entry<T> = { at: number; value?: T; promise?: Promise<T> };

const store = new Map<string, Entry<unknown>>();

export function cachedRequest<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit?.promise) return hit.promise;
  if (hit && hit.value !== undefined && now - hit.at < ttlMs) return Promise.resolve(hit.value);

  const promise = load().then(
    (value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    },
    (error) => {
      store.delete(key);
      throw error;
    },
  );
  store.set(key, { at: now, promise });
  return promise;
}

/** Forget cached answers (all of them, or those whose key starts with the prefix), e.g. after the shop's data changed. */
export function clearRequestCache(prefix?: string) {
  for (const key of Array.from(store.keys())) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
}
