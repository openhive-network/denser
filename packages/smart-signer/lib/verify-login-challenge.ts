import { Authority } from '@hiveio/dhive';
import { FullAccount } from '@transaction/lib/app-types';
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
export function verifyLoginChallenge(
    chainAccount: FullAccount,
    signatures: Signatures,
    message: string = '',
    keyType: 'posting' | 'active' = 'posting'
) {
    const authority: Authority = chainAccount[keyType];
    const { key_auths, weight_threshold } = authority;

    const pubkey = key_auths[0][0];
    const weight = key_auths[0][1];

    // We do not support situation when more than one account should be
    // involved in signing.
    if (weight !== 1 || weight_threshold !== 1) {
        logger.error(
            `verifySignature unsupported ${keyType} auth configuration for user ${chainAccount.name}`
        );
    }

    return verifySignature(
        signatures[keyType] || '',
        pubkey,
        message
    );
};
