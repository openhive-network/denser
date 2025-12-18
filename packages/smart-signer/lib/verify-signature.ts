import { getChain } from '@hive/common-hiveio-packages';

/**
 * Verify signature when you know message and algorithm used to hash
 * message before signing.
 *
 * @export
 * @param {string} signature
 * @param {(string)} pubkey
 * @param {string} message
 * @returns
 */
export async function verifySignature(
    signature: string,
    pubkey: string,
    message: string,
) {
    if (!signature) return false;

    const wax = await getChain();

    const pkDeduced = wax.getPublicKeyFromSignature(message, signature);

    return pkDeduced === pubkey;
};
