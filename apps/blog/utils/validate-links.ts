import { getChain } from '@hive/transaction/lib/chain';

export function isPermlinkValid(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return /^[a-z0-9-]{1,255}$/.test(permlink);
}

export async function isUsernameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;
  const chain = await getChain();
  return chain.isValidAccountName(accountName);
}
