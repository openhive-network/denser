import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@/auth/lib/query-keys';
import { fetchJson } from '@/auth/lib/fetch-json';
import { User } from '@/auth/pages/api/user';
import { PostLoginSchema } from '@/auth/pages/api/login';

async function signIn(data: PostLoginSchema): Promise<User> {
  return await fetchJson('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const signInMutation = useMutation<User, unknown, PostLoginSchema, unknown>(
    (data: PostLoginSchema) => signIn(data),
    {
      onSuccess: (data) => {
        queryClient.setQueryData([QUERY_KEY.user], data);
      },
      onError: (error) => {
        throw error;
      }
    }
  );
  return signInMutation;
}
