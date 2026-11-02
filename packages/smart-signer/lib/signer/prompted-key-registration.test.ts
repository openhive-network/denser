import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/validators/key-role-hint': new URL('../validators/key-role-hint.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { promptedKeyRegistration } = await import('./prompted-key-registration.ts');

const ACTIVE_HINT = 'login_form.zod_error.key_without_active_authority';
const POSTING_HINT = 'login_form.zod_error.active_key_for_posting';
const WIF = '5Jg6Um6AvJZ886UWQnNBfqScNo9f8PtGWecXo7gZS29FoVgektM';

const refusing = (message: string) => async () => {
  throw new Error(message);
};

describe('promptedKeyRegistration', () => {
  it('registers the entered key and closes the prompt', async () => {
    const entered: string[] = [];
    const registration = promptedKeyRegistration('active', async (wif) => {
      entered.push(wif);
    });
    assert.equal(await registration.validateKey(WIF), null);
    assert.deepEqual(entered, [WIF]);
    assert.doesNotThrow(() => registration.throwFailure());
  });

  it("keeps the prompt open with the active-key hint for hb-auth's Invalid credentials", async () => {
    const registration = promptedKeyRegistration('active', refusing('Invalid credentials'));
    assert.equal(await registration.validateKey(WIF), ACTIVE_HINT);
    assert.doesNotThrow(() => registration.throwFailure());
  });

  it('closes the prompt once another key registers after a refused one', async () => {
    let attempt = 0;
    const registration = promptedKeyRegistration('active', async () => {
      if (attempt++ === 0) throw new Error('Invalid credentials');
    });
    assert.equal(await registration.validateKey(WIF), ACTIVE_HINT);
    assert.equal(await registration.validateKey(WIF), null);
    assert.doesNotThrow(() => registration.throwFailure());
  });

  it('names the role the chain found missing', async () => {
    const registration = promptedKeyRegistration('posting', refusing('Missing Posting Authority alice'));
    assert.equal(await registration.validateKey(WIF), POSTING_HINT);
  });

  for (const message of ['Invalid password', 'Invalid WIF format']) {
    it(`closes the prompt on ${message}, leaving the error to throwFailure`, async () => {
      const registration = promptedKeyRegistration('active', refusing(message));
      assert.equal(await registration.validateKey(WIF), null);
      assert.throws(() => registration.throwFailure(), { message });
    });
  }

  it('has no hint for the owner key', async () => {
    const registration = promptedKeyRegistration('owner', refusing('Invalid credentials'));
    assert.equal(await registration.validateKey(WIF), null);
    assert.throws(() => registration.throwFailure(), { message: 'Invalid credentials' });
  });
});
