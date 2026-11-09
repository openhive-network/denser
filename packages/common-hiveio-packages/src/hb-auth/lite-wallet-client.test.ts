import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * hb-auth 1.28.4's offline client stood in by its two layers: the client, whose register and
 * authenticate build a Hive transaction for the username (refusing one that is no Hive account
 * name, as wax does), and its worker (`getAuthInstance()`), which records each call.
 */
const FAKE_HB_AUTH = `
export class OfflineClient {
  constructor() {
    this.workerCalls = [];
    const record = (name) => async (...args) => { this.workerCalls.push([name, ...args]); return 'signature'; };
    this.auth = { register: record('register'), authenticate: record('authenticate'), onAuthComplete: record('onAuthComplete') };
  }
  getAuthInstance() { return this.auth; }
  async register(username) { throw new Error("Account name '" + username + "' is not valid"); }
  async authenticate(username) { throw new Error("Account name '" + username + "' is not valid"); }
}
`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hiveio/hb-auth') return { url: `data:text/javascript,${encodeURIComponent(FAKE_HB_AUTH)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { LiteWalletClient } = await import('./lite-wallet-client.ts');
const { hiveSafeStorageUsers } = await import('./lite-wallet-users.ts');

const USERNAME = 'did:lite:quiet-heron-271:8EXNcp7j';
type Calls = { workerCalls: unknown[][] };

describe('LiteWalletClient', () => {
  it('registers a DID username through the worker, completing the registration', async () => {
    const client = new LiteWalletClient({ workerUrl: '/auth/worker.js', sessionTimeout: 900, initTimeout: 30000 });
    assert.deepEqual(await client.register(USERNAME, 'secret', '5Kwif', 'posting'), { ok: true });
    const [register, complete] = (client as unknown as Calls).workerCalls;
    assert.deepEqual([register[0], register[1], register[2], register[4], register[5], register[6]], ['register', USERNAME, 'secret', '5Kwif', 'posting', true]);
    assert.match(String(register[3]), /^[0-9a-f]{64}$/);
    assert.deepEqual(complete, ['onAuthComplete', USERNAME, false]);
  });

  it('authenticates a DID username through the worker, and lets its refusal through', async () => {
    const client = new LiteWalletClient({ workerUrl: '/auth/worker.js', sessionTimeout: 900, initTimeout: 30000 });
    assert.deepEqual(await client.authenticate(USERNAME, 'secret', 'owner'), { ok: true });
    const [authenticate] = (client as unknown as Calls).workerCalls;
    assert.deepEqual(authenticate.slice(0, 4), ['authenticate', USERNAME, 'secret', 'owner']);

    const refused = new Error('Invalid credentials');
    (client as unknown as { auth: { authenticate: () => Promise<never> } }).auth.authenticate = () => Promise.reject(refused);
    await assert.rejects(client.authenticate(USERNAME, 'wrong', 'posting'), refused);
  });
});

describe('the Hive accounts safe storage holds', () => {
  it('leave out the lite entries, which no Hive account name can be', () => {
    const users = [{ username: 'quiet-heron-271' }, { username: USERNAME }, { username: 'gtg' }];
    assert.deepEqual(hiveSafeStorageUsers(users), [{ username: 'quiet-heron-271' }, { username: 'gtg' }]);
    assert.deepEqual(hiveSafeStorageUsers([{ username: 'did:lite:quiet-heron-271:8EXNcp7j', unlocked: true }]), []);
  });
});
