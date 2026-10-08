export interface IStaleWhileRevalidateOptions<T> {
  /** How long a stored value is served without asking `load` again. */
  freshMs: number;
  /** How long past `freshMs` a value is still served while it is reloaded in the background. */
  staleMs: number;
  /** Upper bound of the summed `sizeOf` of all stored values; least recently used ones go first. */
  maxSize: number;
  sizeOf: (value: T) => number;
  /** Whether a loaded value may be stored (default: every one); a value it rejects only answers its own load. */
  cacheIf?: (value: T) => boolean;
  /** Called when a background reload failed and the stale value keeps being served. */
  onRevalidateError?: (error: unknown, key: string) => void;
  now?: () => number;
}

interface IEntry<T> {
  value: T;
  size: number;
  freshUntil: number;
  staleUntil: number;
}

/**
 * In-process cache with stale-while-revalidate semantics and a size cap.
 *
 * Only values `load` resolved, and `cacheIf` accepts, are stored: a rejected load is never cached,
 * it reaches the caller when no servable value exists, and otherwise leaves the stale value in place
 * until it expires. A resolved value `cacheIf` rejects is handled the same way, except that it is
 * returned to the callers of that load instead of an error.
 * Concurrent loads of one key share a single `load` call.
 */
export class StaleWhileRevalidateCache<T> {
  private readonly entries = new Map<string, IEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private totalSize = 0;
  private readonly now: () => number;

  constructor(private readonly options: IStaleWhileRevalidateOptions<T>) {
    this.now = options.now ?? Date.now;
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    const now = this.now();
    if (!entry || now >= entry.staleUntil) return this.load(key, load);

    // Re-insert so Map order stays least-recently-used first.
    this.entries.delete(key);
    this.entries.set(key, entry);
    if (now >= entry.freshUntil && !this.inFlight.has(key)) {
      this.load(key, load).catch((error) => this.options.onRevalidateError?.(error, key));
    }
    return Promise.resolve(entry.value);
  }

  private load(key: string, load: () => Promise<T>): Promise<T> {
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const loading = load()
      .then((value) => {
        if (this.options.cacheIf?.(value) ?? true) this.store(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, loading);
    return loading;
  }

  private store(key: string, value: T): void {
    this.remove(key);
    const size = this.options.sizeOf(value);
    if (size > this.options.maxSize) return;

    const now = this.now();
    const freshUntil = now + this.options.freshMs;
    this.entries.set(key, { value, size, freshUntil, staleUntil: freshUntil + this.options.staleMs });
    this.totalSize += size;
    for (const oldestKey of this.entries.keys()) {
      if (this.totalSize <= this.options.maxSize) break;
      this.remove(oldestKey);
    }
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.totalSize -= entry.size;
  }
}
