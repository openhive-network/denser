import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson, FetchError } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { User } from '@smart-signer/types/common';
import { PostAccountSchema } from '@smart-signer/lib/auth/utils';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { findAccount, removeAccount } from '@smart-signer/lib/auth/accounts';
import { setAccounts, setActiveUser } from '@smart-signer/lib/auth/active-user';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const HTTP_UNAUTHORIZED = 401;

async function switchAccountBackend(data: PostAccountSchema): Promise<User> {
  return await fetchJson('/api/auth/switch', {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify(data)
  });
}

async function switchAccount(username: string): Promise<User> {
  const account = findAccount(userLocalStorage.getAccounts(), username);
  if (!account) {
    throw new Error(`Account ${username} is not signed in`);
  }
  return account.authenticateOnBackend ? switchAccountBackend({ username }) : account;
}

function isSessionMissingAccount(error: unknown): boolean {
  return error instanceof FetchError && error.response.status === HTTP_UNAUTHORIZED;
}

/** Make an account signed in earlier in this session the current user. */
export function useSwitchAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { username: string }) => switchAccount(params.username),
    onSuccess: (user) => {
      setActiveUser(queryClient, user);
    },
    onError: (error, { username }) => {
      logger.error(error, 'Switching to account %s failed', username);
      // The server session no longer holds this account (e.g. it expired): stop offering it
      if (isSessionMissingAccount(error)) {
        setAccounts(queryClient, removeAccount(userLocalStorage.getAccounts(), username));
      }
    }
  });
}
