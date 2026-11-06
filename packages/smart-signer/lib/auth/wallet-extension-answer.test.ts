import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  awaitWalletExtensionAnswer,
  WALLET_EXTENSION_ANSWER_TIMEOUT_MS,
  WalletExtensionTimeoutError
} from './wallet-extension-answer.ts';

/** A request the extension never answers */
const NEVER_ANSWERED = new Promise<string>(() => {});

/** Whether `promise` has settled once pending callbacks have run */
async function hasSettled(promise: Promise<unknown>): Promise<boolean> {
  const pending = Symbol('pending');
  const outcome = await Promise.race([promise.then(() => 'settled', () => 'settled'), Promise.resolve(pending)]);
  return outcome !== pending;
}

describe('awaitWalletExtensionAnswer', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  it('resolves with the answer of an extension that answers in time', async () => {
    let answer: (signature: string) => void = () => {};
    const request = new Promise<string>((resolve) => (answer = resolve));
    const waiting = awaitWalletExtensionAnswer(request);

    mock.timers.tick(WALLET_EXTENSION_ANSWER_TIMEOUT_MS - 1);
    answer('signature');
    assert.equal(await waiting, 'signature');
  });

  it('passes on the error of an extension that rejects the request', async () => {
    const rejected = Promise.reject(new Error('User ignored this transaction'));
    await assert.rejects(awaitWalletExtensionAnswer(rejected), /User ignored this transaction/);
  });

  it('stops waiting for an extension that never answers once the timeout passes', async () => {
    const waiting = awaitWalletExtensionAnswer(NEVER_ANSWERED);

    mock.timers.tick(WALLET_EXTENSION_ANSWER_TIMEOUT_MS - 1);
    assert.equal(await hasSettled(waiting), false);

    mock.timers.tick(1);
    await assert.rejects(waiting, WalletExtensionTimeoutError);
  });
});
