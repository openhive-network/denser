import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@angala/lib/fetch-json';
import { QUERY_KEY } from '@angala/lib/query-keys';
import { defaultUser } from '@angala/lib/auth/utils';
import { getLogger } from "@hive/ui/lib/logging";
import { User } from '@angala/types/common';

const logger = getLogger('app');

async function signOut(): Promise<User> {
  return await fetchJson('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signOutMutation = useMutation(
    () => signOut(),
    {
      onSuccess: (data) => {
        queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      },
      onError: (error) => {
        throw error;
      }
    }
  );
  return signOutMutation;
}
