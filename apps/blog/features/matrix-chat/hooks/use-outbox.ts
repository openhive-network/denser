import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import type { OutgoingMessage } from '@/blog/features/matrix-chat/lib/outbox';
import { OutgoingQueue } from '@/blog/features/matrix-chat/lib/outgoing-queue';

/**
 * Messages the composer sends, with their sending and failed states, and retrying a failed one.
 * Those that failed for want of a connection are sent again, in order, when `connected` turns true
 * and, with backoff, while it stays true.
 */
export function useOutbox(session: ChatSession, connected: boolean) {
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const [queue] = useState(
    () => new OutgoingQueue((roomId, txnId, text) => sessionRef.current.sendText(roomId, txnId, text))
  );
  const outbox = useSyncExternalStore(queue.subscribe, queue.getMessages, queue.getMessages);

  useEffect(() => {
    queue.setConnected(connected);
    return () => queue.setConnected(false);
  }, [queue, connected]);

  const send = useCallback((roomId: string, text: string) => queue.send(roomId, text), [queue]);
  const retry = useCallback((message: OutgoingMessage) => queue.retry(message.txnId), [queue]);

  return { outbox, send, retry };
}
