/**
 * Discriminated union for existence check results.
 *
 * Distinguishes between "resource doesn't exist" (expected, return 404)
 * and "API call failed" (unexpected, return 500).
 */
export type ExistenceResult<T> =
  | { status: 'exists'; data: T }
  | { status: 'not_found' }
  | { status: 'api_error'; error: Error };
