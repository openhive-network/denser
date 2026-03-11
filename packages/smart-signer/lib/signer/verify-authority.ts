import { TTransactionPackType, ApiTransaction } from '@hiveio/wax';
import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';

const logger = getLogger('app');

/** Network/transient error patterns that should NOT be misreported as authority failures */
const NETWORK_ERROR_PATTERNS = [
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /timeout/i,
  /fetch failed/i,
  /network\s+(error|failure|request|unavailable)/i,
  /abort/i,
  /socket hang up/i
];

function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Verify authority of a signed transaction on chain.
 * Throws user-friendly errors for known failure cases, and re-throws
 * network errors as-is to avoid misattribution.
 *
 * @param txApiJson - Transaction in API JSON format (from txBuilder.toApiJson())
 * @param pack - Transaction pack type
 * @param keyType - The key type being verified (e.g. 'posting', 'active')
 * @param signerName - Name of the signer for logging (e.g. 'Google Drive', 'Keychain')
 */
export async function verifyAuthorityOrThrow(
  txApiJson: ApiTransaction,
  pack: TTransactionPackType,
  keyType: string,
  signerName: string
): Promise<void> {
  try {
    await (await getChain()).api.database_api.verify_authority({
      trx: txApiJson,
      pack
    });
  } catch (error) {
    logger.error('%s key authority verification failed: %s', signerName, error instanceof Error ? error.message : String(error));
    const msg = error instanceof Error ? error.message : String(error);

    // Re-throw network errors as-is — don't misattribute them as authority failures
    if (isNetworkError(msg)) {
      throw error;
    }

    if (/unknown key/i.test(msg)) {
      throw new Error('Account not found on the blockchain');
    }
    throw new Error(`The provided key does not have ${keyType} authority for this account`);
  }
}
