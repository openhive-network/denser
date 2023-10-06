import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { QUERY_KEY } from '../constants/queryKeys';
import fetchJson from '@/auth/lib/fetch-json';

type IUseSignOut = () => void

export function useSignOut(): IUseSignOut {
  const queryClient = useQueryClient();
  const router = useRouter();

  const onSignOut = useCallback(async () => {
    await fetchJson('/api/logout', { method: 'POST' });
    queryClient.setQueryData([QUERY_KEY.user], null);
    router.push('/');
  }, [router, queryClient])

  return onSignOut;
}
