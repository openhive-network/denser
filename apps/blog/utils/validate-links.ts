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

// Re-export from @hive/transaction for backwards compatibility
export { isHiveAccountNameValid as isUsernameValid };
