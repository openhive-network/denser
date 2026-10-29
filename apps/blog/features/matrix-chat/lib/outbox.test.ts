import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deliver, outboxReducer, pendingInRoom, type OutboxAction, type OutgoingMessage } from './outbox.ts';

const ROOM = '!general:example.org';
const SENT_AT = 1_793_000_000_000;

/** Runs `actions` through the reducer the way the composer's hook does */
function outboxAfter(actions: OutboxAction[]): OutgoingMessage[] {
  return actions.reduce<OutgoingMessage[]>(outboxReducer, []);
}

async function deliverInto(outbox: OutgoingMessage[], send: (roomId: string, txnId: string, text: string) => Promise<string>) {
  const actions: OutboxAction[] = [];
  const message = outbox[0];
  await deliver(send, message, (action) => actions.push(action));
  return actions.reduce(outboxReducer, outbox);
}

describe('composer outbox', () => {
  it('shows a message as sending until the homeserver accepts it, then until the timeline has it', async () => {
    const sendCalls: string[][] = [];
    let outbox = outboxAfter([{ type: 'send', txnId: 'txn-1', roomId: ROOM, text: 'hi', createdAt: SENT_AT }]);
    assert.deepEqual(outbox, [{ txnId: 'txn-1', roomId: ROOM, text: 'hi', createdAt: SENT_AT, status: 'sending' }]);

    outbox = await deliverInto(outbox, async (...args) => {
      sendCalls.push(args);
      return '$sent';
    });

    assert.deepEqual(sendCalls, [[ROOM, 'txn-1', 'hi']]);
    assert.deepEqual(outbox, [{ txnId: 'txn-1', roomId: ROOM, text: 'hi', createdAt: SENT_AT, status: 'sent', eventId: '$sent' }]);
    assert.equal(pendingInRoom(outbox, ROOM, new Set(['$older'])).length, 1);
    assert.deepEqual(pendingInRoom(outbox, ROOM, new Set(['$older', '$sent'])), []);
  });

  it('marks a message failed when sending it fails, and a retry sends it again with the same transaction id', async () => {
    let outbox = outboxAfter([{ type: 'send', txnId: 'txn-1', roomId: ROOM, text: 'hi', createdAt: SENT_AT }]);
    outbox = await deliverInto(outbox, () => Promise.reject(new Error('offline')));
    assert.equal(outbox[0].status, 'failed');
    assert.equal(pendingInRoom(outbox, ROOM, new Set()).length, 1);

    outbox = outboxReducer(outbox, { type: 'retry', txnId: 'txn-1' });
    assert.equal(outbox[0].status, 'sending');
    const retried: string[] = [];
    outbox = await deliverInto(outbox, async (_roomId, txnId) => {
      retried.push(txnId);
      return '$sent';
    });
    assert.deepEqual(retried, ['txn-1']);
    assert.equal(outbox[0].status, 'sent');
  });

  it('retries only failed messages and keeps each room to its own', () => {
    const outbox = outboxAfter([
      { type: 'send', txnId: 'a', roomId: ROOM, text: 'one', createdAt: SENT_AT },
      { type: 'send', txnId: 'b', roomId: '!lobby:example.org', text: 'two', createdAt: SENT_AT },
      { type: 'retry', txnId: 'a' }
    ]);
    assert.deepEqual(
      outbox.map((message) => message.status),
      ['sending', 'sending']
    );
    assert.deepEqual(
      pendingInRoom(outbox, ROOM, new Set()).map((message) => message.txnId),
      ['a']
    );
  });
});
