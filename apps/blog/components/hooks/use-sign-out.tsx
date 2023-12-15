import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, defaultUser } from 'pages/api/user';
import { getLogger } from '@hive/ui/lib/logging';
import { fetchJson } from '@/blog/lib/fetch-json';
import { QUERY_KEY } from '@/blog/lib/query-keys';

const logger = getLogger('app');

async function signOut(): Promise<User> {
  return await fetchJson('/api/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signOutMutation = useMutation(() => signOut(), {
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
    },
    onError: (error) => {
      throw error;
    }
  });
  return signOutMutation;
}
