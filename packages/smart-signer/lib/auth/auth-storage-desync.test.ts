import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchAuthStorageDesync, subscribeAuthStorageDesync } from './auth-storage-desync.ts';

describe('subscribeAuthStorageDesync', () => {
  it('runs the shared handler once per desync, however many hooks subscribed', () => {
    const target = new EventTarget();
    const owner = {};
    let calls = 0;
    const unsubscribes = Array.from({ length: 185 }, () => subscribeAuthStorageDesync(owner, () => calls++, target));

    dispatchAuthStorageDesync(target);
    assert.equal(calls, 1);

    unsubscribes.forEach((unsubscribe) => unsubscribe());
  });

  it('keeps listening until the last subscription goes', () => {
    const target = new EventTarget();
    const owner = {};
    let calls = 0;
    const first = subscribeAuthStorageDesync(owner, () => calls++, target);
    const second = subscribeAuthStorageDesync(owner, () => calls++, target);

    first();
    first();
    dispatchAuthStorageDesync(target);
    assert.equal(calls, 1);

    second();
    dispatchAuthStorageDesync(target);
    assert.equal(calls, 1);
  });

  it('subscribes again after every subscription went', () => {
    const target = new EventTarget();
    const owner = {};
    let calls = 0;
    subscribeAuthStorageDesync(owner, () => calls++, target)();
    const unsubscribe = subscribeAuthStorageDesync(owner, () => (calls += 10), target);

    dispatchAuthStorageDesync(target);
    assert.equal(calls, 10);
    unsubscribe();
  });

  it('runs the handler of each owner', () => {
    const target = new EventTarget();
    const reset: string[] = [];
    const unsubscribeA = subscribeAuthStorageDesync({}, () => reset.push('a'), target);
    const unsubscribeB = subscribeAuthStorageDesync({}, () => reset.push('b'), target);

    dispatchAuthStorageDesync(target);
    assert.deepEqual(reset, ['a', 'b']);
    unsubscribeA();
    unsubscribeB();
  });
});
