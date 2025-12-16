import { operation, THexString, ITransaction, TWaxExtended } from '@hiveio/wax';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { isBrowser } from '@ui/lib/logger';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { KeyType } from '@smart-signer/types/common';
import { getChain } from '@transaction/lib/chain';
import { getLogger } from '@ui/lib/logging';
import { VerifySignaturesParams, VerifySignaturesResponse } from '@hive/transaction/lib/extended-hive.chain';

const logger = getLogger('app');

const KEY_TYPES = ['active', 'posting'] as const;
export type KeyAuthorityType = (typeof KEY_TYPES)[number];

/**
 * Return cookie value for given cookie name. For use on client only.
 * When cookie doesn't exist returns empty string.
 *
 * @export
 * @param {string} cname
 * @returns {string}
 */
export function getCookie(cname: string): string {
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
    if (storageType === 'localStorage') {
      storage = window.localStorage;
    } else if (storageType === 'sessionStorage') {
      storage = window.sessionStorage;
    } else {
      return false;
    }

    // Disabled, because we experience too many writes here.
    // TODO Check why.
    // if (strict) {
    //   const x = '__storage_test__';
    //   storage.setItem(x, x);
    //   storage.removeItem(x);
    // }

    return true;
  } catch (e) {
    return false;
  }
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
  const wax = await getChain();

  let txBuilder: ITransaction;
  if (txString) {
    txBuilder = wax.createTransactionFromJson(JSON.parse(txString));
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
    txBuilder = wax.createTransactionWithTaPoS(globalProps.head_block_id, '+1m');
  }

  // Pass operation to transaction, if it exists.
  if (operation) {
    txBuilder.pushOperation(operation);
  }

  logger.info('tx.toString(): %s', txBuilder.toString());

  return {
    txString: txBuilder.toString(),
    digest: txBuilder.sigDigest
  };
}


const DatabaseApiExtensions = {
  database_api: {
    verify_signatures: {
      params: VerifySignaturesParams,
      result: VerifySignaturesResponse
    }
  }
};

/**
 * Verifies signature of transaction or only signature of digest.
 * Uses "@hiveio/wax" package to create digest nad Hive API
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
  // Create transaction's digest and compare it with argument `digest`.
  if (txString) {
    const result = await getTransactionDigest(null, txString, hiveApiUrl);
    if (result.digest !== digest) {
      logger.info('Digest do not match');
      return false;
    }
  }

  const params: VerifySignaturesParams = {
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

  const hiveChain = await getChain();

  const { valid } = await hiveChain.api.database_api.verify_signatures(params);

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
  logger.info('verifyPrivateKey generated public key: %s', publicKey.toString());

  // Verify signature.
  const valid: boolean = await verifySignature(
    username,
    digestBuf.toString('hex'),
    signature,
    keyType,
    '',
    apiEndpoint
  );

  // Return false when signature is not valid.
  if (!valid) return valid;
  // No other checks when `strict` is false.
  if (!strict) return valid;

  // Check whether username directly signed the string.
  const hiveChain = await getChain();

  const [referencedAccounts] = (
    await hiveChain.api.account_by_key_api.get_key_references({ keys: [publicKey.toString()] })
  ).accounts;
  logger.info('verifyPrivateKey referencedAccounts: %o', referencedAccounts);
  if (referencedAccounts.includes(username)) {
    return true;
  }

  return false;
}

/**
 * Returns true if page is loaded in iframe, false otherwise.
 *
 * @export
 * @returns {boolean}
 */
export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
