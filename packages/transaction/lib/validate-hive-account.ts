import { getChain, resetTransactionChain } from './chain';
import { isWasmMemoryError, resetChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@hive/ui/lib/logging';
import { checkAccountNameFormat } from '@hive/ui/lib/account-name-rules';

const logger = getLogger('validate-hive-account');

/**
 * Fallback validation using regex when WASM is unavailable.
 * This checks format only, applying the same rules as wax `isValidAccountName`.
 *
 * WORKAROUND: Used when WASM memory corrupts after extended uptime.
 * See: https://gitlab.syncad.com/hive/wax/-/issues/161
 */
export function validateAccountNameFormat(name: string): boolean {
  if (typeof name !== 'string') return false;
  return checkAccountNameFormat(name) === null;
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
