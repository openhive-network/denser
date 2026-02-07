import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getAccountFull } from '../../hive-api';
import { ExistenceResult } from '../types';

/**
 * Checks if a Hive account exists on the blockchain.
 * Wraps getAccountFull with ExistenceResult discriminated union
 * so callers can distinguish "not found" from "API error".
 *
 * API behavior: database_api.find_accounts returns empty array for
 * nonexistent accounts (no error). getAccountFull returns an object
 * without a `name` field when the account doesn't exist.
 */
export async function checkAccountExists(
  username: string
): Promise<ExistenceResult<FullAccount>> {
  try {
    const account = await getAccountFull(username);

    // getAccountFull returns an object without `name` when account doesn't exist
    // (find_accounts returns empty array, getAccount returns undefined,
    // then spread of undefined gives partial object)
    if (!account || !account.name) {
      return { status: 'not_found' };
    }

    return { status: 'exists', data: account };
  } catch (error) {
    return {
      status: 'api_error',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
