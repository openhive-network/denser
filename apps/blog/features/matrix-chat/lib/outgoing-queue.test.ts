import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as settled } from 'node:timers/promises';
import { OutgoingQueue, RESEND_BACKOFF_MS } from './outgoing-queue.ts';
import { ChatUnreachableError } from './matrix-chat-sign-in.ts';

const ROOM = '!general:example.org';

/** Timers the test fires by hand */
function manualTimers() {
  const pending: { ms: number; callback: () => void }[] = [];
  return {
    pending,
    schedule(callback: () => void, ms: number) {
      const timer = { ms, callback };
      pending.push(timer);
      return () => pending.splice(pending.indexOf(timer), 1);
    },
    async fireNext() {
      const timer = pending.shift();
      assert.ok(timer, 'a resend is scheduled');
      timer.callback();
      await settled();
    }
  };
}

interface Attempt {
  txnId: string;
  succeed: () => void;
  failUnreachable: () => void;
}

/**
 * A homeserver the test drives: while `online` each send succeeds at once, while not it fails as
 * unreachable, and while `holding` each send waits until the test settles its attempt
 */
function homeserver() {
  const server = {
    online: false,
    holding: false,
    attempts: [] as string[],
    delivered: [] as string[],
    held: [] as Attempt[],
    send(_roomId: string, txnId: string): Promise<string> {
      server.attempts.push(txnId);
      const succeed = () => {
        server.delivered.push(txnId);
        return `$${txnId}`;
      };
      const unreachable = () => new ChatUnreachableError('fetch failed');
      if (server.holding) {
        return new Promise((resolve, reject) => {
          server.held.push({ txnId, succeed: () => resolve(succeed()), failUnreachable: () => reject(unreachable()) });
        });
      }
      return server.online ? Promise.resolve(succeed()) : Promise.reject(unreachable());
    }
  };
  return server;
}

function queueOn(server: ReturnType<typeof homeserver>, timers: ReturnType<typeof manualTimers>) {
  let next = 0;
  return new OutgoingQueue(server.send, { schedule: timers.schedule, newTxnId: () => `txn-${++next}` });
}

const statuses = (queue: OutgoingQueue) => queue.getMessages().map((message) => [message.txnId, message.status]);

describe('outgoing queue', () => {
  it('retries a message that failed as unreachable while connected, with no reconnection, until delivered once', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.setConnected(true);

    queue.send(ROOM, 'hi');
    await settled();
    assert.deepEqual(statuses(queue), [['txn-1', 'failed']]);
    assert.deepEqual(
      timers.pending.map((timer) => timer.ms),
      [RESEND_BACKOFF_MS[0]]
    );

    await timers.fireNext();
    assert.deepEqual(statuses(queue), [['txn-1', 'failed']]);
    assert.deepEqual(
      timers.pending.map((timer) => timer.ms),
      [RESEND_BACKOFF_MS[1]]
    );

    server.online = true;
    await timers.fireNext();
    assert.deepEqual(statuses(queue), [['txn-1', 'sent']]);
    assert.deepEqual(server.attempts, ['txn-1', 'txn-1', 'txn-1']);
    assert.deepEqual(server.delivered, ['txn-1']);
    assert.deepEqual(timers.pending, []);
  });

  it('resends several unreachable messages in one retry, in order, with their transaction ids', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.setConnected(true);
    queue.send(ROOM, 'one');
    queue.send(ROOM, 'two');
    await settled();
    assert.equal(timers.pending.length, 1);

    server.online = true;
    await timers.fireNext();
    assert.deepEqual(server.delivered, ['txn-1', 'txn-2']);
    assert.deepEqual(statuses(queue), [
      ['txn-1', 'sent'],
      ['txn-2', 'sent']
    ]);
  });

  it('stops retrying after the last backoff delay until the next reconnection', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.setConnected(true);
    queue.send(ROOM, 'hi');
    await settled();

    const delays: number[] = [];
    while (timers.pending.length > 0) {
      delays.push(timers.pending[0].ms);
      await timers.fireNext();
    }
    assert.deepEqual(delays, [...RESEND_BACKOFF_MS]);
    assert.equal(server.attempts.length, 1 + RESEND_BACKOFF_MS.length);

    queue.setConnected(false);
    server.online = true;
    queue.setConnected(true);
    await settled();
    assert.deepEqual(server.delivered, ['txn-1']);
  });

  it('drops a scheduled retry on disconnecting, leaving the message to the reconnection', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.setConnected(true);
    queue.send(ROOM, 'hi');
    await settled();
    assert.equal(timers.pending.length, 1);

    queue.setConnected(false);
    assert.deepEqual(timers.pending, []);
    server.online = true;
    queue.setConnected(true);
    await settled();
    assert.deepEqual(server.delivered, ['txn-1']);
    assert.deepEqual(timers.pending, []);
  });

  it('delivers by the next retry, once, a message that was sending at reconnection and then failed as unreachable', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.send(ROOM, 'offline');
    await settled();
    server.holding = true;
    queue.send(ROOM, 'in flight');
    assert.deepEqual(statuses(queue), [
      ['txn-1', 'failed'],
      ['txn-2', 'sending']
    ]);

    queue.setConnected(true);
    assert.deepEqual(
      server.held.map((attempt) => attempt.txnId),
      ['txn-2', 'txn-1']
    );
    server.held[1].succeed();
    await settled();
    server.held[0].failUnreachable();
    await settled();
    assert.deepEqual(statuses(queue), [
      ['txn-1', 'sent'],
      ['txn-2', 'failed']
    ]);

    server.holding = false;
    server.online = true;
    await timers.fireNext();
    assert.deepEqual(server.delivered, ['txn-1', 'txn-2']);
    assert.deepEqual(statuses(queue)[1], ['txn-2', 'sent']);
    assert.deepEqual(timers.pending, []);
  });

  it('a message failing as unreachable while the reconnection resend runs joins the next retry', async () => {
    const server = homeserver();
    const timers = manualTimers();
    const queue = queueOn(server, timers);
    queue.send(ROOM, 'offline');
    await settled();
    server.holding = true;
    queue.setConnected(true);
    queue.send(ROOM, 'during');
    const [resent, during] = server.held;
    assert.deepEqual([resent.txnId, during.txnId], ['txn-1', 'txn-2']);

    during.failUnreachable();
    await settled();
    assert.equal(timers.pending.length, 0, 'the running resend schedules the retry when it ends');
    resent.succeed();
    await settled();
    assert.deepEqual(
      timers.pending.map((timer) => timer.ms),
      [RESEND_BACKOFF_MS[0]]
    );

    server.holding = false;
    server.online = true;
    await timers.fireNext();
    assert.deepEqual(server.delivered, ['txn-1', 'txn-2']);
    assert.deepEqual(server.attempts, ['txn-1', 'txn-1', 'txn-2', 'txn-2']);
  });

  it('never resends a message the homeserver rejected, leaving it to the retry button', async () => {
    const attempts: string[] = [];
    let rejecting = true;
    const timers = manualTimers();
    const queue = new OutgoingQueue(
      async (_roomId, txnId) => {
        attempts.push(txnId);
        if (rejecting) throw new Error('M_FORBIDDEN');
        return `$${txnId}`;
      },
      { schedule: timers.schedule, newTxnId: () => 'txn-1' }
    );
    queue.setConnected(true);
    queue.send(ROOM, 'hi');
    await settled();
    assert.equal(queue.getMessages()[0].failure, 'rejected');
    assert.deepEqual(timers.pending, []);

    queue.setConnected(false);
    queue.setConnected(true);
    await settled();
    assert.deepEqual(attempts, ['txn-1']);

    rejecting = false;
    queue.retry('txn-1');
    queue.retry('txn-1');
    await settled();
    assert.deepEqual(attempts, ['txn-1', 'txn-1']);
    assert.deepEqual(statuses(queue), [['txn-1', 'sent']]);
  });
});
