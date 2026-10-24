import { useSyncExternalStore } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';

/** Re-renders the caller on every change of the session's state; returns its version. */
export function useChatSessionVersion(session: ChatSession | null): number {
  return useSyncExternalStore(
    session?.subscribe ?? subscribeToNothing,
    () => session?.version() ?? 0,
    () => 0
  );
}

const subscribeToNothing = () => () => undefined;
