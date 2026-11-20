import { TTransactionPackType } from '@hiveio/wax';
import type { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { getChain } from '@transaction/lib/chain';
import { getAccount } from '@transaction/lib/hive-api';
import { areOwnKeys, findKeyRole, type AccountAuthorities } from '@smart-signer/lib/validators/key-role';
import { LoginType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export interface LoginKeys {
  /** Whether the login transaction was signed with the account's own keys only */
  strict: boolean;
  /** The account's own public key that signed the login transaction, when one did */
  signInPublicKey?: string;
}

/**
 * What the keys signing the login transaction tell of `username`'s session: whether they are its
 * own keys only, not the key of an account its authority is granted to (`strict`), and which of
 * its own keys signed. Not strict and no key when the signing keys or the account's authorities
 * cannot be read, and for a HiveAuth login, which signs no transaction.
 *
 * @param account the authorities of the account signing in, when the caller has read them already
 */
export async function readLoginKeys(data: PostLoginSchema, account?: AccountAuthorities): Promise<LoginKeys> {
  if (data.loginType === LoginType.hiveauth) return { strict: false };
  try {
    const chain = await getChain();
    const tx = chain.createTransactionFromJson(data.txJSON);
    const signingKeys = data.pack === TTransactionPackType.LEGACY ? tx.legacy_signatureKeys : tx.signatureKeys;
    const authorities = account ?? (await getAccount(data.username));
    if (!authorities) return { strict: false };
    return {
      strict: areOwnKeys(authorities, signingKeys),
      signInPublicKey: signingKeys.find((key) => findKeyRole(authorities, key) !== null)
    };
  } catch (error) {
    logger.error(error, 'Cannot tell the keys signing the login of %s; the login counts as non-strict', data.username);
    return { strict: false };
  }
}
