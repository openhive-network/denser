import type { KeyAuthorityType } from '@hiveio/hb-auth';
import { getChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@ui/lib/logging';
import { findKeyRoles } from '@smart-signer/lib/validators/key-role';
import type { SharedKeyLookup } from '@smart-signer/lib/signer/safe-storage-registration';

const logger = getLogger('app');

/** The key types a session holds keys of; the owner key is never one of them. */
const SESSION_KEY_TYPES: readonly KeyAuthorityType[] = ['posting', 'active'];

/**
 * Resolves with the other key types (posting or active) whose authority lists the public key of
 * `wif`, entered as `username`'s `keyType` key: an account using one key pair for both. Empty when
 * it is no other type's key, or when the account's authorities cannot be read, so the key then
 * counts for `keyType` only.
 */
export async function findSharedKeyTypes(
  username: string,
  keyType: string,
  wif: string
): Promise<KeyAuthorityType[]> {
  try {
    const hiveChain = await getChain();
    const publicKey = hiveChain.calculatePublicKey(wif);
    const {
      accounts: [account]
    } = await hiveChain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
    if (!account) return [];

    const roles = findKeyRoles(account, publicKey);
    return SESSION_KEY_TYPES.filter((type) => type !== keyType && roles.includes(type));
  } catch (error) {
    logger.error(error, 'Cannot read the account authorities; the key counts for its own key type only');
    return [];
  }
}

/** Finds the key types a key entered in safe storage is shared with; logs those it cannot be registered for. */
export const SHARED_KEY_LOOKUP: SharedKeyLookup = {
  findSharedKeyTypes,
  onSharedKeyError: (error, keyType) =>
    logger.error(error, 'Cannot register the key as the %s key too; it is held for its own key type only', keyType)
};
