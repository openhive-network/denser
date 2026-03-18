import { getChain, resetTransactionChain } from './chain';
import { isWasmMemoryError, resetChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('validate-hive-account');

/**
 * Hive account name format regex (from protocol).
 * Accounts are 3-16 characters, start with letter, contain only lowercase letters, digits, dots, and hyphens.
 */
const ACCOUNT_NAME_REGEX = /^[a-z][a-z0-9.-]{2,15}$/;

/**
 * Fallback validation using regex when WASM is unavailable.
 * This checks format only - it cannot verify all protocol rules that WASM checks,
 * but it's sufficient for basic format validation.
 *
 * WORKAROUND: Used when WASM memory corrupts after extended uptime.
 * See: https://gitlab.syncad.com/hive/wax/-/issues/161
 */
function validateAccountNameFormat(name: string): boolean {
  if (typeof name !== 'string') return false;
  if (!ACCOUNT_NAME_REGEX.test(name)) return false;

  // Additional rules from Hive protocol:
  // - No consecutive dots or hyphens
  // - Cannot end with dot or hyphen
  if (name.includes('..') || name.includes('--')) return false;
  if (name.endsWith('.') || name.endsWith('-')) return false;

  // Each segment between dots must be at least 3 chars
  const segments = name.split('.');
  for (const segment of segments) {
    if (segment.length < 3) return false;
  }

  return true;
}

/**
 * Validates Hive account names using the WAX library.
 * Falls back to regex validation if WASM encounters memory errors.
 *
 * Note: This validates format only, not existence on the blockchain.
 */
export async function isHiveAccountNameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;

  try {
    const chain = await getChain();
    return chain.isValidAccountName(accountName);
  } catch (error) {
    if (isWasmMemoryError(error)) {
      // WORKAROUND: WASM memory corruption after extended uptime (~6 days).
      // Reset chain singleton so next request gets fresh WASM.
      // Fall back to regex validation for this request.
      // See: https://gitlab.syncad.com/hive/wax/-/issues/161
      logger.error(error, 'WASM memory error in isValidAccountName - resetting chain, using regex fallback');
      resetChain();
      resetTransactionChain();
      return validateAccountNameFormat(accountName);
    }

    logger.error(error, 'Unexpected error in isValidAccountName');
    throw error;
  }
}
