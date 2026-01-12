import { useCallback } from 'react';
import Router from 'next/router';
import { useUserCore, IUseUser, UseUserOptions } from './use-user-core';

// Re-export types for backwards compatibility
export type { IUseUser, UseUserOptions } from './use-user-core';

/**
 * User authentication hook for Pages Router (next/router).
 * Use useUserClient for App Router components.
 * 
 * @param options - Configuration options for redirects
 * @returns User data
 */
export function useUser(options: UseUserOptions = {}): IUseUser {
  const handleRedirect = useCallback((path: string) => {
    Router.push(path);
  }, []);

  return useUserCore(options, handleRedirect);
}
