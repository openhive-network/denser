import { getChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@ui/lib/logging';
import { KeyType } from '@smart-signer/types/common';
import { isKeyOfOtherRole } from '@smart-signer/lib/validators/key-role';

const logger = getLogger('app');

const KEY_ROLE_MISMATCH_MESSAGES: Record<KeyType, string> = {
  [KeyType.active]: 'login_form.zod_error.posting_key_for_active',
  [KeyType.posting]: 'login_form.zod_error.active_key_for_posting'
};

/**
 * Checks, before anything is signed or stored, that a valid WIF key is not the account's posting key when
 * `keyType` asks for its active one, nor its active or owner key when `keyType` asks for its posting
 * one. Resolves with a smart-signer translation key describing the mismatch, or null when the key
 * may be right: the account's authorities could not be read, the key is not one of the account's
 * at all, or it holds the role asked for. Those cases are left to the on-chain authority
 * verification that follows signing.
 */
export async function validateKeyAuthority(
  username: string,
  keyType: KeyType,
  wif: string
): Promise<string | null> {
  try {
    const hiveChain = await getChain();
    const publicKey = hiveChain.calculatePublicKey(wif);
    const {
      accounts: [account]
    } = await hiveChain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
    if (!account) return null;

    return isKeyOfOtherRole(account, publicKey, keyType) ? KEY_ROLE_MISMATCH_MESSAGES[keyType] : null;
  } catch (error) {
    logger.error(error, 'Cannot read the account authorities; leaving the key to on-chain verification');
    return null;
  }
}
