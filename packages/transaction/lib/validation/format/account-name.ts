import { isHiveAccountNameValid } from '../../validate-hive-account';

/**
 * Validates account name format using WASM (offline, no API call).
 * Rules: 3-16 chars, RFC 1035 dot-separated segments, lowercase only.
 * Falls back to regex validation if WASM encounters memory errors.
 */
export async function isValidAccountNameFormat(name: string): Promise<boolean> {
  if (typeof name !== 'string') return false;
  return isHiveAccountNameValid(name);
}
