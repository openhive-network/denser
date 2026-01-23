'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMounted } from 'usehooks-ts';
import { useUserCore, IUseUser, UseUserOptions } from './use-user-core';

/**
 * User authentication hook for App Router (next/navigation).
 * Use useUser for Pages Router components.
 *
 * @param options - Configuration options for redirects
 * @returns User data
 */
export function useUserClient(options: UseUserOptions = {}): IUseUser {
  const isMounted = useIsMounted();
  const router = useRouter();

  const handleRedirect = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return useUserCore(options, handleRedirect, isMounted);
}
