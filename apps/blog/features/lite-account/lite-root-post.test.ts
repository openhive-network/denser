import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  formatWait,
  initialQueueView,
  isPersistedLiteQueue,
  liteRootPostPath,
  persistedQueueTtlMs,
  queueViewReducer,
  relayErrorCode,
  rootPostErrorKey,
  rootPostExpirationMinutes,
  secondsUntil
} = await import('./lite-root-post.ts');

type Queued = Parameters<typeof initialQueueView>[0];
type View = Parameters<typeof queueViewReducer>[0];
type Event = Parameters<typeof queueViewReducer>[1];

const queued: Queued = {
  ok: false,
  code: 'queued',
  queue_id: 'q1',
  due_at: '2026-10-19T12:05:00.000Z',
  retry_after_s: 30,
  message: 'queued'
};
const comment = { parent_author: '', parent_permlink: 'lite-test', title: 'Hello', body: 'World', tags: ['lite-test'] };
const posted = { ok: true as const, trx_id: 'abc', l1_author: 'test-gateway-2', permlink: 'hello-1a2b3cxyzw' };

const run = (events: Event[], from: View = initialQueueView(queued)) => events.reduce(queueViewReducer, from);

describe('queueViewReducer', () => {
  it('starts queued at the ticket due time, with the position when the 202 names one', () => {
    assert.deepEqual(initialQueueView(queued), { status: 'queued', dueAt: queued.due_at, position: undefined });
    assert.deepEqual(initialQueueView({ ...queued, position: 3 } as Queued), { status: 'queued', dueAt: queued.due_at, position: 3 });
  });

  it('follows queued → ready → done from the polled entries', () => {
    const base = { ok: true as const, id: 'q1', due_at: '2026-10-19T12:04:00.000Z' };
    const ready = run([{ type: 'entry', entry: { ...base, state: 'queued', position: 2, retry_after_s: 10 } }]);
    assert.deepEqual(ready, { status: 'queued', dueAt: base.due_at, position: 2 });
    const reserved = run([{ type: 'entry', entry: { ...base, state: 'ready', gate_account: 'test-gateway-3', ready_until: '2026-10-19T12:06:00.000Z' } }], ready);
    assert.equal(reserved.status, 'ready');
    assert.equal(reserved.status === 'ready' && reserved.gateAccount, 'test-gateway-3');
    const done = run([{ type: 'entry', entry: { ...base, state: 'done', trx_id: 'abc', l1_author: 'test-gateway-3', permlink: 'p' } }], reserved);
    assert.deepEqual(done, { status: 'done', result: { ok: true, trx_id: 'abc', l1_author: 'test-gateway-3', permlink: 'p' } });
  });

  it('ends expired with the reason, from an entry or from the wait failing with queue_expired', () => {
    const base = { ok: true as const, id: 'q1', due_at: queued.due_at };
    assert.deepEqual(run([{ type: 'entry', entry: { ...base, state: 'expired', reason: 'wait_exceeded' } }]), { status: 'expired', reason: 'wait_exceeded' });
    assert.deepEqual(run([{ type: 'failed', code: 'queue_expired', reason: 'sign_window_elapsed' }]), { status: 'expired', reason: 'sign_window_elapsed' });
  });

  it('ends cancelled on Cancel and on a wait that saw the entry cancelled', () => {
    assert.deepEqual(run([{ type: 'cancelled' }]), { status: 'cancelled' });
    assert.deepEqual(run([{ type: 'failed', code: 'queue_not_ready', reason: 'cancelled' }]), { status: 'cancelled' });
  });

  it('ends failed with the code on any other error', () => {
    assert.deepEqual(run([{ type: 'failed', code: 'broadcast_failed' }]), { status: 'failed', code: 'broadcast_failed' });
  });

  it('keeps a final state: a late poll answer cannot reopen it', () => {
    const late: Event = { type: 'entry', entry: { ok: true, id: 'q1', due_at: queued.due_at, state: 'queued', position: 1, retry_after_s: 5 } };
    assert.deepEqual(run([{ type: 'posted', result: posted }, late]), { status: 'done', result: posted });
    assert.deepEqual(run([{ type: 'cancelled' }, late, { type: 'posted', result: posted }]), { status: 'cancelled' });
    assert.deepEqual(run([{ type: 'failed', code: 'queue_expired' }, late]), { status: 'expired', reason: undefined });
  });
});

describe('countdown', () => {
  const now = Date.parse('2026-10-19T12:00:00.000Z');

  it('counts whole seconds up to the due time, rounding up, and stops at zero', () => {
    assert.equal(secondsUntil('2026-10-19T12:05:00.000Z', now), 300);
    assert.equal(secondsUntil('2026-10-19T12:00:00.200Z', now), 1);
    assert.equal(secondsUntil('2026-10-19T11:59:00.000Z', now), 0);
    assert.equal(secondsUntil('not a time', now), 0);
  });

  it('formats a wait as m:ss', () => {
    assert.equal(formatWait(0), '0:00');
    assert.equal(formatWait(9), '0:09');
    assert.equal(formatWait(300), '5:00');
    assert.equal(formatWait(3599.2), '60:00');
  });
});

describe('gateway limits', () => {
  it('signs for the gateway maximum expiration, else the library default', () => {
    assert.equal(rootPostExpirationMinutes({ max_expiration_minutes: 60 }), 60);
    assert.equal(rootPostExpirationMinutes(undefined), 10);
    assert.equal(rootPostExpirationMinutes({ max_expiration_minutes: 0 }), 10);
  });

  it('keeps a queued post for the longest wait plus the sign window', () => {
    assert.equal(persistedQueueTtlMs({ root_queue: { depth: 50, max_wait_s: 3600, sign_window_s: 120 } }), 3_720_000);
    assert.equal(persistedQueueTtlMs(undefined), 3_600_000);
  });
});

describe('isPersistedLiteQueue', () => {
  it('accepts the ticket with its exact root-post content', () => {
    assert.equal(isPersistedLiteQueue({ queued, comment }), true);
    assert.equal(isPersistedLiteQueue(JSON.parse(JSON.stringify({ queued, comment }))), true);
  });

  it('refuses anything a reload cannot resume', () => {
    assert.equal(isPersistedLiteQueue(null), false);
    assert.equal(isPersistedLiteQueue({ queued }), false);
    assert.equal(isPersistedLiteQueue({ queued: { ...queued, queue_id: '' }, comment }), false);
    assert.equal(isPersistedLiteQueue({ queued: { ...queued, code: 'rate_limited' }, comment }), false);
    assert.equal(isPersistedLiteQueue({ queued, comment: { ...comment, parent_author: 'alice' } }), false);
    assert.equal(isPersistedLiteQueue({ queued, comment: { ...comment, tags: [1] } }), false);
  });
});

describe('liteRootPostPath', () => {
  it('names the lite DID on a lite-aware node and the gate account elsewhere', () => {
    const p = { category: 'hive-123456', attester: 'brave-otter-42', result: posted };
    assert.equal(liteRootPostPath({ ...p, native: true }), '/hive-123456/@did:lite:brave-otter-42/hello-1a2b3cxyzw');
    assert.equal(liteRootPostPath({ ...p, native: false }), '/hive-123456/@test-gateway-2/hello-1a2b3cxyzw');
  });
});

describe('error mapping', () => {
  const relayError = (code: string, reason?: string) => Object.assign(new Error(code), { code, reason });

  it('reads the code and a known queue reason off a relay error, nothing off other errors', () => {
    assert.deepEqual(relayErrorCode(relayError('queue_expired', 'wait_exceeded')), { code: 'queue_expired', reason: 'wait_exceeded' });
    assert.deepEqual(relayErrorCode(relayError('quota_exceeded', 'whatever')), { code: 'quota_exceeded', reason: undefined });
    assert.equal(relayErrorCode(new Error('boom')), undefined);
    assert.equal(relayErrorCode({ code: 'quota_exceeded' }), undefined);
  });

  it('maps the gateway errors a user can act on to their own message', () => {
    for (const code of ['quota_exceeded', 'pool_busy', 'rate_limited', 'captcha_required', 'body_too_large', 'banned', 'permlink_taken', 'broadcast_failed', 'relay_unavailable']) {
      assert.equal(rootPostErrorKey(code), code);
    }
    assert.equal(rootPostErrorKey('captcha_failed'), 'captcha_required');
    assert.equal(rootPostErrorKey('bad_signature'), 'invalid_request');
    assert.equal(rootPostErrorKey('content_mismatch'), 'invalid_request');
  });

  it('explains a queue expiry by its reason and falls back to unknown', () => {
    assert.equal(rootPostErrorKey('queue_expired', 'sign_window_elapsed'), 'sign_window_elapsed');
    assert.equal(rootPostErrorKey('queue_expired', 'wait_exceeded'), 'wait_exceeded');
    assert.equal(rootPostErrorKey('queue_expired'), 'wait_exceeded');
    assert.equal(rootPostErrorKey('wrong_gateway'), 'unknown');
    assert.equal(rootPostErrorKey(undefined), 'unknown');
  });
});
