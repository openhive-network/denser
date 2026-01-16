import { ApiAuthority } from '@hiveio/wax';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { Signatures } from '@smart-signer/lib/auth/utils';
import { verifySignature } from '@smart-signer/lib/verify-signature';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

/**
 * Verify login challenge or any other signed thing, as a matter of
 * fact.
 *
 * @export
 * @param {FullAccount} chainAccount
 * @param {Signatures} signatures
 * @param {string} [message='']
 * @param {('posting' | 'active')} [keyType='posting']
 * @returns
 */
export async function verifyLoginChallenge(
    chainAccount: FullAccount,
    signatures: Signatures,
    message: string = '',
    keyType: 'posting' | 'active' = 'posting'
) {
    const authority: ApiAuthority = chainAccount[keyType];
    const { key_auths, weight_threshold } = authority;

    // ApiAuthority has key_auths as Array<{0: pubkey, 1: weight}>
    const firstKeyAuth = key_auths[0];
    const pubkey = firstKeyAuth?.['0'] || '';
    const weight = firstKeyAuth?.['1'] || 0;

    // We do not support situation when more than one account should be
    // involved in signing.
    if (weight !== 1 || weight_threshold !== 1) {
        logger.error(
            `verifySignature unsupported ${keyType} auth configuration for user ${chainAccount.name}`
        );
    }

    return await verifySignature(
        signatures[keyType] || '',
        pubkey,
        message
    );
};
