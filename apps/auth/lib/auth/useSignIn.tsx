import { UseMutateFunction, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { QUERY_KEY } from '../constants/queryKeys';
import { ResponseError } from '../ResponseError';
import { User } from './useUser';

async function signIn(email: string, password: string): Promise<User> {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    throw new ResponseError('Failed on sign in request', response);
  }
  return await response.json();
}

type IUseSignIn = UseMutateFunction<User, unknown, {
  email: string;
  password: string;
}, unknown>

export function useSignIn(): IUseSignIn {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate: signInMutation } = useMutation<User, unknown, { email: string, password: string }, unknown>(
    ({
      email,
      password
    }) => signIn(email, password), {
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY.user], data);
      router.push('/');
    },
    onError: (error) => {
      console.error('Ops.. Error on sign in. Try again!', error);
    }
  });

  return signInMutation
}
