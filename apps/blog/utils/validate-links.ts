import { getChain } from '@hive/transaction/lib/chain';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export function isPermlinkValid(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return /^[a-z0-9-]{1,255}$/.test(permlink);
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
export async function isUsernameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;

  try {
    const chain = await getChain();
    return chain.isValidAccountName(accountName);
  } catch (error) {
    // TEMPORARY: Log WASM failure and fall back to regex validation
    // See: https://gitlab.syncad.com/hive/wax/-/issues/140
    logger.warn({ err: error, accountName }, 'WASM isValidAccountName failed, using regex fallback');
    return isUsernameValidRegex(accountName);
  }
}

/**
 * Regex fallback for Hive account name validation.
 * Used when wax WASM fails due to concurrent access.
 *
 * Rules based on Hive blockchain consensus:
 * - 3-16 characters
 * - Lowercase letters, numbers, dots, hyphens only
 * - Must start with a letter
 * - Cannot end with hyphen or dot
 * - Each segment (separated by dots) must start with a letter
 * - No consecutive dots or hyphens
 *
 * TODO: Remove once wax thread-safety is resolved (see wax#140)
 */
function isUsernameValidRegex(accountName: string): boolean {
  if (accountName.length < 3 || accountName.length > 16) return false;

  // Must contain only lowercase letters, numbers, dots, and hyphens
  if (!/^[a-z0-9.-]+$/.test(accountName)) return false;

  // Must start with a letter
  if (!/^[a-z]/.test(accountName)) return false;

  // Cannot end with hyphen or dot
  if (/[.-]$/.test(accountName)) return false;

  // No consecutive dots or hyphens
  if (/[.-]{2}/.test(accountName)) return false;

  // Each segment must start with a letter
  const segments = accountName.split('.');
  for (const segment of segments) {
    if (segment.length === 0) return false;
    if (!/^[a-z]/.test(segment)) return false;
  }

  return true;
}
