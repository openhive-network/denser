import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  awaitingReconnect,
  deliver,
  outboxReducer,
  pendingInRoom,
  resendInOrder,
  type OutboxAction,
  type OutgoingMessage
} from './outbox.ts';
import { ChatUnreachableError } from './matrix-chat-sign-in.ts';

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
    outbox = await deliverInto(outbox, () => Promise.reject(new Error('M_FORBIDDEN')));
    assert.equal(outbox[0].status, 'failed');
    assert.equal(outbox[0].failure, 'rejected');
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
    assert.equal(outbox[0].failure, undefined);
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

  describe('on reconnecting', () => {
    const unreachable = () => Promise.reject(new ChatUnreachableError('fetch failed'));
    const rejected = () => Promise.reject(new Error('M_TOO_LARGE'));

    /** Sends each of `texts` and fails it with `sendOf(text)` */
    async function failedOutbox(texts: string[], sendOf: (text: string) => () => Promise<string>) {
      let outbox = outboxAfter(
        texts.map((text, index) => ({ type: 'send', txnId: `txn-${text}`, roomId: ROOM, text, createdAt: SENT_AT + index }))
      );
      for (const message of outbox) {
        const actions: OutboxAction[] = [];
        await deliver(sendOf(message.text), message, (action) => actions.push(action));
        outbox = actions.reduce(outboxReducer, outbox);
      }
      return outbox;
    }

    async function resend(outbox: OutgoingMessage[], send: (roomId: string, txnId: string, text: string) => Promise<string>) {
      const statuses: string[][] = [];
      let current = outbox;
      await resendInOrder(send, awaitingReconnect(outbox), (action) => {
        current = outboxReducer(current, action);
        statuses.push(current.map((message) => message.status));
      });
      return { outbox: current, statuses };
    }

    it('sends the messages that could not reach the homeserver again, once each, in order, with their transaction ids', async () => {
      const outbox = await failedOutbox(['one', 'two'], () => unreachable);
      assert.deepEqual(
        outbox.map((message) => [message.status, message.failure]),
        [
          ['failed', 'unreachable'],
          ['failed', 'unreachable']
        ]
      );

      const sends: string[][] = [];
      const resent = await resend(outbox, async (roomId, txnId, text) => {
        sends.push([roomId, txnId, text]);
        return `$${txnId}`;
      });

      assert.deepEqual(sends, [
        [ROOM, 'txn-one', 'one'],
        [ROOM, 'txn-two', 'two']
      ]);
      assert.deepEqual(resent.statuses[1], ['sending', 'sending']);
      assert.deepEqual(
        resent.outbox.map((message) => [message.status, message.eventId]),
        [
          ['sent', '$txn-one'],
          ['sent', '$txn-two']
        ]
      );
      assert.deepEqual(awaitingReconnect(resent.outbox), []);
    });

    it('leaves a message the homeserver rejected to the retry button', async () => {
      const outbox = await failedOutbox(['big', 'lost'], (text) => (text === 'big' ? rejected : unreachable));
      assert.deepEqual(
        awaitingReconnect(outbox).map((message) => message.txnId),
        ['txn-lost']
      );

      const sends: string[] = [];
      const resent = await resend(outbox, async (_roomId, txnId) => {
        sends.push(txnId);
        return '$sent';
      });

      assert.deepEqual(sends, ['txn-lost']);
      assert.deepEqual(
        resent.outbox.map((message) => [message.status, message.failure]),
        [
          ['failed', 'rejected'],
          ['sent', undefined]
        ]
      );
    });

    it('stops at a message that still cannot reach the homeserver, keeping it and those after it for the next reconnection', async () => {
      const outbox = await failedOutbox(['one', 'two', 'three'], () => unreachable);
      const sends: string[] = [];
      const resent = await resend(outbox, (_roomId, txnId) => {
        sends.push(txnId);
        return unreachable();
      });

      assert.deepEqual(sends, ['txn-one']);
      assert.deepEqual(
        awaitingReconnect(resent.outbox).map((message) => message.txnId),
        ['txn-one', 'txn-two', 'txn-three']
      );
    });
  });
});
