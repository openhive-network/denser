import { getChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@ui/lib/logging';
import type { KeyType } from '@smart-signer/types/common';
import { classifyKeyRefusal, findKeyRoles, type KeyRefusal } from '@smart-signer/lib/validators/key-role';
import { findKeyRefusalHint, type KeyHint } from '@smart-signer/lib/validators/key-role-hint';

const logger = getLogger('app');

/**
 * Reads what the chain tells about `wif` offered as `username`'s `keyType` key. The accounts holding
 * the key (`account_by_key_api.get_key_references`), and their authorities, are looked up only for a
 * key that is none of the account's own; a key they tell nobody else holds is `unheld`, which no
 * authority of the account takes.
 */
async function findKeyRefusal(username: string, keyType: KeyType, wif: string): Promise<KeyRefusal | null> {
  const hiveChain = await getChain();
  const publicKey = hiveChain.calculatePublicKey(wif);
  const {
    accounts: [account]
  } = await hiveChain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
  if (!account) return null;
  if (findKeyRoles(account, publicKey).length > 0) {
    return classifyKeyRefusal(account, publicKey, keyType, []);
  }
  const {
    accounts: [holderNames = []]
  } = await hiveChain.api.account_by_key_api.get_key_references({ keys: [publicKey] });
  const otherHolderNames = holderNames.filter((name) => name !== username);
  if (otherHolderNames.length === 0) return { kind: 'unheld' };
  const { accounts: keyHolders } = await hiveChain.api.database_api.find_accounts({
    accounts: otherHolderNames,
    delayed_votes_active: false
  });
  return classifyKeyRefusal(account, publicKey, keyType, keyHolders);
}

/**
 * Checks, before anything is signed or stored, that a valid WIF key can sign as `username`'s
 * `keyType` key, refusing what safe storage's own verification, or the chain's, would. The
 * account's own key of another role, and a key of none of its authorities that no account holds, are
 * refused with the role hint; another account's key with a hint naming that account, unless the
 * account's `keyType` authority lists that account in `account_auths` and the key is of that
 * account's own `keyType` authority: such a key is taken with Direct Authority Mode (`strict`) off,
 * and refused in it with a hint saying so. Resolves with null when the key may be right, also when
 * the chain cannot be read; the verification that follows decides then (for safe storage,
 * `describeRefusedKey` explains its refusal).
 */
export async function validateSafeStorageKey(
  username: string,
  keyType: KeyType,
  wif: string,
  strict: boolean
): Promise<KeyHint | null> {
  try {
    const refusal = await findKeyRefusal(username, keyType, wif);
    return refusal && findKeyRefusalHint(refusal, username, keyType, strict);
  } catch (error) {
    logger.error(error, 'Cannot read the key authorities; leaving the key to safe storage verification');
    return null;
  }
}

/**
 * The hint for a key safe storage refused as `username`'s `keyType` key: whose key it is when the
 * chain tells it is another account's, else `fallbackHint` (the smart-signer translation key
 * `findRegistrationKeyRoleHint` gives), also when the chain cannot be read.
 */
export async function describeRefusedKey(
  username: string,
  keyType: KeyType,
  wif: string,
  strict: boolean,
  fallbackHint: string
): Promise<KeyHint> {
  const fallback = { key: fallbackHint };
  try {
    const refusal = await findKeyRefusal(username, keyType, wif);
    if (!refusal || refusal.kind === 'own-other-role' || refusal.kind === 'unheld') return fallback;
    return findKeyRefusalHint(refusal, username, keyType, strict) ?? fallback;
  } catch (error) {
    logger.error(error, 'Cannot read who holds the refused key; showing the role hint');
    return fallback;
  }
}
