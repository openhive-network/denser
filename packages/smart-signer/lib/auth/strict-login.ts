import { TTransactionPackType } from '@hiveio/wax';
import type { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { getChain } from '@transaction/lib/chain';
import { getAccount } from '@transaction/lib/hive-api';
import { areOwnKeys, type AccountAuthorities } from '@smart-signer/lib/validators/key-role';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Whether the login transaction was signed with `username`'s own keys only, not with the key of
 * an account its authority is granted to. False when the signing keys or the account's
 * authorities cannot be read.
 *
 * @param account the authorities of the account signing in, when the caller has read them already
 */
export async function isStrictLogin(data: PostLoginSchema, account?: AccountAuthorities): Promise<boolean> {
  try {
    const chain = await getChain();
    const tx = chain.createTransactionFromJson(data.txJSON);
    const signingKeys = data.pack === TTransactionPackType.LEGACY ? tx.legacy_signatureKeys : tx.signatureKeys;
    const authorities = account ?? (await getAccount(data.username));
    return !!authorities && areOwnKeys(authorities, signingKeys);
  } catch (error) {
    logger.error(error, 'Cannot tell the keys signing the login of %s; the login counts as non-strict', data.username);
    return false;
  }
}
