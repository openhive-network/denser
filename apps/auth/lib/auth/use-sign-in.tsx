import { UseMutateFunction, useMutation, useQueryClient } from '@tanstack/react-query';
import Router from 'next/router'
import { QUERY_KEY } from '@/auth/lib/query-keys';
import { fetchJson } from '@/auth/lib/fetch-json';
import { User } from '@/auth/pages/api/user'
import { PostLoginSchema } from '@/auth/pages/api/login/[[...slug]]';

async function signIn(data: PostLoginSchema, uid: string = ''): Promise<User> {
  console.log('signIn args: %o', { data, uid });
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

  // const signInMutation = useMutation<User, unknown, PostLoginSchema, unknown>(
  //   ({data: PostLoginSchema, uid: string}) => signIn(data, uid),
  //   {
  //     onSuccess: (data) => {
  //       queryClient.setQueryData([QUERY_KEY.user], data);
  //     },
  //     onError: (error) => {
  //       throw error;
  //     }
  //   }
  // );

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
