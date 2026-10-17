import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  ABANDONED_SIGN_IN_TIMEOUT_MS,
  abandonPendingSignIn,
  cancelPendingSignIn,
  runExclusiveSignIn,
  SignInPendingError
} from './sign-in-lock.ts';

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

/** A sign-in the extension never answers */
const NEVER_ANSWERED = new Promise<void>(() => {});

const LOCALES_DIR = new URL('../../locales/', import.meta.url);

function translate(locale: string, key: string): unknown {
  const translations = JSON.parse(readFileSync(new URL(`${locale}/smart-signer.json`, LOCALES_DIR), 'utf8'));
  return key.split('.').reduce((node, part) => node?.[part], translations);
}

describe('runExclusiveSignIn', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => {
    cancelPendingSignIn();
    mock.timers.reset();
  });

  it('refuses a second request from a remounted form while the first is pending', async () => {
    const requests: string[] = [];
    const firstRequest = deferred();
    const first = mountForm(requests, 'first form')(firstRequest.promise);

    // The dialog closed (the first form unmounted) and reopened with a new form
    await assert.rejects(mountForm(requests, 'remounted form')(Promise.resolve()), SignInPendingError);
    assert.deepEqual(requests, ['first form']);

    firstRequest.resolve();
    await first;
    await mountForm(requests, 'retry')(Promise.resolve());
    assert.deepEqual(requests, ['first form', 'retry']);
  });

  it('gives a refused sign-in a message translated in every smart-signer locale', async () => {
    mountForm([], 'first form')(NEVER_ANSWERED);
    const refusal = await mountForm([], 'remounted form')(Promise.resolve()).then(
      () => assert.fail('the second sign-in was not refused'),
      (error: unknown) => error
    );
    assert.ok(refusal instanceof SignInPendingError);

    assert.match(String(translate('en', refusal.translationKey)), /^Another sign-in is still waiting for an answer/);
    for (const locale of readdirSync(LOCALES_DIR)) {
      const message = translate(locale, refusal.translationKey);
      assert.equal(typeof message, 'string', `${locale} lacks ${refusal.translationKey}`);
      assert.notEqual(message, '');
    }
  });

  it('frees the lock when the pending request fails, leaving its error to its own caller', async () => {
    const requests: string[] = [];
    const firstRequest = deferred();
    const first = mountForm(requests, 'first form')(firstRequest.promise);

    firstRequest.reject(new Error('Keychain error: User ignored this transaction'));
    await assert.rejects(first, /User ignored this transaction/);

    await mountForm(requests, 'retry')(Promise.resolve());
    assert.deepEqual(requests, ['first form', 'retry']);
  });

  it('frees the lock of a sign-in left behind by a closed dialog once the timeout passes', async () => {
    const requests: string[] = [];
    mountForm(requests, 'first form')(NEVER_ANSWERED);
    abandonPendingSignIn();

    mock.timers.tick(ABANDONED_SIGN_IN_TIMEOUT_MS - 1);
    await assert.rejects(mountForm(requests, 'too early')(Promise.resolve()), SignInPendingError);

    mock.timers.tick(1);
    await mountForm(requests, 'after timeout')(Promise.resolve());
    assert.deepEqual(requests, ['first form', 'after timeout']);
  });

  it('keeps the lock of a pending sign-in whose dialog stays open', async () => {
    mountForm([], 'first form')(NEVER_ANSWERED);
    mock.timers.tick(ABANDONED_SIGN_IN_TIMEOUT_MS * 10);
    await assert.rejects(mountForm([], 'second form')(Promise.resolve()), SignInPendingError);
  });

  it('frees the lock at once on an explicit cancel', async () => {
    const requests: string[] = [];
    mountForm(requests, 'first form')(NEVER_ANSWERED);
    cancelPendingSignIn();

    await mountForm(requests, 'after cancel')(Promise.resolve());
    assert.deepEqual(requests, ['first form', 'after cancel']);
  });

  it('does not let a freed sign-in that settles later free the lock of a newer one', async () => {
    const requests: string[] = [];
    const staleRequest = deferred();
    const stale = mountForm(requests, 'stale form')(staleRequest.promise);
    cancelPendingSignIn();

    const newerRequest = deferred();
    const newer = mountForm(requests, 'newer form')(newerRequest.promise);
    staleRequest.resolve();
    await stale;

    await assert.rejects(mountForm(requests, 'third form')(Promise.resolve()), SignInPendingError);
    newerRequest.resolve();
    await newer;
    assert.deepEqual(requests, ['stale form', 'newer form']);
  });

  it('does not let the timer of a settled sign-in free the lock of a newer one', async () => {
    const firstRequest = deferred();
    const first = mountForm([], 'first form')(firstRequest.promise);
    abandonPendingSignIn();
    firstRequest.resolve();
    await first;

    mountForm([], 'newer form')(NEVER_ANSWERED);
    mock.timers.tick(ABANDONED_SIGN_IN_TIMEOUT_MS);
    await assert.rejects(mountForm([], 'third form')(Promise.resolve()), SignInPendingError);
  });
});
