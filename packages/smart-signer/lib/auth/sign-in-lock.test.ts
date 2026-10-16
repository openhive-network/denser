import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runExclusiveSignIn } from './sign-in-lock.ts';

function deferred() {
  let resolve = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** What a mounted sign-in form does with the lock: one request per call it is allowed to make. */
function mountForm(requests: string[], name: string) {
  return (request: Promise<void>) =>
    runExclusiveSignIn(async () => {
      requests.push(name);
      await request;
    });
}

describe('runExclusiveSignIn', () => {
  it('sends no second request from a remounted form while the first is pending', async () => {
    const requests: string[] = [];
    const firstRequest = deferred();
    const first = mountForm(requests, 'first form')(firstRequest.promise);

    // The dialog closed (the first form unmounted) and reopened with a new form
    let secondSettled = false;
    const second = mountForm(requests, 'remounted form')(Promise.resolve()).then((ran) => {
      secondSettled = true;
      return ran;
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(requests, ['first form']);
    assert.equal(secondSettled, false, 'the refused sign-in waits for the pending one');

    firstRequest.resolve();
    assert.equal(await first, true);
    assert.equal(await second, false);
    assert.deepEqual(requests, ['first form']);
  });

  it('frees the lock when the pending request fails, leaving its error to its own caller', async () => {
    const requests: string[] = [];
    const firstRequest = deferred();
    const first = mountForm(requests, 'first form')(firstRequest.promise);
    const waiting = mountForm(requests, 'remounted form')(Promise.resolve());

    firstRequest.reject(new Error('Keychain error: User ignored this transaction'));
    await assert.rejects(first, /User ignored this transaction/);
    assert.equal(await waiting, false);

    assert.equal(await mountForm(requests, 'retry')(Promise.resolve()), true);
    assert.deepEqual(requests, ['first form', 'retry']);
  });
});
