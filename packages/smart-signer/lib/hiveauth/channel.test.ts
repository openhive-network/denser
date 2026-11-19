import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/hiveauth/hiveauth-error': new URL('./hiveauth-error.ts', import.meta.url).href,
  '@smart-signer/lib/hiveauth/session': new URL('./session.ts', import.meta.url).href,
  '@smart-signer/lib/signer/credential-storage': new URL('../signer/credential-storage.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { HiveAuthChannel } = await import('./channel.ts');
const { HiveAuthError } = await import('./hiveauth-error.ts');

const RELAY = 'wss://relay.test';
const APP = { name: 'Hive Blog', description: 'blog.test', icon: 'https://blog.test/icon.png' };
const SESSION = { username: 'alice', key: 'auth-key', token: 'token', expire: 1_800_000_000_000 };

type Handler = (event: unknown) => void;

/**
 * A `HasClient` the test drives: it records the requests sent, and `emit` dispatches an event of
 * the relay's answer to the handlers registered for it, as `HasClient` does.
 */
class StubHasClient {
  isConnected = false;
  reachable = true;
  expireTimeoutsCleared = 0;
  readonly sent: Array<{ request: string; args: unknown[] }> = [];
  private readonly handlers = new Map<string, Handler[]>();

  addEventHandler(name: string, handler: Handler): void {
    this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]);
  }

  removeEventHandler(name: string, handler: Handler): void {
    this.handlers.set(
      name,
      (this.handlers.get(name) ?? []).filter((registered) => registered !== handler)
    );
  }

  async connect(): Promise<boolean> {
    this.isConnected = this.reachable;
    return true;
  }

  clearExpireTimeout(): void {
    this.expireTimeoutsCleared++;
  }

  authenticate(...args: unknown[]): void {
    this.sent.push({ request: 'auth_req', args });
  }

  broadcast(...args: unknown[]): void {
    this.sent.push({ request: 'sign_req', args });
  }

  challenge(...args: unknown[]): void {
    this.sent.push({ request: 'challenge_req', args });
  }

  emit(name: string, event: unknown): void {
    for (const handler of this.handlers.get(name) ?? []) handler(event);
  }

  get listening(): number {
    return [...this.handlers.values()].reduce((count, handlers) => count + handlers.length, 0);
  }
}

function channelWith(client = new StubHasClient()) {
  // The stub has what the channel uses of `HasClient`
  return { client, channel: new HiveAuthChannel(client as never, RELAY, APP) };
}

/** Lets the channel connect and send its request */
const sent = () => new Promise((resolve) => setImmediate(resolve));

async function failureOf(request: Promise<unknown>): Promise<unknown> {
  return request.then(
    () => assert.fail('the request did not fail'),
    (error: unknown) => (error instanceof HiveAuthError ? error.failure : error)
  );
}

describe('HiveAuthChannel.authenticate', () => {
  it('opens a session with the challenge, shows the has:// link, and resolves with the session and signature', async () => {
    const { client, channel } = channelWith();
    const uris: string[] = [];
    const signIn = channel.authenticate('alice', 'posting', '{"loginChallenge":"c"}', {
      onAuthUri: (uri) => uris.push(uri)
    });
    await sent();
    assert.deepEqual(client.sent, [
      {
        request: 'auth_req',
        args: [{ username: 'alice' }, APP, { key_type: 'posting', challenge: '{"loginChallenge":"c"}' }]
      }
    ]);

    client.emit('AuthPending', { cmd: 'auth_wait', uuid: 'u1', expire: 1, account: 'alice', key: 'auth-key' });
    assert.equal(uris.length, 1);
    const [scheme, payload] = uris[0].split('has://auth_req/');
    assert.equal(scheme, '');
    assert.deepEqual(JSON.parse(atob(payload)), { account: 'alice', uuid: 'u1', key: 'auth-key', host: RELAY });

    client.emit('AuthSuccess', {
      uuid: 'u1',
      data: { challenge: { challenge: 'signature-hex', pubkey: 'STM1' } },
      authData: { token: 'token', key: 'auth-key', expire: 1_800_000_000 }
    });
    assert.deepEqual(await signIn, { session: SESSION, signature: 'signature-hex' });
    assert.equal(client.listening, 0);
  });

  it('reads the challenge of protocol 1.0 (`challenge_data`), with no token', async () => {
    const { client, channel } = channelWith();
    const signIn = channel.authenticate('alice', 'active', 'c', { onAuthUri: () => undefined });
    await sent();
    client.emit('AuthPending', { uuid: 'u1', key: 'auth-key' });
    client.emit('AuthSuccess', {
      uuid: 'u1',
      data: { challenge_data: { challenge: 'sig', pubkey: 'STM1' } },
      authData: { key: 'auth-key', expire: SESSION.expire }
    });
    assert.deepEqual(await signIn, { session: { ...SESSION, token: '' }, signature: 'sig' });
  });

  it("ignores another request's approval", async () => {
    const { client, channel } = channelWith();
    const signIn = channel.authenticate('alice', 'posting', 'c', { onAuthUri: () => undefined });
    await sent();
    const approval = (uuid: string, signature: string) => ({
      uuid,
      data: { challenge: { challenge: signature } },
      authData: { token: 'token', key: 'auth-key', expire: SESSION.expire }
    });
    client.emit('AuthSuccess', approval('u1', 'before-waiting'));
    client.emit('AuthPending', { uuid: 'u1', key: 'auth-key' });
    client.emit('AuthSuccess', approval('u0', 'stale'));
    client.emit('AuthSuccess', approval('u1', 'sig'));
    assert.equal((await signIn).signature, 'sig');
  });

  it('fails an approval without a signature', async () => {
    const { client, channel } = channelWith();
    const signIn = channel.authenticate('alice', 'posting', 'c', { onAuthUri: () => undefined });
    await sent();
    client.emit('AuthPending', { uuid: 'u1', key: 'auth-key' });
    client.emit('AuthSuccess', { uuid: 'u1', data: {}, authData: { key: 'auth-key', expire: SESSION.expire } });
    assert.equal(await failureOf(signIn), 'failed');
  });

  for (const [event, failure] of [
    ['AuthFailure', 'rejected'],
    ['RequestExpired', 'expired'],
    ['Error', 'failed'],
    ['AttachFailure', 'failed']
  ]) {
    it(`ends as ${failure} on ${event}, listening no more`, async () => {
      const { client, channel } = channelWith();
      const signIn = channel.authenticate('alice', 'posting', 'c', { onAuthUri: () => undefined });
      await sent();
      client.emit('AuthPending', { uuid: 'u1', key: 'auth-key' });
      client.emit(event, { message: 'relay says no' });
      assert.equal(await failureOf(signIn), failure);
      assert.equal(client.listening, 0);
    });
  }

  it('reads a rejection as the user cancelling, an expiry not', async () => {
    const { isUserCancelled } = await import('../../../ui/lib/user-cancelled.ts');
    assert.equal(isUserCancelled(new HiveAuthError('rejected')), true);
    assert.equal(isUserCancelled(new HiveAuthError('cancelled')), true);
    assert.equal(isUserCancelled(new HiveAuthError('expired')), false);
  });
});

describe('HiveAuthChannel.broadcast', () => {
  const OPS = [['vote', { voter: 'alice', author: 'bob', permlink: 'p', weight: 10000 }]];

  it("has the wallet app broadcast the operations with the session's key and resolves with the transaction id", async () => {
    const { client, channel } = channelWith();
    const pending: string[] = [];
    const broadcast = channel.broadcast(SESSION, 'active', OPS, { onPending: () => pending.push('approve') });
    await sent();
    assert.deepEqual(client.sent, [{ request: 'sign_req', args: [SESSION, 'active', OPS] }]);

    client.emit('SignPending', { message: { cmd: 'sign_wait', uuid: 's1', expire: 1 } });
    assert.deepEqual(pending, ['approve']);
    client.emit('SignSuccess', { message: { cmd: 'sign_ack', uuid: 's1', broadcast: true, data: 'tx-id' } });
    assert.equal(await broadcast, 'tx-id');
  });

  it('reads the transaction id the wallet app puts in an object, and resolves empty when it names none', async () => {
    for (const [data, transactionId] of [
      [{ id: 'tx-a' }, 'tx-a'],
      [{ tx_id: 'tx-b' }, 'tx-b'],
      [undefined, '']
    ]) {
      const { client, channel } = channelWith();
      const broadcast = channel.broadcast(SESSION, 'posting', OPS);
      await sent();
      client.emit('SignPending', { message: { uuid: 's1' } });
      client.emit('SignSuccess', { message: { uuid: 's1', broadcast: true, data } });
      assert.equal(await broadcast, transactionId);
    }
  });

  it('fails when the wallet app signed without broadcasting, and is rejected on its refusal', async () => {
    const signed = channelWith();
    const notBroadcast = signed.channel.broadcast(SESSION, 'posting', OPS);
    await sent();
    signed.client.emit('SignPending', { message: { uuid: 's1' } });
    signed.client.emit('SignSuccess', { message: { uuid: 's1', broadcast: false, data: {} } });
    assert.equal(await failureOf(notBroadcast), 'failed');

    const refused = channelWith();
    const rejected = refused.channel.broadcast(SESSION, 'posting', OPS);
    await sent();
    refused.client.emit('SignPending', { message: { uuid: 's1' } });
    refused.client.emit('SignFailure', { message: undefined });
    assert.equal(await failureOf(rejected), 'rejected');
  });

  it('is cancelled by its signal, dropping the request and a later approval of it', async () => {
    const { client, channel } = channelWith();
    const cancel = new AbortController();
    const broadcast = channel.broadcast(SESSION, 'posting', OPS, { signal: cancel.signal });
    await sent();
    client.emit('SignPending', { message: { uuid: 's1' } });
    cancel.abort();
    assert.equal(await failureOf(broadcast), 'cancelled');
    assert.equal(client.expireTimeoutsCleared, 1);
    assert.equal(client.listening, 0);
  });

  it('sends nothing when the relay cannot be reached', async () => {
    const client = new StubHasClient();
    client.reachable = false;
    const { channel } = channelWith(client);
    assert.equal(await failureOf(channel.broadcast(SESSION, 'posting', OPS)), 'unreachable');
    assert.deepEqual(client.sent, []);
  });

  it('sends one request at a time', async () => {
    const { client, channel } = channelWith();
    const first = channel.broadcast(SESSION, 'posting', OPS);
    const second = channel.signChallenge(SESSION, 'posting', 'message');
    await sent();
    assert.deepEqual(
      client.sent.map(({ request }) => request),
      ['sign_req']
    );
    client.emit('SignFailure', {});
    assert.equal(await failureOf(first), 'rejected');
    await sent();
    assert.deepEqual(
      client.sent.map(({ request }) => request),
      ['sign_req', 'challenge_req']
    );
    client.emit('ChallengePending', { message: { uuid: 'c1' } });
    client.emit('ChallengeSuccess', { uuid: 'c1', data: { challenge: 'sig', pubkey: 'STM1' } });
    assert.equal(await second, 'sig');
  });
});

describe('HiveAuthChannel.signChallenge', () => {
  it('has the wallet app sign the challenge with the key type and resolves with the signature', async () => {
    const { client, channel } = channelWith();
    const signature = channel.signChallenge(SESSION, 'posting', 'message');
    await sent();
    assert.deepEqual(client.sent, [
      { request: 'challenge_req', args: [SESSION, { key_type: 'posting', challenge: 'message' }] }
    ]);
    client.emit('ChallengePending', { message: { uuid: 'c1' } });
    client.emit('ChallengeSuccess', { uuid: 'c1', data: { challenge: 'sig', pubkey: 'STM1' } });
    assert.equal(await signature, 'sig');
  });

  it('is rejected on a refusal in the wallet app', async () => {
    const { client, channel } = channelWith();
    const signature = channel.signChallenge(SESSION, 'posting', 'message');
    await sent();
    client.emit('ChallengePending', { message: { uuid: 'c1' } });
    client.emit('ChallengeFailure', { message: undefined });
    assert.equal(await failureOf(signature), 'rejected');
  });
});
