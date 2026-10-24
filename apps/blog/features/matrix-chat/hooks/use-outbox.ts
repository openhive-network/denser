import { useCallback, useReducer } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { deliver, outboxReducer, type OutgoingMessage } from '@/blog/features/matrix-chat/lib/outbox';

const newTxnId = () => `denser.${Date.now()}.${crypto.randomUUID()}`;

/** Messages the composer sends, with their sending and failed states, and retrying a failed one */
export function useOutbox(session: ChatSession) {
  const [outbox, dispatch] = useReducer(outboxReducer, []);
  const sendText = useCallback(
    (roomId: string, txnId: string, text: string) => session.sendText(roomId, txnId, text),
    [session]
  );

  const send = useCallback(
    (roomId: string, text: string) => {
      const message = { txnId: newTxnId(), roomId, text };
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
