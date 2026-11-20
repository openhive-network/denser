import { createHash } from 'node:crypto';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getChain } from '@hive/common-hiveio-packages';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { matchPostingKey } from '@smart-signer/lib/passkey/posting-key-match';
import { KeyType } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * The key that signs `message` in `signatures[keyType]` (its SHA-256 digest, as Keychain's
 * `signBuffer` and HiveAuth wallet apps sign), when it signs for `chainAccount`'s `keyType`
 * authority on its own: a key member whose weight meets the threshold. Null when it does not, or the
 * signature is missing or tells no key.
 */
export async function verifyLoginChallenge(
  chainAccount: FullAccount,
  signatures: Signatures,
  message: string,
  keyType: KeyType
): Promise<string | null> {
  const signature = signatures[keyType];
  if (!signature) return null;
  const digest = createHash('sha256').update(message, 'utf8').digest('hex');
  let signingKey: string;
  try {
    signingKey = (await getChain()).getPublicKeyFromSignature(digest, signature);
  } catch (error) {
    logger.warn(error, 'Cannot recover the key of the login signature of %s', chainAccount.name);
    return null;
  }
  // The rule is the passkey sign-in's for its posting key, and holds for any authority
  return matchPostingKey(chainAccount[keyType], [signingKey]);
}
