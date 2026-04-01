/**
 * Lightweight in-memory performance metrics collector for API calls.
 * Aggregates call counts and durations per API method with rolling windows.
 *
 * Zero overhead when disabled. Gate via DENSER_DEBUG_MEM env var.
 */

interface MethodStats {
  count: number;
  total_ms: number;
  max_ms: number;
  errors: number;
}

interface PerfSnapshot {
  /** Seconds since last reset */
  window_seconds: number;
  /** Total API calls in window */
  total_calls: number;
  /** Total API errors in window */
  total_errors: number;
  /** Total ms spent waiting on API in window */
  total_api_ms: number;
  /** Per-method breakdown sorted by total time */
  methods: Array<{
    api: string;
    count: number;
    total_ms: number;
    avg_ms: number;
    max_ms: number;
    errors: number;
  }>;
}

class PerfCollector {
  private methods = new Map<string, MethodStats>();
  private windowStart = Date.now();
  private _enabled = false;

  enable() {
    this._enabled = true;
    this.reset();
  }

  get enabled() {
    return this._enabled;
  }

  record(api: string, duration_ms: number, isError: boolean) {
    if (!this._enabled) return;

    let stats = this.methods.get(api);
    if (!stats) {
      stats = { count: 0, total_ms: 0, max_ms: 0, errors: 0 };
      this.methods.set(api, stats);
    }
    stats.count++;
    stats.total_ms += duration_ms;
    if (duration_ms > stats.max_ms) stats.max_ms = duration_ms;
    if (isError) stats.errors++;
  }

  /** Returns snapshot and resets counters */
  snapshot(): PerfSnapshot {
    const windowSeconds = (Date.now() - this.windowStart) / 1000;
    let totalCalls = 0;
    let totalErrors = 0;
    let totalApiMs = 0;

    const methods: PerfSnapshot['methods'] = [];
    for (const [api, stats] of this.methods) {
      totalCalls += stats.count;
      totalErrors += stats.errors;
      totalApiMs += stats.total_ms;
      methods.push({
        api,
        count: stats.count,
        total_ms: Math.round(stats.total_ms),
        avg_ms: Math.round(stats.total_ms / stats.count),
        max_ms: Math.round(stats.max_ms),
        errors: stats.errors
      });
    }

    // Sort by total time descending — biggest time consumers first
    methods.sort((a, b) => b.total_ms - a.total_ms);

    const result: PerfSnapshot = {
      window_seconds: Math.round(windowSeconds),
      total_calls: totalCalls,
      total_errors: totalErrors,
      total_api_ms: Math.round(totalApiMs),
      methods
    };

    this.reset();
    return result;
  }

  private reset() {
    this.methods.clear();
    this.windowStart = Date.now();
  }
}

/** Singleton — shared across the process */
export const perfCollector = new PerfCollector();
