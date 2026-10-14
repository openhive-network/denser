/**
 * Least-recently-used cache of highlighted blocks, bounded by entry count and by total size in
 * UTF-16 code units (keys included, since a key holds the block's source).
 *
 * Keyed by the grammar plus the exact source text: the Map hashes that content, and comparing the
 * full key on lookup means two different blocks can never share an entry, which a short digest
 * could not guarantee for crafted input. A cached `null` records a block that failed to highlight,
 * so a hostile block is not retried on every render.
 */
export class HighlightCache {
    private readonly entries = new Map<string, string | null>();
    private size = 0;

    public constructor(
        private readonly maxEntries: number,
        private readonly maxCodeUnits: number
    ) {}

    public get(lang: string, code: string): string | null | undefined {
        const key = HighlightCache.key(lang, code);
        if (!this.entries.has(key)) return undefined;
        const value = this.entries.get(key) ?? null;
        this.entries.delete(key);
        this.entries.set(key, value);
        return value;
    }

    public set(lang: string, code: string, value: string | null): void {
        const key = HighlightCache.key(lang, code);
        const weight = HighlightCache.weight(key, value);
        if (weight > this.maxCodeUnits) return;
        this.remove(key);
        this.entries.set(key, value);
        this.size += weight;
        while (this.entries.size > this.maxEntries || this.size > this.maxCodeUnits) {
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined) break;
            this.remove(oldest);
        }
    }

    private remove(key: string): void {
        if (!this.entries.has(key)) return;
        this.size -= HighlightCache.weight(key, this.entries.get(key) ?? null);
        this.entries.delete(key);
    }

    private static key(lang: string, code: string): string {
        return `${lang}\n${code}`;
    }

    private static weight(key: string, value: string | null): number {
        return key.length + (value?.length ?? 0);
    }
}
