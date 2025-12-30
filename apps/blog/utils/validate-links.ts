import { isHiveAccountNameValid } from '@hive/transaction';

export function isPermlinkValid(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return /^[a-z0-9-]{1,255}$/.test(permlink);
}

// Re-export from @hive/transaction for backwards compatibility
export { isHiveAccountNameValid as isUsernameValid };
