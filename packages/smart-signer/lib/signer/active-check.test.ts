import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { CheckCredential, KeyAuthorityType, PasskeyRecord } from '@hiveio/hb-auth';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/wrong-safe-storage-password': new URL('../wrong-safe-storage-password.ts', import.meta.url).href,
  '@smart-signer/lib/signer/sign-in-check': new URL('./sign-in-check.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { needsActiveCheck, signAsSettingAsks, signOrCheck, signWithActiveCheck } = await import('./active-check.ts');
const { withSignInCheck } = await import('./sign-in-check.ts');
type CheckPrompt = import('./active-check.ts').CheckPrompt;
type ActiveCheckSigner = import('./active-check.ts').ActiveCheckSigner;

const USERNAME = 'alice';
const PASSWORD = 'correct horse';
const DIGEST = 'ab'.repeat(32);
const PASSKEY = { username: USERNAME, credentialId: new Uint8Array([1]) } as unknown as PasskeyRecord;

/** hb-auth's errors as Comlink rebuilds the worker's: plain Errors carrying the name */
const workerError = (name: string, message: string) => Object.assign(new Error(message), { name });

/**
 * hb-auth's client as far as the check goes: a wallet holding `stored` keys, asking for the check
 * when `requireActiveCheck`, whose `sign` refuses active and owner keys then, as hb-auth's does.
 * A wallet from before the setting has none: it reads as on until `unlock` adopts it as off.
 * `calls` lists the signing calls.
 */
class FakeCheckClient {
  readonly calls: string[] = [];
  requireActiveCheck: boolean | undefined = true;
  unlocked = true;
  passkey = false;
  stored: KeyAuthorityType[] = ['posting', 'active'];

  async sign(_username: string, _digest: string, keyType: KeyAuthorityType) {
    this.calls.push(`sign ${keyType}`);
    if (keyType !== 'posting' && this.requireActiveCheck) {
      throw workerError('CheckRequiredError', `Signing with the '${keyType}' key requires a password or passkey check`);
    }
    return `signature ${keyType}`;
  }

  async signWithCheck(_username: string, _digest: string, keyType: KeyAuthorityType, credential: CheckCredential) {
    await this.checkCredential(_username, credential);
    this.calls.push(`signWithCheck ${keyType} ${'password' in credential ? 'password' : 'passkey'}`);
    return `checked signature ${keyType}`;
  }

  async checkCredential(_username: string, credential: CheckCredential) {
    if ('passkey' in credential) {
      if (credential.passkey !== PASSKEY) throw workerError('PasskeyError', 'Assertion lacks the user-verified flag');
      return;
    }
    if (credential.password !== PASSWORD) throw workerError('AuthorizationError', 'Invalid credentials');
  }

  async getRequireActiveCheck() {
    return this.requireActiveCheck ?? true;
  }

  /** A normal unlock, as hb-auth's `authenticate` is: adopts a missing setting as off */
  async unlock(password: string) {
    if (password !== PASSWORD) throw workerError('AuthorizationError', 'Invalid credentials');
    this.unlocked = true;
    this.requireActiveCheck ??= false;
  }

  async getRegisteredUserByUsername(username: string) {
    return {
      username,
      unlocked: this.unlocked,
      authorized: true,
      loggedInKeyType: 'posting' as const,
      registeredKeyTypes: this.stored
    };
  }

  async hasPasskey() {
    return this.passkey;
  }

  async loadPasskey() {
    return PASSKEY;
  }
}

type Answer = (prompt: CheckPrompt) => Promise<void>;

/** Answers each prompt opened with the next of `answers`, keeping the error key each attempt got */
function signerOf(client: FakeCheckClient, answers: Answer[] = []) {
  const prompts: CheckPrompt[] = [];
  const stored: [KeyAuthorityType, string][] = [];
  const signer: ActiveCheckSigner = {
    client,
    username: USERNAME,
    ask: async (prompt) => {
      prompts.push(prompt);
      const answer = answers.shift();
      if (!answer) throw new Error('No password from user');
      await answer(prompt);
    },
    storeKey: async (keyType, password) => {
      stored.push([keyType, password]);
      client.stored = [...client.stored, keyType];
    }
  };
  return { signer, prompts, stored };
}

/** Types passwords in turn until the prompt closes; the keys it kept the prompt open with go to `errors` */
const typing =
  (passwords: string[], errors: string[] = []): Answer =>
  async ({ validatePassword }) => {
    for (const password of passwords) {
      const error = await validatePassword(password);
      if (!error) return;
      errors.push(error);
    }
    throw new Error('No password from user');
  };

describe('the check before active-key operations', () => {
  it('is needed for active and owner signatures with the setting on, never for posting', async () => {
    const client = new FakeCheckClient();
    assert.equal(await needsActiveCheck(client, USERNAME, 'active'), true);
    assert.equal(await needsActiveCheck(client, USERNAME, 'owner'), true);
    assert.equal(await needsActiveCheck(client, USERNAME, 'posting'), false);
    client.requireActiveCheck = false;
    assert.equal(await needsActiveCheck(client, USERNAME, 'active'), false);
  });

  it('signs each active operation through the check-and-sign call, asking again for the second', async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD]), typing([PASSWORD])]);

    assert.equal(await signWithActiveCheck(signer, DIGEST, 'active'), 'checked signature active');
    assert.equal(await signWithActiveCheck(signer, DIGEST, 'active'), 'checked signature active');

    assert.equal(prompts.length, 2);
    assert.deepEqual(client.calls, ['signWithCheck active password', 'signWithCheck active password']);
  });

  it('keeps the prompt open after a wrong password, with the wrong-password text', async () => {
    const client = new FakeCheckClient();
    const errors: string[] = [];
    const { signer, prompts } = signerOf(client, [typing(['guess', PASSWORD], errors)]);

    assert.equal(await signWithActiveCheck(signer, DIGEST, 'owner'), 'checked signature owner');

    assert.equal(prompts.length, 1);
    assert.deepEqual(errors, ['broadcast_error.wrong_safe_storage_password']);
  });

  it('offers the passkey of a user who has one, and signs with it from the prompt', async () => {
    const client = new FakeCheckClient();
    client.passkey = true;
    const { signer, prompts } = signerOf(client, [
      async ({ checkPasskey }) => {
        assert.ok(checkPasskey);
        assert.equal(await checkPasskey(), null);
      }
    ]);

    assert.equal(await signWithActiveCheck(signer, DIGEST, 'active'), 'checked signature active');

    assert.equal(prompts.length, 1);
    assert.deepEqual(client.calls, ['signWithCheck active passkey']);
  });

  it('offers no passkey button to a user without a passkey', async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD])]);

    await signWithActiveCheck(signer, DIGEST, 'active');

    assert.equal(prompts[0].checkPasskey, undefined);
  });

  it('rejects, signing nothing, when the user closes the prompt', async () => {
    const client = new FakeCheckClient();
    const { signer } = signerOf(client);

    await assert.rejects(signWithActiveCheck(signer, DIGEST, 'active'), /No password from user/);
    assert.deepEqual(client.calls, []);
  });

  it("signs the sign-in's login transaction with the sign-in's password, and asks for the next operation", async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD])]);

    await withSignInCheck(USERNAME, 'active', { password: PASSWORD }, async () => {
      assert.equal(await signWithActiveCheck(signer, DIGEST, 'active'), 'checked signature active');
      assert.equal(prompts.length, 0);
      await signWithActiveCheck(signer, DIGEST, 'active');
    });

    assert.equal(prompts.length, 1);
    assert.deepEqual(client.calls, ['signWithCheck active password', 'signWithCheck active password']);
  });

  it('gives a posting sign-in\'s password to no active signature', async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD])]);

    await withSignInCheck(USERNAME, 'posting', { password: PASSWORD }, () =>
      signWithActiveCheck(signer, DIGEST, 'active')
    );

    assert.equal(prompts.length, 1);
  });

  it('stores a key safe storage lacks with the password of one prompt, without a passkey, then signs with it', async () => {
    const client = new FakeCheckClient();
    client.passkey = true;
    client.stored = ['posting'];
    const { signer, prompts, stored } = signerOf(client, [typing([PASSWORD])]);

    assert.equal(await signWithActiveCheck(signer, DIGEST, 'active'), 'checked signature active');

    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].checkPasskey, undefined);
    assert.deepEqual(stored, [['active', PASSWORD]]);
    assert.deepEqual(client.calls, ['signWithCheck active password']);
  });
});

describe('signOrCheck', () => {
  it('signs through sign, without a prompt, while the setting is off', async () => {
    const client = new FakeCheckClient();
    client.requireActiveCheck = false;
    const { signer, prompts } = signerOf(client);

    const signature = await signOrCheck(signer, DIGEST, 'active', () => client.sign(USERNAME, DIGEST, 'active'));

    assert.equal(signature, 'signature active');
    assert.equal(prompts.length, 0);
  });

  it("shows the check prompt when hb-auth's sign asks for the check, as after another tab turned it on", async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD])]);

    const signature = await signOrCheck(signer, DIGEST, 'active', () => client.sign(USERNAME, DIGEST, 'active'));

    assert.equal(signature, 'checked signature active');
    assert.equal(prompts.length, 1);
    assert.deepEqual(client.calls, ['sign active', 'signWithCheck active password']);
  });

  it('signs a posting operation through sign, and passes any other failure on', async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client);
    const refused = new Error('Not authorized');

    assert.equal(await signOrCheck(signer, DIGEST, 'posting', () => client.sign(USERNAME, DIGEST, 'posting')), 'signature posting');
    await assert.rejects(signOrCheck(signer, DIGEST, 'active', () => Promise.reject(refused)), refused);
    assert.equal(prompts.length, 0);
  });
});

describe('signAsSettingAsks', () => {
  /** Signs `count` active operations as the signer does, counting the unlock prompts */
  async function signActive(client: FakeCheckClient, signer: ActiveCheckSigner, count: number) {
    let unlockPrompts = 0;
    const unlock = async () => {
      if (client.unlocked) return undefined;
      unlockPrompts++;
      await client.unlock(PASSWORD);
      return PASSWORD;
    };
    const signatures: string[] = [];
    for (let operation = 0; operation < count; operation++) {
      signatures.push(
        await signAsSettingAsks(signer, DIGEST, 'active', unlock, () =>
          signOrCheck(signer, DIGEST, 'active', () => client.sign(USERNAME, DIGEST, 'active'))
        )
      );
    }
    return { signatures, unlockPrompts };
  }

  it('signs with sign after one unlock for a locked wallet from before the setting, which reads on until unlocked', async () => {
    const client = new FakeCheckClient();
    client.requireActiveCheck = undefined;
    client.unlocked = false;
    const { signer, prompts } = signerOf(client);

    const { signatures, unlockPrompts } = await signActive(client, signer, 2);

    assert.deepEqual(signatures, ['signature active', 'signature active']);
    assert.equal(unlockPrompts, 1);
    assert.equal(prompts.length, 0);
    assert.deepEqual(client.calls, ['sign active', 'sign active']);
  });

  it('signs through the check with the unlock password for a locked wallet with the setting on, one prompt', async () => {
    const client = new FakeCheckClient();
    client.unlocked = false;
    const { signer, prompts } = signerOf(client);

    const { signatures, unlockPrompts } = await signActive(client, signer, 1);

    assert.deepEqual(signatures, ['checked signature active']);
    assert.equal(unlockPrompts, 1);
    assert.equal(prompts.length, 0);
    assert.deepEqual(client.calls, ['signWithCheck active password']);
  });

  it('asks for the check once per operation in an unlocked wallet with the setting on', async () => {
    const client = new FakeCheckClient();
    const { signer, prompts } = signerOf(client, [typing([PASSWORD]), typing([PASSWORD])]);

    const { unlockPrompts } = await signActive(client, signer, 2);

    assert.equal(unlockPrompts, 0);
    assert.equal(prompts.length, 2);
    assert.deepEqual(client.calls, ['signWithCheck active password', 'signWithCheck active password']);
  });

  it('stores an active key safe storage lacks with the unlock password, asking for no check', async () => {
    const client = new FakeCheckClient();
    client.unlocked = false;
    client.stored = ['posting'];
    const { signer, prompts, stored } = signerOf(client);

    const { unlockPrompts } = await signActive(client, signer, 1);

    assert.equal(unlockPrompts, 1);
    assert.equal(prompts.length, 0);
    assert.deepEqual(stored, [['active', PASSWORD]]);
    assert.deepEqual(client.calls, ['signWithCheck active password']);
  });
});
