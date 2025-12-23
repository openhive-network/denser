import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Safely parse JSON with error handling and logging.
 * Does not log the raw JSON value to avoid exposing sensitive data.
 *
 * @param json - The JSON string to parse (can be null/undefined)
 * @param fallback - The fallback value to return on parse failure
 * @param context - A descriptor for logging (e.g., storage key name)
 * @returns The parsed value or fallback
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
  context: string
): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse JSON for: %s', context);
    return fallback;
  }
}
