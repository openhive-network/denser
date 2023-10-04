import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { QUERY_KEY } from '../constants/queryKeys';

type IUseSignOut = () => void

export function useSignOut(): IUseSignOut {
  const queryClient = useQueryClient();
  const router = useRouter();

  const onSignOut = useCallback(() => {
    queryClient.setQueryData([QUERY_KEY.user], null);
    router.push('/auth/sign-in');
  }, [router, queryClient])

  return onSignOut
}
