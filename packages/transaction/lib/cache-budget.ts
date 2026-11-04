interface IBudgetEntry {
  size: number;
  evict: () => void;
}

/**
 * A size cap shared by any number of caches: the summed size of the entries they hold never exceeds
 * `maxSize`. When an entry does not fit, the least recently used entries go first, whichever cache
 * holds them. Each entry is identified by its own object (the token).
 */
export class CacheBudget {
  private readonly entries = new Map<object, IBudgetEntry>();
  private totalSize = 0;

  constructor(readonly maxSize: number) {}

  /** The summed size of the entries currently charged. */
  get usedSize(): number {
    return this.totalSize;
  }

  /**
   * Charges `size` for `token` as the most recently used entry, calling `evict` of the entries
   * removed to make room. Returns false, charging nothing, when `size` alone exceeds `maxSize`.
   */
  admit(token: object, size: number, evict: () => void): boolean {
    this.release(token);
    if (size > this.maxSize) return false;

    this.entries.set(token, { size, evict });
    this.totalSize += size;
    for (const [oldestToken, oldest] of this.entries) {
      if (this.totalSize <= this.maxSize) break;
      this.release(oldestToken);
      oldest.evict();
    }
    return true;
  }

  /** Marks `token` as the most recently used entry. */
  touch(token: object): void {
    const entry = this.entries.get(token);
    if (!entry) return;
    this.entries.delete(token);
    this.entries.set(token, entry);
  }

  /** Stops charging `token`, without calling its `evict`. */
  release(token: object): void {
    const entry = this.entries.get(token);
    if (!entry) return;
    this.entries.delete(token);
    this.totalSize -= entry.size;
  }
}
