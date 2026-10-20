import { isHiveAccountNameValid } from '@transaction/lib/validate-hive-account';
import { postAuthorFromParam, postAuthorKind } from '@/blog/features/lite-account/lite-did';

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
 * Returns the clean (URL-decoded) username, or null if the param is not a valid user route.
 *
 * This combines prefix validation and stripping in one step to prevent
 * the common bug where pages strip %40 but forget @ (or vice versa).
 */
export function extractUsernameFromParam(param: string): string | null {
  return postAuthorFromParam(param);
}

/**
 * The Hive account of a profile route's param, as `extractUsernameFromParam`, or null for a lite
 * account DID or another `did:` form: for the profile pages a lite account does not have.
 */
export function extractHiveAccountFromParam(param: string): string | null {
  const username = extractUsernameFromParam(param);
  return username !== null && postAuthorKind(username) === 'account' ? username : null;
}

/**
 * Validates the author of a post route: a Hive account name, or a lite account DID
 * (`did:lite:<name>`), which a lite-aware API node resolves. Any other `did:` form is invalid.
 */
export async function isPostAuthorValid(author: string): Promise<boolean> {
  const kind = postAuthorKind(author);
  if (kind === 'account') return isHiveAccountNameValid(author);
  return kind === 'lite';
}

export { postAuthorFromParam } from '@/blog/features/lite-account/lite-did';

// Re-export from @hive/transaction for backwards compatibility
export { isHiveAccountNameValid as isUsernameValid };
