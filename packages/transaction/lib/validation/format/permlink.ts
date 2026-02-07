const PERMLINK_REGEX = /^[a-z0-9-]{1,255}$/;

/**
 * Validates permlink format.
 * Rules: 1-255 chars, lowercase alphanumeric + hyphens only.
 */
export function isValidPermlinkFormat(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return PERMLINK_REGEX.test(permlink);
}
