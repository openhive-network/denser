import { operation, ApiOperation, ApiTransaction, custom_json } from '@hiveio/wax';
import { KeyType } from '@smart-signer/types/common';

/**
 * Create fake transaction for signing in login flow.
 *
 * @export
 * @param {string} username
 * @param {KeyType} keyType
 * @param {string} loginChallenge
 * @returns {Promise<operation>}
 */
export async function getOperationForLogin(
  username: string,
  keyType: KeyType,
  loginChallenge: string
): Promise<operation> {
  let operation: operation;
  if (keyType === KeyType.posting) {
    const customJsonLoginChallenge: custom_json = custom_json.create({
      id: 'denser_login_with_posting_key',
      json: JSON.stringify({
        username: username,
        keyType: keyType,
        description: 'You are logging in to Denser using Hive Keychain by signing this transaction',
        loginChallenge: loginChallenge
      }),
      required_auths: [],
      required_posting_auths: [username]
    });
    operation = { custom_json: customJsonLoginChallenge };
  } else if (keyType === KeyType.active) {
    const customJsonLoginChallenge: custom_json = custom_json.create({
      id: 'denser_login_with_active_key',
      json: JSON.stringify({
        username: username,
        keyType: keyType,
        description: 'You are logging in to Denser using Hive Keychain by signing this transaction',
        loginChallenge: loginChallenge
      }),
      required_auths: [username],
      required_posting_auths: []
    });
    operation = { custom_json: customJsonLoginChallenge };
  } else {
    throw new Error('Unsupported keyType');
  }
  return operation;
}

/**
 * Get `loginChallenge` from fake transaction in login flow.
 *
 * @export
 * @param {ApiTransaction} tx
 * @param {KeyType} keyType
 * @returns {string}
 */
export function getLoginChallengeFromTransactionForLogin(tx: ApiTransaction, keyType: KeyType): string {
  const operation: ApiOperation = tx.operations[0];
  return getLoginChallengeFromOperationForLogin(operation, keyType);
}

/**
 * Get `loginChallenge` from fake operation in login flow.
 *
 * @export
 * @param {ApiOperation} operation
 * @param {KeyType} keyType
 * @returns {string}
 */
export function getLoginChallengeFromOperationForLogin(operation: ApiOperation, keyType: KeyType): string {
  let loginChallenge = '';
  if (keyType === KeyType.posting) {
    loginChallenge = (operation as any).value['permlink'];
  } else if (keyType === KeyType.active) {
    loginChallenge = (operation as any).value['memo'];
  } else {
    throw new Error('Unsupported keyType');
  }
  return loginChallenge;
}
