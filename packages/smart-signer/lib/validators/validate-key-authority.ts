import type { ApiAuthority } from '@hiveio/wax';
import { getChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@ui/lib/logging';
import { KeyType } from '@smart-signer/types/common';

const logger = getLogger('app');

const holdsKey = (authority: ApiAuthority, publicKey: string) =>
  authority.key_auths.some(({ 0: key }) => key === publicKey);

/**
 * Checks, before anything is signed, that a valid WIF key is not the account's posting key when
 * `keyType` asks for its active one. Resolves with a smart-signer translation key describing the
 * mismatch, or null when the key may be right: the account's authorities could not be read, the
 * key is not one of the account's at all, or it holds the active (or owner) role. Those cases are
 * left to the on-chain authority verification that follows signing.
 */
export async function validateKeyAuthority(
  username: string,
  keyType: KeyType,
  wif: string
): Promise<string | null> {
  if (keyType !== KeyType.active) return null;

  try {
    const hiveChain = await getChain();
    const publicKey = hiveChain.calculatePublicKey(wif);
    const {
      accounts: [account]
    } = await hiveChain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
    if (!account) return null;

    const isPostingOnly =
      holdsKey(account.posting, publicKey) &&
      !holdsKey(account.active, publicKey) &&
      !holdsKey(account.owner, publicKey);
    return isPostingOnly ? 'login_form.zod_error.posting_key_for_active' : null;
  } catch (error) {
    logger.error(error, 'Cannot read the account authorities; leaving the key to on-chain verification');
    return null;
  }
}
