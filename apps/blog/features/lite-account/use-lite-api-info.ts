'use client';

import { useSyncExternalStore } from 'react';
import type { ILiteApiInfo } from '@hive/common-hiveio-packages/wax';
import { peekLiteApiInfo, subscribeLiteApiInfo, type TPostsNamespace } from '@transaction/lib/lite-api';

// The server renders as before any answer, so hydration matches whatever the browser knows.
const getServerSnapshot = (): undefined => undefined;

/**
 * `lite.get_info` of the API node reads go to as far as it is known: undefined until the server's
 * answer is seeded or the first post read probes the node, null when it is not lite-aware. Never
 * asks the node itself, so a server-rendered page makes no browser request for it.
 */
export function useLiteApiInfo(): ILiteApiInfo | null | undefined {
  return useSyncExternalStore(subscribeLiteApiInfo, peekLiteApiInfo, getServerSnapshot);
}

const isKnownNotLiteAware = (): boolean => peekLiteApiInfo() === null;
const isKnownNotLiteAwareOnServer = (): boolean => false;

/**
 * Whether the API node is known not to be lite-aware (`useLiteApiInfo` is null). Unlike that hook,
 * a lite-aware answer arriving re-renders nothing: for components on every comment.
 */
export function useIsKnownNotLiteAware(): boolean {
  return useSyncExternalStore(subscribeLiteApiInfo, isKnownNotLiteAware, isKnownNotLiteAwareOnServer);
}

/**
 * The namespace post reads of the current node go to, for their query keys: `bridge` until the
 * probe has answered, so a node without lite support keeps the keys and reads it always had.
 */
export function usePostsNamespace(): TPostsNamespace {
  return useLiteApiInfo() ? 'lite' : 'bridge';
}
