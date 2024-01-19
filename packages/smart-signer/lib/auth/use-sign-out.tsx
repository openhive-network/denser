import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { getLogger } from "@hive/ui/lib/logging";
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';

const logger = getLogger('app');

async function signOut(): Promise<User> {
  return await fetchJson('/api/auth/logout', {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1'],
    ],
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signOutMutation = useMutation(
    () => signOut(),
    {
      onSuccess: (data) => {
        queryClient.setQueryData([QUERY_KEY.user], data);
      },
      onError: (error) => {
        throw error;
      }
    }
  );
  return signOutMutation;
}
