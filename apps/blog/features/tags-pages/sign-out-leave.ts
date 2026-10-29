'use client';

import { useSyncExternalStore } from 'react';
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

/**
 * Starts a sign-out from `pathname`. On a signed-in-only list (For You) the page switches at once
 * to its leaving state (the list skeleton, the selector naming Trending) and the returned path,
 * Trending, is where the sign-out takes the reader once the server has ended the session.
 * Elsewhere nothing changes and the result is undefined.
 */
export function startSignOutLeave(pathname: string | null): string | undefined {
  if (pathname !== FOR_YOU_PATH) return undefined;
  setLeaving(true);
  return TRENDING_PATH;
}

/** Ends the leaving state, once the page that showed it is gone */
export function endSignOutLeave(): void {
  setLeaving(false);
}

/** Whether a sign-out is taking the reader away from the current page (read outside render) */
export function isLeavingOnSignOut(): boolean {
  return isLeaving;
}

/** Re-renders the caller when a sign-out starts or ends taking the reader away */
export function useIsLeavingOnSignOut(): boolean {
  return useSyncExternalStore(subscribe, readLeaving, readNotLeaving);
}
