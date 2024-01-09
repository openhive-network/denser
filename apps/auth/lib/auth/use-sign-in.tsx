import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@/auth/lib/query-keys';
import { fetchJson } from '@/auth/lib/fetch-json';
import { PostLoginSchema } from '@/auth/lib/auth/utils';
import { User } from '@/auth/types/common';

async function signIn(data: PostLoginSchema, uid: string = ''): Promise<User> {
  const url = uid ? `/api/login/${uid}` : '/api/login';
  return await fetchJson(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    }
  );
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const signInMutation = useMutation({
    mutationFn: (params: {data: PostLoginSchema, uid: string}) => {
      const { data, uid } = params;
      return signIn(data, uid)
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY.user], data);
    },
    onError: (error) => {
      throw error;
    }
  });
  return signInMutation;
}
