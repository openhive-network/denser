import { ChatUnreachableError } from './matrix-chat-sign-in.ts';

/**
 * Why sending a message failed: `unreachable` (no connection, or a server error or rate limit) is
 * sent again once the chat reconnects; `rejected` waits for the user's retry
 */
export type SendFailure = 'unreachable' | 'rejected';

/** A message the composer sent, until the room's timeline has it */
export interface OutgoingMessage {
  txnId: string;
  roomId: string;
  text: string;
  /** When the composer sent it, in ms since the epoch */
  createdAt: number;
  status: 'sending' | 'failed' | 'sent';
  /** Set while `status` is `failed` */
  failure?: SendFailure;
  /** Set once the homeserver accepted it */
  eventId?: string;
}

export type OutboxAction =
  | { type: 'send'; txnId: string; roomId: string; text: string; createdAt: number }
  | { type: 'sent'; txnId: string; eventId: string }
  | { type: 'failed'; txnId: string; failure: SendFailure }
  | { type: 'retry'; txnId: string };

export type SendText = (roomId: string, txnId: string, text: string) => Promise<string>;

export function outboxReducer(outbox: readonly OutgoingMessage[], action: OutboxAction): OutgoingMessage[] {
  if (action.type === 'send') {
    const { txnId, roomId, text, createdAt } = action;
    return [...outbox, { txnId, roomId, text, createdAt, status: 'sending' }];
  }
  return outbox.map((message) => {
    if (message.txnId !== action.txnId) return message;
    if (action.type === 'sent') return { ...withoutFailure(message), status: 'sent', eventId: action.eventId };
    if (action.type === 'failed') return { ...message, status: 'failed', failure: action.failure };
    return message.status === 'failed' ? { ...withoutFailure(message), status: 'sending' } : message;
  });
}

function withoutFailure({ failure: _failure, ...message }: OutgoingMessage): OutgoingMessage {
  return message;
}

/**
 * Sends `message` (again, on a retry: the same transaction id makes the homeserver keep one copy)
 * and reports how it went. Resolves to why it failed, or null once sent.
 */
export async function deliver(
  send: SendText,
  message: Pick<OutgoingMessage, 'txnId' | 'roomId' | 'text'>,
  dispatch: (action: OutboxAction) => void
): Promise<SendFailure | null> {
  try {
    const eventId = await send(message.roomId, message.txnId, message.text);
    dispatch({ type: 'sent', txnId: message.txnId, eventId });
    return null;
  } catch (error) {
    const failure = error instanceof ChatUnreachableError ? 'unreachable' : 'rejected';
    dispatch({ type: 'failed', txnId: message.txnId, failure });
    return failure;
  }
}

/** The messages that failed for want of a connection, oldest first, to send again on reconnecting */
export function awaitingReconnect(outbox: readonly OutgoingMessage[]): OutgoingMessage[] {
  return outbox.filter((message) => message.status === 'failed' && message.failure === 'unreachable');
}

/**
 * Sends `messages` again, one after another in their order, each shown as sending until its turn
 * comes. When one cannot reach the homeserver, those after it fail with it, keeping their order
 * for the next reconnection.
 */
export async function resendInOrder(
  send: SendText,
  messages: readonly OutgoingMessage[],
  dispatch: (action: OutboxAction) => void
): Promise<void> {
  for (const message of messages) dispatch({ type: 'retry', txnId: message.txnId });
  for (const [index, message] of messages.entries()) {
    if ((await deliver(send, message, dispatch)) !== 'unreachable') continue;
    for (const rest of messages.slice(index + 1)) dispatch({ type: 'failed', txnId: rest.txnId, failure: 'unreachable' });
    return;
  }
}

/** The room's outgoing messages its timeline does not show yet */
export function pendingInRoom(
  outbox: readonly OutgoingMessage[],
  roomId: string,
  timelineEventIds: ReadonlySet<string>
): OutgoingMessage[] {
  return outbox.filter(
    (message) => message.roomId === roomId && !(message.eventId && timelineEventIds.has(message.eventId))
  );
}
