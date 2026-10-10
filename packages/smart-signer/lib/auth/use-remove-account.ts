import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { User } from '@smart-signer/types/common';
import { PostAccountSchema } from '@smart-signer/lib/auth/utils';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { removeAccount } from '@smart-signer/lib/auth/accounts';
import { setAccounts } from '@smart-signer/lib/auth/active-user';
import { destroyAccountSigner } from '@smart-signer/lib/auth/destroy-signer';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

async function removeAccountBackend(data: PostAccountSchema): Promise<User[]> {
  return await fetchJson('/api/auth/remove-account', {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify(data)
  });
}

/** Forget an account other than the current user, signing it out of its signer. */
export function useRemoveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { account: User }) => {
      const { account } = params;
      if (account.authenticateOnBackend) {
        await removeAccountBackend({ username: account.username });
      }
    },
    onSuccess: (_data, { account }) => {
      setAccounts(queryClient, removeAccount(userLocalStorage.getAccounts(), account.username));
      void destroyAccountSigner(account);
    },
    onError: (error, { account }) => {
      logger.error(error, 'Removing account %s failed', account.username);
    }
  });
}
