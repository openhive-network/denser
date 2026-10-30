'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { FOR_YOU_SORT } from '@/blog/lib/utils';

export const TRENDING_PATH = '/trending';
const FOR_YOU_PATH = `/${FOR_YOU_SORT}`;

let isLeaving = false;
const listeners = new Set<() => void>();

function setLeaving(next: boolean): void {
  if (isLeaving === next) return;
  isLeaving = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const readLeaving = () => isLeaving;
const readNotLeaving = () => false;
const readLeaveTarget = () => (isLeaving ? TRENDING_PATH : undefined);

/**
 * Starts a sign-out from `pathname`. On a signed-in-only list (For You) the page switches at once
 * to its leaving state (the list skeleton, the selector naming Trending). The returned function,
 * read once the server has ended the session, gives where the sign-out takes the reader: Trending
 * while the leaving state lasts, nowhere once the reader has moved to another page.
 */
export function startSignOutLeave(pathname: string | null): () => string | undefined {
  if (pathname === FOR_YOU_PATH) setLeaving(true);
  return readLeaveTarget;
}

/**
 * Switches For You to its leaving state for a sign-out this page did not start (another tab's, a
 * desync logout), which takes the reader to Trending by itself (useTrendingOnSignOut)
 */
export function showSignOutLeave(): void {
  setLeaving(true);
}

/** Ends the leaving state, once the page that showed it is gone */
export function endSignOutLeave(): void {
  setLeaving(false);
}

/** Whether a sign-out is taking the reader away from the current page (read outside render) */
export function isLeavingOnSignOut(): boolean {
  return isLeaving;
}

/** Ends the leaving state once the reader is on another page, whatever that page renders */
export function useEndSignOutLeaveOnNavigation(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== FOR_YOU_PATH) endSignOutLeave();
  }, [pathname]);
}

/** Re-renders the caller when a sign-out starts or ends taking the reader away */
export function useIsLeavingOnSignOut(): boolean {
  return useSyncExternalStore(subscribe, readLeaving, readNotLeaving);
}
