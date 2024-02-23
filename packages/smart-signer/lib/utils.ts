import { createWaxFoundation, operation, THexString, ITransactionBuilder } from '@hive/wax/web';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { isBrowser } from '@ui/lib/logger';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const KEY_TYPES = ['active', 'posting'] as const;
export type KeyAuthorityType = (typeof KEY_TYPES)[number];

export function parseCookie(cookie: string): Record<string, string> {
  const kv: Record<string, string> = {};

  if (!cookie) return kv;

  cookie.split(';').forEach((part) => {
    const [k, v] = part.trim().split('=');
    kv[k] = v;
  });

  return kv;
}

export function getCookie(cname: string) {
  let name = cname + '=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

/**
 * Calculates a digest and converts it to a hex string with Web Crypto
 * API. Normally the digest is returned as an ArrayBuffer, but for
 * comparison and display digests are often represented as hex strings.
 * This method calculates a digest, then converts the ArrayBuffer to a
 * hex string. In theory the same result can be achieved with following
 * synchronous code (it's used by Dhive.cryptoutils.sha256() function as
 * well):
 * ```
 * import { createHash } from 'crypto';
 * const hashHex = createHash('sha256').update(message).digest('hex');
 * ```
 * However MDN suggests using crypto.subtle in browsers.
 *
 * See:
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest.
 *
 * @param {string} message
 * @returns {string} in hex format
 */
export async function subtleCryptoDigestHex(message: string) {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashArrayBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashArrayBuffer)); // convert ArrayBuffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

/**
 * Creates Hive blockchain transaction, if needed, and pushes
 * operation into it, if it exists. Then calculates transaction's
 * digest (cryptographic hash).
 *
 * @param {(operation | null)} [operation=null]
 * @param {string} [txString='']
 * @param {*} [hiveApiUrl=this.hiveApiUrl]
 * @returns {Promise<{txString: string, txApi: string, digest:
 * THexString}>}
 */
export async function getTransactionDigest(
  operation: operation | null = null,
  txString: string = '',
  hiveApiUrl = 'https://api.hive.blog'
): Promise<{ txString: string; digest: THexString }> {
  const wax = await createWaxFoundation();

  let tx: ITransactionBuilder;
  if (txString) {
    tx = new wax.TransactionBuilder(JSON.parse(txString));
  } else {
    // Create transaction, if it does not exist.
    let dynamicGlobalProps: any;
    try {
      dynamicGlobalProps = await fetchJson(hiveApiUrl, {
        method: 'post',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'database_api.get_dynamic_global_properties',
          id: 1
        })
      });
    } catch (error) {
      logger.error('Error in Signer.getTransactionDigest: %o', error);
      throw error;
    }
    const { result: globalProps } = dynamicGlobalProps;
    tx = new wax.TransactionBuilder(globalProps.head_block_id, '+1m');
  }

  // Pass operation to transaction, if it exists.
  if (operation) {
    tx.push(operation);
  }

  logger.info('tx.toString(): %s', tx.toString());

  return {
    txString: tx.toString(),
    digest: tx.sigDigest
  };
}

/**
 * Verifies signature of transaction or only signature of digest.
 * Uses "@hive/wax" package to create digest nad Hive API
 * database_api.verify_signatures endpoint.
 *
 * @param {string} username
 * @param {THexString} digest
 * @param {string} signature
 * @param {KeyAuthorityType} keyType
 * @param {string} [txString='']
 * @param {*} [hiveApiUrl=this.hiveApiUrl]
 * @returns {Promise<boolean>}
 */
export async function verifySignature(
  username: string,
  digest: THexString,
  signature: string,
  keyType: KeyAuthorityType,
  txString: string = '',
  hiveApiUrl = 'https://api.hive.blog'
): Promise<boolean> {
  // Create transaction's digest and compare it with that passed
  // as argument to this method.
  if (txString) {
    const result = await getTransactionDigest(null, txString);
    if (result.digest !== digest) {
      logger.info('Digest do not match');
      return false;
    }
  }

  // Check signature of digest passed as argument to this method.
  const body: any = {
    jsonrpc: '2.0',
    method: 'database_api.verify_signatures',
    params: {
      hash: digest,
      signatures: [signature],
      required_other: [],
      required_active: [],
      required_owner: [],
      required_posting: []
    },
    id: 1
  };

  if (keyType === 'posting') {
    body.params.required_posting.push(username);
  } else {
    body.params.required_active.push(username);
  }

  let verifyResponse: any;
  try {
    verifyResponse = await fetchJson(hiveApiUrl, {
      method: 'post',
      body: JSON.stringify(body)
    });
  } catch (error) {
    logger.error('Error in Signer.verify fetchJson: %o', error);
    throw error;
  }

  const {
    result: { valid }
  } = verifyResponse;
  if (!valid) {
    logger.info('Signature is invalid');
  }

  return valid;
}

export function isStorageAvailable(storageType: 'localStorage' | 'sessionStorage') {
  let storage: Storage;
  logger.info('Checking availability of %s', storageType);
  try {
    if (!isBrowser()) return false;
    if ((storageType = 'localStorage')) {
      storage = window.localStorage;
    } else if ((storageType = 'sessionStorage')) {
      storage = window.sessionStorage;
    } else {
      return false;
    }
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}
