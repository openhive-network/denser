import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { WaxExternalSignatureProviderError } from '@hiveio/wax-signers-external';

// Under node's type stripping the `@ui/` and `@smart-signer/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@ui/lib/user-cancelled': new URL('../../../ui/lib/user-cancelled.ts', import.meta.url).href,
  '@smart-signer/lib/signer/google-drive-wallet-errors': new URL('./google-drive-wallet-errors.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { needsFreshPasswordCheck, signAfterFreshPassword } = await import('./google-drive-fresh-check.ts');

const missingKey = new WaxExternalSignatureProviderError('No key found for account: guest4test1', undefined, 'KEY_NOT_FOUND');

/** A prompt answering `answers` in turn, recording how often it was shown */
function prompt(...answers: Array<string | Error>) {
  const shown = { count: 0 };
  const ask = async () => {
    const answer = answers[shown.count++];
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { ask, shown };
}

describe('needsFreshPasswordCheck', () => {
  it('asks for the password before active and owner operations', () => {
    assert.equal(needsFreshPasswordCheck('active'), true);
    assert.equal(needsFreshPasswordCheck('owner'), true);
  });

  it('signs posting operations without asking', () => {
    assert.equal(needsFreshPasswordCheck('posting'), false);
  });
});

describe('signAfterFreshPassword', () => {
  it('signs with the password the prompt answered', async () => {
    const signed: string[] = [];
    await signAfterFreshPassword(prompt('secret').ask, async (password) => void signed.push(password), () => {
      assert.fail('no new Google sign-in expected');
    });
    assert.deepEqual(signed, ['secret']);
  });

  it('signs nothing when the prompt is closed', async () => {
    const signed: string[] = [];
    await assert.rejects(
      signAfterFreshPassword(prompt(new Error('No password from user')).ask, async (password) => void signed.push(password), () => {}),
      { message: 'No password from user' }
    );
    assert.deepEqual(signed, []);
  });

  it('asks again for the next operation instead of reusing the last answer', async () => {
    const { ask, shown } = prompt('first', 'second');
    const signed: string[] = [];
    await signAfterFreshPassword(ask, async (password) => void signed.push(password), () => {});
    await signAfterFreshPassword(ask, async (password) => void signed.push(password), () => {});
    assert.equal(shown.count, 2);
    assert.deepEqual(signed, ['first', 'second']);
  });

  it('signs in to Google again and retries with the same answer when the Google session failed', async () => {
    const { ask, shown } = prompt('secret');
    const attempts: string[] = [];
    let signedInAgain = 0;
    await signAfterFreshPassword(
      ask,
      async (password) => {
        attempts.push(password);
        if (attempts.length === 1) throw new Error('Failed to refresh Google Drive access token');
      },
      () => void signedInAgain++
    );
    assert.equal(shown.count, 1);
    assert.equal(signedInAgain, 1);
    assert.deepEqual(attempts, ['secret', 'secret']);
  });

  it('does not sign in again when the wallet file answered', async () => {
    let attempts = 0;
    await assert.rejects(
      signAfterFreshPassword(
        prompt('secret').ask,
        async () => {
          attempts++;
          throw missingKey;
        },
        () => assert.fail('no new Google sign-in expected')
      ),
      missingKey
    );
    assert.equal(attempts, 1);
  });
});
