const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/**
 * Parses a Sentry traces sample rate from an env value.
 * Returns the default (0.1) when the value is unset, not a number, or outside [0, 1].
 */
export function parseTracesSampleRate(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_TRACES_SAMPLE_RATE;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return DEFAULT_TRACES_SAMPLE_RATE;
  return rate;
}
