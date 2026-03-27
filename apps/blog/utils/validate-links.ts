import { isHiveAccountNameValid } from '@hive/transaction';

export function isPermlinkValid(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return /^[a-z0-9-]{1,255}$/.test(permlink);
}

/**
 * Validates that p2 route parameter starts with @ or %40 (encoded @).
 * Used for post URLs: /[param]/@[username]/[permlink]
 * Valid: @username, %40username
 * Invalid: username (missing @)
 */
export function isValidUserParam(param: string | undefined): boolean {
  if (!param) return false;
  return param.startsWith('@') || param.startsWith('%40');
}

/**
 * Validates that a route param starts with @ or %40 and strips the prefix.
 * Returns the clean username, or null if the param is not a valid user route.
 *
 * This combines prefix validation and stripping in one step to prevent
 * the common bug where pages strip %40 but forget @ (or vice versa).
 */
export function extractUsernameFromParam(param: string): string | null {
  if (param.startsWith('%40')) return param.slice(3);
  if (param.startsWith('@')) return param.slice(1);
  return null;
}

// Re-export from @hive/transaction for backwards compatibility
export { isHiveAccountNameValid as isUsernameValid };
