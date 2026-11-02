import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signInWithAddedKey, type AddedKeySignInClient } from './added-key-sign-in.ts';

const USERNAME = 'alice';
const PASSWORD = 'safe-storage-password';

/** hb-auth's client as far as this sign-in goes: records which wallets are unlocked */
class FakeSafeStorage implements AddedKeySignInClient {
  readonly unlocked = new Set<string>();
  /** Runs while `authenticate` is in flight, as a dialog closed meanwhile */
  onAuthenticate = () => {};
  wrongPassword = false;

  async authenticate(username: string, password: string) {
    this.onAuthenticate();
    if (this.wrongPassword || password !== PASSWORD) throw new Error('Invalid credentials');
    this.unlocked.add(username);
    return { ok: true };
  }

  async logout(username: string) {
    this.unlocked.delete(username);
  }
}

function setUp({ signInRuns = true } = {}) {
  const client = new FakeSafeStorage();
  const state = { cancelled: false, signIns: 0 };
  const signIn = async () => {
    if (!signInRuns) return false;
    state.signIns += 1;
    return true;
  };
  const run = () =>
    signInWithAddedKey(client, {
      username: USERNAME,
      password: PASSWORD,
      keyType: 'posting',
      signIn,
      isCancelled: () => state.cancelled
    });
  return { client, state, run };
}

describe('signInWithAddedKey', () => {
  it('signs in with the unlocked key', async () => {
    const { client, state, run } = setUp();

    assert.equal(await run(), 'signed-in');
    assert.equal(state.signIns, 1);
    assert.ok(client.unlocked.has(USERNAME));
  });

  it('reports a sign-in that did not run, while another one is pending', async () => {
    const { state, run } = setUp({ signInRuns: false });

    assert.equal(await run(), 'pending');
    assert.equal(state.signIns, 0);
  });

  it('signs nobody in and locks the wallet again when the dialog is closed while unlocking', async () => {
    const { client, state, run } = setUp();
    client.onAuthenticate = () => {
      state.cancelled = true;
    };

    assert.equal(await run(), 'cancelled');
    assert.equal(state.signIns, 0);
    assert.ok(!client.unlocked.has(USERNAME));
  });

  it('neither unlocks nor signs in when the dialog was closed before', async () => {
    const { client, state, run } = setUp();
    state.cancelled = true;
    let authenticated = false;
    client.onAuthenticate = () => {
      authenticated = true;
    };

    assert.equal(await run(), 'cancelled');
    assert.equal(authenticated, false);
    assert.equal(state.signIns, 0);
  });

  it('rejects with the unlock error, without signing in', async () => {
    const { client, state, run } = setUp();
    client.wrongPassword = true;

    await assert.rejects(run(), /Invalid credentials/);
    assert.equal(state.signIns, 0);
  });
});
