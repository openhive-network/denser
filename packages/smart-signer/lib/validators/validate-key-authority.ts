import { getChain } from '@hive/common-hiveio-packages';
import { getLogger } from '@ui/lib/logging';
import type { KeyType } from '@smart-signer/types/common';
import { classifyKeyRefusal, findKeyRoles, type KeyRefusal } from '@smart-signer/lib/validators/key-role';
import { findKeyRefusalHint, KEY_ROLE_HINTS, type KeyHint } from '@smart-signer/lib/validators/key-role-hint';

const logger = getLogger('app');

/**
 * Reads what the chain tells about `wif` offered as `username`'s `keyType` key. The accounts holding
 * the key (`account_by_key_api.get_key_references`), and their authorities, are looked up only for a
 * key that is none of the account's own, and only when `lookUpHolders`.
 */
async function findKeyRefusal(
  username: string,
  keyType: KeyType,
  wif: string,
  lookUpHolders: boolean
): Promise<KeyRefusal | null> {
  const hiveChain = await getChain();
  const publicKey = hiveChain.calculatePublicKey(wif);
  const {
    accounts: [account]
  } = await hiveChain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
  if (!account) return null;
  if (!lookUpHolders || findKeyRoles(account, publicKey).length > 0) {
    return classifyKeyRefusal(account, publicKey, keyType, []);
  }
  const {
    accounts: [holderNames = []]
  } = await hiveChain.api.account_by_key_api.get_key_references({ keys: [publicKey] });
  const otherHolderNames = holderNames.filter((name) => name !== username);
  if (otherHolderNames.length === 0) return classifyKeyRefusal(account, publicKey, keyType, []);
  const { accounts: keyHolders } = await hiveChain.api.database_api.find_accounts({
    accounts: otherHolderNames,
    delayed_votes_active: false
  });
  return classifyKeyRefusal(account, publicKey, keyType, keyHolders);
}

/**
 * Checks, before anything is signed or stored, that a valid WIF key is not the account's posting key when
 * `keyType` asks for its active one, nor its active or owner key when `keyType` asks for its posting
 * one. Resolves with a smart-signer translation key describing the mismatch, or null when the key
 * may be right: the account's authorities could not be read, the key is not one of the account's
 * at all, or it holds the role asked for. Those cases are left to the on-chain authority
 * verification that follows signing, whose refusal `findRegistrationKeyRoleHint` maps to the same hint.
 */
export async function validateKeyAuthority(
  username: string,
  keyType: KeyType,
  wif: string
): Promise<string | null> {
  try {
    const refusal = await findKeyRefusal(username, keyType, wif, false);
    return refusal ? KEY_ROLE_HINTS[keyType] : null;
  } catch (error) {
    logger.error(error, 'Cannot read the account authorities; leaving the key to on-chain verification');
    return null;
  }
}

/**
 * `validateKeyAuthority` for a key to store in safe storage, which in Direct Authority Mode
 * (`strict`) takes only the account's own keys: there, a key another account holds is refused too,
 * with a hint naming that account and, when the account's `keyType` authority lists it in
 * `account_auths` and the key is of that account's own `keyType` authority, saying the key is taken
 * with the mode off. Resolves with null when the key may be
 * right, also when the chain cannot be read or nobody is known to hold the key; safe storage's own
 * verification, whose refusal `describeRefusedKey` explains, decides then.
 */
export async function validateSafeStorageKey(
  username: string,
  keyType: KeyType,
  wif: string,
  strict: boolean
): Promise<KeyHint | null> {
  try {
    const refusal = await findKeyRefusal(username, keyType, wif, strict);
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
    const refusal = await findKeyRefusal(username, keyType, wif, true);
    if (!refusal || refusal.kind === 'own-other-role') return fallback;
    return findKeyRefusalHint(refusal, username, keyType, strict) ?? fallback;
  } catch (error) {
    logger.error(error, 'Cannot read who holds the refused key; showing the role hint');
    return fallback;
  }
}
