import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';

const { NoncedHasClient } = await import('./nonced-has-client.ts');

const AUTH = { username: 'alice', token: 'token', key: 'auth-key', expire: 1_800_000_000_000 };
const OPS = [['vote', { voter: 'alice', author: 'bob', permlink: 'p', weight: 10000 }]];

/** A client whose sent messages are recorded instead of going to a relay */
function recordingClient() {
  const client = new NoncedHasClient('relay.test', '', false);
  const sent: Array<Record<string, unknown>> = [];
  client.send = async (message: string) => {
    sent.push(JSON.parse(message));
  };
  /** The request's data, decrypted with the session's key as the wallet app does */
  const dataOf = (index: number) =>
    JSON.parse(CryptoJS.AES.decrypt(String(sent[index].data), AUTH.key).toString(CryptoJS.enc.Utf8));
  return { client, sent, dataOf };
}

describe('NoncedHasClient', () => {
  it('sends a sign request to broadcast, encrypted with the session key, with a nonce', () => {
    const { client, sent, dataOf } = recordingClient();
    client.broadcast(AUTH, 'active', OPS);
    client.clearExpireTimeout();

    assert.deepEqual(
      { ...sent[0], data: undefined },
      { cmd: 'sign_req', account: 'alice', token: 'token', data: undefined }
    );
    const data = dataOf(0);
    assert.deepEqual({ ...data, nonce: undefined }, { key_type: 'active', ops: OPS, broadcast: true, nonce: undefined });
    assert.equal(typeof data.nonce, 'number');
  });

  it('sends a challenge request with a nonce', () => {
    const { client, sent, dataOf } = recordingClient();
    client.challenge(AUTH, { key_type: 'posting', challenge: 'message' });
    client.clearExpireTimeout();

    assert.equal(sent[0].cmd, 'challenge_req');
    const data = dataOf(0);
    assert.deepEqual({ ...data, nonce: undefined }, { key_type: 'posting', challenge: 'message', nonce: undefined });
    assert.equal(typeof data.nonce, 'number');
  });

  it('never sends a nonce twice, even within one millisecond', () => {
    const { client, dataOf } = recordingClient();
    for (let request = 0; request < 5; request++) client.broadcast(AUTH, 'posting', OPS);
    client.challenge(AUTH, { key_type: 'posting', challenge: 'message' });
    client.clearExpireTimeout();

    const nonces = [0, 1, 2, 3, 4, 5].map((index) => dataOf(index).nonce);
    assert.deepEqual(
      nonces,
      [...nonces].sort((a, b) => a - b)
    );
    assert.equal(new Set(nonces).size, nonces.length);
  });

  it('refuses a session without its key', () => {
    const { client, sent } = recordingClient();
    assert.throws(() => client.broadcast({ username: 'alice', token: 'token' }, 'posting', OPS), /authData\.key/);
    assert.deepEqual(sent, []);
  });
});
