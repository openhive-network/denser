'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to detect if the component has been hydrated on the client.
 * Uses useSyncExternalStore for optimal performance without causing extra re-renders.
 *
 * @returns true if hydrated on client, false during SSR
 *
 * @example
 * ```tsx
 * const isHydrated = useHydrated();
 *
 * if (!isHydrated) {
 *   return <Skeleton />;
 * }
 *
 * return <ClientOnlyContent />;
 * ```
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
