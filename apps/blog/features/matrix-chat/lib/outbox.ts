/** A message the composer sent, until the room's timeline has it */
export interface OutgoingMessage {
  txnId: string;
  roomId: string;
  text: string;
  status: 'sending' | 'failed' | 'sent';
  /** Set once the homeserver accepted it */
  eventId?: string;
}

export type OutboxAction =
  | { type: 'send'; txnId: string; roomId: string; text: string }
  | { type: 'sent'; txnId: string; eventId: string }
  | { type: 'failed'; txnId: string }
  | { type: 'retry'; txnId: string };

export type SendText = (roomId: string, txnId: string, text: string) => Promise<string>;

export function outboxReducer(outbox: readonly OutgoingMessage[], action: OutboxAction): OutgoingMessage[] {
  if (action.type === 'send') {
    return [...outbox, { txnId: action.txnId, roomId: action.roomId, text: action.text, status: 'sending' }];
  }
  return outbox.map((message) => {
    if (message.txnId !== action.txnId) return message;
    if (action.type === 'sent') return { ...message, status: 'sent', eventId: action.eventId };
    if (action.type === 'failed') return { ...message, status: 'failed' };
    return message.status === 'failed' ? { ...message, status: 'sending' } : message;
  });
}

/**
 * Sends `message` (again, on a retry: the same transaction id makes the homeserver keep one copy)
 * and reports how it went.
 */
export async function deliver(
  send: SendText,
  message: Pick<OutgoingMessage, 'txnId' | 'roomId' | 'text'>,
  dispatch: (action: OutboxAction) => void
): Promise<void> {
  try {
    const eventId = await send(message.roomId, message.txnId, message.text);
    dispatch({ type: 'sent', txnId: message.txnId, eventId });
  } catch {
    dispatch({ type: 'failed', txnId: message.txnId });
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
