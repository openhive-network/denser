import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@smart-signer/types/common';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { removeAccount } from '@smart-signer/lib/auth/accounts';
import { setAccounts } from '@smart-signer/lib/auth/active-user';
import { destroyAccountSigner } from '@smart-signer/lib/auth/destroy-signer';
import { postAccountsChanged } from '@smart-signer/lib/auth/account-sync';

/**
 * Stops offering `account`, ends its signer session (unlocked keys, tokens) and deletes its stored
 * keys, and names it to the other tabs, so the signers of the other apps on the origin end its
 * session too.
 */
export function forgetAccount(queryClient: QueryClient, account: User): void {
  setAccounts(queryClient, removeAccount(userLocalStorage.getAccounts(), account.username));
  void destroyAccountSigner(account);
  postAccountsChanged({ removedUsername: account.username });
}
