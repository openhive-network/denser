import { operation, ApiOperation, ApiTransaction, custom_json } from '@hiveio/wax';
import { KeyType } from '@smart-signer/types/common';

/**
 * Create fake transaction for signing in login flow.
 *
 * @export
 * @param {string} username
 * @param {KeyType} keyType
 * @param {string} loginChallenge
 * @param {string} loginType
 * @returns {Promise<operation>}
 */
export async function getOperationForLogin(
  username: string,
  keyType: KeyType,
  loginChallenge: string,
  loginType: string
): Promise<operation> {
  let operation: operation;
  if (keyType === KeyType.posting) {
    const customJsonLoginChallenge: custom_json = custom_json.create({
      id: `denser_${loginType}`,
      json: JSON.stringify({ challenge: loginChallenge }),
      required_auths: [],
      required_posting_auths: [username]
    });
    operation = { custom_json_operation: customJsonLoginChallenge };
  } else if (keyType === KeyType.active) {
    const customJsonLoginChallenge: custom_json = custom_json.create({
      id: `denser_${loginType}`,
      json: JSON.stringify({ challenge: loginChallenge }),
      required_auths: [username],
      required_posting_auths: []
    });
    operation = { custom_json_operation: customJsonLoginChallenge };
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
 * @param {KeyType} _keyType
 * @returns {string}
 */
export function getLoginChallengeFromOperationForLogin(operation: ApiOperation, _keyType: KeyType): string {
  // The login operation is always a custom_json_operation with the challenge in the json field
  const jsonString = (operation as any).value?.json;
  if (!jsonString) {
    throw new Error('Missing json field in custom_json operation');
  }
  const parsed = JSON.parse(jsonString);
  if (!parsed.challenge) {
    throw new Error('Missing challenge in custom_json operation');
  }
  return parsed.challenge;
}
