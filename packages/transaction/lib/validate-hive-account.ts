import { getChain } from './chain';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('validate-hive-account');

/**
 * Regex fallback for Hive account name validation.
 * Used when wax WASM fails due to concurrent access.
 *
 * NOTE: This regex is NOT an accurate implementation of Hive account name
 * validation rules. It's intentionally permissive as a fallback when wax
 * is unavailable. Some technically invalid names may pass this check, but
 * they will be safely rejected at a later stage (e.g., by the Hive API or
 * image host returning 404). This is just cheap/fast input sanitization.
 *
 * @see https://gitlab.syncad.com/hive/wax/-/issues/140
 */
export function isHiveAccountNameValidFallback(accountName: string): boolean {
  if (accountName.length < 3 || accountName.length > 16) return false;

  // Must contain only lowercase letters, numbers, dots, and hyphens
  if (!/^[a-z0-9.-]+$/.test(accountName)) return false;

  // Must start with a letter
  if (!/^[a-z]/.test(accountName)) return false;

  // Cannot end with hyphen or dot
  if (/[.-]$/.test(accountName)) return false;

  // No consecutive dots (consecutive hyphens ARE valid, e.g., 'a--a')
  if (/\.\./.test(accountName)) return false;

  // Each segment (separated by dots) must start with a letter
  const segments = accountName.split('.');
  for (const segment of segments) {
    if (segment.length === 0) return false;
    if (!/^[a-z]/.test(segment)) return false;
  }

  return true;
}

/**
 * Validates Hive account names using wax library with regex fallback.
 *
 * TEMPORARY WORKAROUND: The wax WASM module isn't thread-safe - concurrent
 * Server Component requests cause "memory access out of bounds" errors.
 * We catch WASM errors and fall back to regex validation until wax is fixed.
 *
 * @see https://gitlab.syncad.com/hive/denser/-/issues/758
 * @see https://gitlab.syncad.com/hive/wax/-/issues/140
 *
 * TODO: Remove regex fallback once wax thread-safety is resolved
 */
export async function isHiveAccountNameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;

  try {
    const chain = await getChain();
    return chain.isValidAccountName(accountName);
  } catch (error) {
    logger.warn({ err: error, accountName }, 'WASM isValidAccountName failed, using regex fallback');
    return isHiveAccountNameValidFallback(accountName);
  }
}
