import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { readiness } = await import('./use-lite-gateway-health.ts');

type Health = NonNullable<Parameters<typeof readiness>[0]>;

const health = (overrides: Partial<Health> = {}): Health => ({
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: {
    default: {
      reply: { ready: true, available_in_s: 0 },
      root: { ready: true, available_in_s: 0, queue_len: 0, queue_depth: 50, can_queue: true, queue_wait_s: 0 }
    }
  },
  ...overrides
});

describe('readiness', () => {
  it('is ok for a healthy gateway whose pool is ready', () => {
    assert.deepEqual(readiness(health(), 'reply'), { ok: true, canQueue: undefined, queueWaitS: undefined });
    assert.deepEqual(readiness(health(), 'root'), { ok: true, canQueue: true, queueWaitS: 0 });
  });

  it('is ok when the gateway is degraded but the reply lane is ready', () => {
    assert.equal(readiness(health({ status: 'degraded' }), 'reply').ok, true);
  });

  it('is busy with the wait the gateway names when the lane is not ready', () => {
    const busy = health({ pools: { default: { reply: { ready: false, available_in_s: 42 } } } });
    assert.deepEqual(readiness(busy, 'reply'), { ok: false, reason: 'busy', availableInS: 42, canQueue: undefined, queueWaitS: undefined });
  });

  it('is busy without a wait when the gateway gives none', () => {
    const busy = health({ pools: { default: { reply: { ready: false } } } });
    assert.equal(readiness(busy, 'reply').reason, 'busy');
    assert.equal(readiness(busy, 'reply').availableInS, undefined);
  });

  it('takes a root post into a queue that can take it, and refuses one that cannot', () => {
    const queueing = health({ pools: { default: { root: { ready: false, available_in_s: 30, can_queue: true, queue_wait_s: 12 } } } });
    assert.deepEqual(readiness(queueing, 'root'), { ok: true, canQueue: true, queueWaitS: 12 });
    const full = health({ pools: { default: { root: { ready: false, available_in_s: 30, can_queue: false, queue_wait_s: 90 } } } });
    assert.deepEqual(readiness(full, 'root'), { ok: false, reason: 'busy', availableInS: 30, canQueue: false, queueWaitS: 90 });
  });

  it('is down for a down gateway or no answer at all', () => {
    assert.deepEqual(readiness({ status: 'down' }, 'reply'), { ok: false, reason: 'down' });
    assert.deepEqual(readiness(health({ status: 'down' }), 'reply'), { ok: false, reason: 'down' });
    assert.deepEqual(readiness(undefined, 'reply'), { ok: false, reason: 'down' });
  });

  it('is not ok when the pool or its lane is missing', () => {
    assert.deepEqual(readiness(health(), 'reply', 'premium'), { ok: false, reason: 'down' });
    assert.deepEqual(readiness(health({ pools: undefined }), 'reply'), { ok: false, reason: 'down' });
    assert.deepEqual(readiness(health({ status: 'degraded', pools: { default: {} } }), 'reply'), { ok: false, reason: 'degraded' });
  });

  it('is not ok when the gateway hived is down or stale, whatever the pool says', () => {
    assert.deepEqual(readiness(health({ hived: { ok: false } }), 'reply'), { ok: false, reason: 'hived' });
    assert.deepEqual(readiness(health({ hived: { ok: true, stale: true, head_block_age_s: 120 } }), 'reply'), { ok: false, reason: 'hived' });
  });

  it('ignores a negative or non-numeric wait', () => {
    const odd = health({ pools: { default: { reply: { ready: false, available_in_s: -1 } } } });
    assert.equal(readiness(odd, 'reply').availableInS, undefined);
  });
});
