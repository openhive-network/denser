import { createHash } from 'node:crypto';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getChain } from '@hive/common-hiveio-packages';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { matchPostingKey } from '@smart-signer/lib/passkey/posting-key-match';
import { KeyType } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Whether `signatures[keyType]` signs `message` (its SHA-256 digest, as Keychain's `signBuffer` and
 * HiveAuth wallet apps sign) with a key that signs for `chainAccount`'s `keyType` authority on its
 * own: a key member whose weight meets the threshold.
 *
 * @export
 * @param {FullAccount} chainAccount
 * @param {Signatures} signatures
 * @param {string} message
 * @param {KeyType} keyType
 * @returns {Promise<boolean>}
 */
export async function verifyLoginChallenge(
  chainAccount: FullAccount,
  signatures: Signatures,
  message: string,
  keyType: KeyType
): Promise<boolean> {
  const signature = signatures[keyType];
  if (!signature) return false;
  const digest = createHash('sha256').update(message, 'utf8').digest('hex');
  let signingKey: string;
  try {
    signingKey = (await getChain()).getPublicKeyFromSignature(digest, signature);
  } catch (error) {
    logger.warn(error, 'Cannot recover the key of the login signature of %s', chainAccount.name);
    return false;
  }
  // The rule is the passkey sign-in's for its posting key, and holds for any authority
  return matchPostingKey(chainAccount[keyType], [signingKey]) !== null;
}
