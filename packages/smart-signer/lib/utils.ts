import { createWaxFoundation, operation, THexString, ITransactionBuilder, TWaxExtended } from '@hive/wax';
import { Type } from "class-transformer"
import { ValidateNested } from "class-validator"
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { isBrowser } from '@ui/lib/logger';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeyType } from '@smart-signer/types/common';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

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

export function isStorageAvailable(
  storageType: 'localStorage' | 'sessionStorage',
  strict: boolean = false // if true also tries to read and write to storage
) {
  let storage: Storage;
  // logger.info('Checking availability of %s', storageType);
  try {
    if (!isBrowser()) return false;
    if ((storageType = 'localStorage')) {
      storage = window.localStorage;
    } else if ((storageType = 'sessionStorage')) {
      storage = window.sessionStorage;
    } else {
      return false;
    }
    if (strict) {
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Returns enum key for enum value.
 *
 * @export
 * @template T
 * @param {T} myEnum
 * @param {string} enumValue
 * @returns {(keyof T | null)}
 */
export function getEnumKeyByEnumValue<T extends { [index: string]: string }>(
  myEnum: T,
  enumValue: string
): keyof T | null {
  const keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? keys[0] : null;
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
export async function subtleCryptoDigestHex(message: string | Buffer) {
  let msgUint8: Buffer | Uint8Array;
  if (typeof message === 'string') {
    // encode as (utf-8) Uint8Array
    msgUint8 = new TextEncoder().encode(message);
  } else {
    msgUint8 = message;
  }
  // hash the message
  const hashArrayBuffer = await crypto.subtle.digest(
    'SHA-256', msgUint8
    );
  // convert ArrayBuffer to byte array
  const hashArray = Array.from(new Uint8Array(hashArrayBuffer));
  // convert bytes to hex string
  const hashHex = hashArray.map(
    (b) => b.toString(16).padStart(2, '0')
    ).join('');
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

  let txBuilder: ITransactionBuilder;
  if (txString) {
    txBuilder = new wax.TransactionBuilder(JSON.parse(txString));
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
      logger.error('Error in getTransactionDigest: %o', error);
      throw error;
    }
    const { result: globalProps } = dynamicGlobalProps;
    txBuilder = new wax.TransactionBuilder(globalProps.head_block_id, '+1m');
  }

  // Pass operation to transaction, if it exists.
  if (operation) {
    txBuilder.push(operation);
  }

  logger.info('tx.toString(): %s', txBuilder.toString());

  return {
    txString: txBuilder.toString(),
    digest: txBuilder.sigDigest
  };
}

class VerifySignaturesRequest {
  hash!: string;
  signatures!: string[];
  required_other!: string[];
  required_active!: string[];
  required_owner!: string[];
  required_posting!: string[];
};

class VerifySignaturesResponse {
  public valid!: boolean;
};

const DatabaseApiExtensions = {
  database_api: {
    verify_signatures: {
      params: VerifySignaturesRequest,
      result: VerifySignaturesResponse
    }
  }
};

type TExtendedHiveChain = TWaxExtended<typeof DatabaseApiExtensions>;

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
  txString: string = ''
): Promise<boolean> {
  // Create transaction's digest and compare it with argument `digest`.
  if (txString) {
    const result = await getTransactionDigest(null, txString);
    if (result.digest !== digest) {
      logger.info('Digest do not match');
      return false;
    }
  }

  const params: VerifySignaturesRequest = {
    hash: digest,
    signatures: [signature],
    required_other: [],
    required_active: [],
    required_owner: [],
    required_posting: []
  };

  if (keyType === 'posting') {
    params.required_posting.push(username);
  } else {
    params.required_active.push(username);
  }

  const hiveChain = await hiveChainService.getHiveChain();
  const extendedChain: TExtendedHiveChain = hiveChain.extend(DatabaseApiExtensions);

  const { valid } = await extendedChain.api.database_api.verify_signatures(params);

  if (!valid) {
    logger.info('Signature is invalid');
  }

  return valid;
}

export async function verifyPrivateKey(
  username: string,
  wif: string,
  keyType: KeyType,
  apiEndpoint: string,
  strict: boolean = false
): Promise<boolean> {
  // Generate public key and sign random string.
  const privateKey = PrivateKey.fromString(wif);
  const digestBuf = cryptoUtils.sha256(crypto.randomUUID());
  const signature = privateKey.sign(digestBuf).toString();
  const publicKey = privateKey.createPublic('STM');
  logger.info('verifyPrivateKey publicKey: %s', publicKey.toString());

  // Verify signature.
  const valid: boolean = await verifySignature(
    username,
    digestBuf.toString('hex'),
    signature,
    keyType,
    ''
  );

  // Return false when signature is not valid.
  if (!valid) return valid;
  // No other checks when `strict` is false.
  if (!strict) return valid;

  // Check whether username directly signed the string.
  const hiveChain = await hiveChainService.getHiveChain();

  const [referencedAccounts] = (
    await hiveChain.api.account_by_key_api
      .get_key_references({ keys: [publicKey.toString()] })
  ).accounts;
  logger.info('verifyPrivateKey referencedAccounts: %o', referencedAccounts);
  if (referencedAccounts.includes(username)) {
    return true;
  }

  return false;
}
