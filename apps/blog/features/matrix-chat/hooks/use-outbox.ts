import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import {
  awaitingReconnect,
  deliver,
  outboxReducer,
  resendInOrder,
  type OutgoingMessage
} from '@/blog/features/matrix-chat/lib/outbox';

const newTxnId = () => `denser.${Date.now()}.${crypto.randomUUID()}`;

/**
 * Messages the composer sends, with their sending and failed states, and retrying a failed one.
 * Those that failed for want of a connection are sent again, in order, when `connected` turns true.
 */
export function useOutbox(session: ChatSession, connected: boolean) {
  const [outbox, dispatch] = useReducer(outboxReducer, []);
  const wasConnected = useRef(connected);
  const sendText = useCallback(
    (roomId: string, txnId: string, text: string) => session.sendText(roomId, txnId, text),
    [session]
  );

  useEffect(() => {
    const reconnected = connected && !wasConnected.current;
    wasConnected.current = connected;
    if (!reconnected) return;
    const queued = awaitingReconnect(outbox);
    if (queued.length > 0) void resendInOrder(sendText, queued, dispatch);
  }, [connected, outbox, sendText]);

  const send = useCallback(
    (roomId: string, text: string) => {
      const message = { txnId: newTxnId(), roomId, text, createdAt: Date.now() };
      dispatch({ type: 'send', ...message });
      void deliver(sendText, message, dispatch);
    },
    [sendText]
  );

  const retry = useCallback(
    (message: OutgoingMessage) => {
      dispatch({ type: 'retry', txnId: message.txnId });
      void deliver(sendText, message, dispatch);
    },
    [sendText]
  );

  return { outbox, send, retry };
}
