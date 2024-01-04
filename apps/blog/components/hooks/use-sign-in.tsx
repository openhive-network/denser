import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@/blog/lib/query-keys';
import { fetchJson } from '@/blog/lib/fetch-json';
import { PostLoginSchema } from '@/blog/pages/api/login';
import { User } from '@/blog/pages/api/user';

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
