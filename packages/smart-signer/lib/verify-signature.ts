import { cryptoUtils, PublicKey, Signature } from '@hiveio/dhive';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');


/**
 * Verify signature when you know message and algorithm used to hash
 * message before signing.
 *
 * @export
 * @param {string} signature
 * @param {(string | PublicKey)} pubkey
 * @param {string} message
 * @param {('sha256' | 'doubleSha256' | 'ripemd160')}
 * [hashFunction='sha256']
 * @returns
 */
export function verifySignature(
    signature: string,
    pubkey: string | PublicKey, // take this from trusted party
    message: string, // this string was signed
    hashFunction: 'sha256' | 'doubleSha256' | 'ripemd160' = 'sha256'
) {
    if (!signature) return false;
    const hashFn = cryptoUtils[hashFunction];
    const messageHash = hashFn(message);
    const sig = Signature.fromString(signature);
    const publicKey = PublicKey.from(pubkey);
    const verified = publicKey.verify(messageHash, sig);
    return verified;
};
