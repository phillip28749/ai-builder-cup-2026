// Cache immutable owner assets in memory only. Never persist private media to disk.
const cache = new Map<string, { blob: Blob; expires: number }>();
const urls = new WeakMap<Blob, { url: string; references: number }>();

export function retainMediaUrl(blob: Blob) {
  let entry = urls.get(blob);
  if (!entry) {
    entry = { url: URL.createObjectURL(blob), references: 0 };
    urls.set(blob, entry);
  }
  entry.references++;
  let released = false;
  return {
    url: entry.url,
    release: () => {
      if (released) return;
      released = true;
      if (--entry.references === 0) {
        URL.revokeObjectURL(entry.url);
        urls.delete(blob);
      }
    },
  };
}
const cacheLeases = new Map<string, () => void>();
function remove(key: string) {
  const entry = cache.get(key);
  if (entry) bytes -= entry.blob.size;
  cache.delete(key);
  cacheLeases.get(key)?.();
  cacheLeases.delete(key);
}
export function peekMediaBlob(key: string) {
  const entry = cache.get(key);
  if (!entry) return;
  if (entry.expires <= Date.now()) {
    remove(key);
    return;
  }
  return { blob: entry.blob, url: urls.get(entry.blob)!.url };
}
const pending = new Map<string, Promise<Blob>>();
const maxBytes = 32 * 1024 * 1024;
let bytes = 0;
let epoch = 0;
let running = 0;
const queue: Array<() => void> = [];

export function clearMediaCache() {
  epoch++;
  for (const key of cache.keys()) remove(key);
  pending.clear();
  bytes = 0;
}

async function limited(load: () => Promise<Blob>) {
  await new Promise<void>((resolve) => {
    const start = () => {
      running++;
      resolve();
    };
    if (running < 4) start();
    else queue.push(start);
  });
  try {
    return await load();
  } finally {
    running--;
    queue.shift()?.();
  }
}

export function cachedMediaBlob(
  key: string,
  load: () => Promise<Blob>,
): Promise<Blob> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    cache.delete(key);
    cache.set(key, entry);
    return Promise.resolve(entry.blob);
  }
  if (entry) {
    remove(key);
  }
  const existing = pending.get(key);
  if (existing) return existing;
  const started = epoch;
  const request = limited(async () => {
    if (started !== epoch)
      throw new Error("Account changed. Reopen your media library.");
    return load();
  })
    .then((blob) => {
      if (started === epoch && blob.size <= maxBytes) {
        while (
          cache.size &&
          (bytes + blob.size > maxBytes || cache.size >= 64)
        ) {
          const oldest = cache.keys().next().value!;
          remove(oldest);
        }
        cache.set(key, { blob, expires: Date.now() + 5 * 60_000 });
        cacheLeases.set(key, retainMediaUrl(blob).release);
        bytes += blob.size;
      }
      return blob;
    })
    .finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
  pending.set(key, request);
  return request;
}
