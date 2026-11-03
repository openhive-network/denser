import { useSyncExternalStore } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { useChatSessionVersion } from '@/blog/features/matrix-chat/hooks/use-chat-session-version';

function subscribeToOnline(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/**
 * Whether the chat is connected: the browser is online and the session's sync reaches the
 * homeserver. Turns false as soon as the browser goes offline, and true again once a sync is in.
 */
export function useChatConnected(session: ChatSession): boolean {
  useChatSessionVersion(session);
  const online = useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true
  );
  return online && session.connected();
}
