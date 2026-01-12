import { getChain } from './chain';

/**
 * Validates Hive account names using the wax library.
 */
export async function isHiveAccountNameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;

  const chain = await getChain();
  return chain.isValidAccountName(accountName);
}
