import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLiteIdentity, l2Digest, MAINNET_CHAIN_ID, recoverPublicKey } from '@hiveio/lite-account';

const { buildLiteSocialTransaction, liteSocialOperation, LiteSocialError, relayLiteSocial } = await import('./lite-social.ts');

const NOW = Date.parse('2026-10-21T12:00:00Z');
const identity = createLiteIdentity('social-guest-1', NOW);

describe('liteSocialOperation', () => {
  it('names the actor and a follow, mute or their undo target by DID', () => {
    assert.deepEqual(liteSocialOperation('alice', { method: 'follow', target: 'test-gateway-1' }), {
      method: 'follow',
      args: { actor: 'did:lite:alice', target: 'did:hive:test-gateway-1' }
    });
    assert.deepEqual(liteSocialOperation('alice', { method: 'unmute', target: 'did:lite:bob' }).args, {
      actor: 'did:lite:alice',
      target: 'did:lite:bob'
    });
  });

  it('names a reblogged post by its L1 author, a subscription by its community', () => {
    assert.deepEqual(liteSocialOperation('alice', { method: 'reblog', author: 'test-gateway-1', permlink: 'p1' }).args, {
      actor: 'did:lite:alice',
      author: 'test-gateway-1',
      permlink: 'p1'
    });
    assert.deepEqual(liteSocialOperation('alice', { method: 'unsubscribe', community: 'hive-13323' }).args, {
      actor: 'did:lite:alice',
      community: 'hive-13323'
    });
  });

  it('sends only the profile fields that are set', () => {
    const op = liteSocialOperation('alice', { method: 'set_profile', profile: { name: 'Alice', about: '', website: undefined } });
    assert.deepEqual(op.args, { actor: 'did:lite:alice', profile: { name: 'Alice', about: '' } });
  });
});

describe('buildLiteSocialTransaction', () => {
  const action = { method: 'follow' as const, target: 'test-gateway-1' };
  const tx = buildLiteSocialTransaction({ identity, app: 'lite_social_test', chainId: MAINNET_CHAIN_ID, action, nowMs: NOW });

  it('builds one op of the social app, expiring in 10 minutes', () => {
    const { signatures, ...fields } = tx;
    assert.deepEqual(fields, {
      app: 'lite_social_test',
      version: 1,
      operations: [{ method: 'follow', args: { actor: 'did:lite:social-guest-1', target: 'did:hive:test-gateway-1' } }],
      expiration: '2026-10-21T12:10:00'
    });
    assert.equal(signatures.length, 1);
  });

  it('signs sha256(chain id || JCS of the signed fields) with the posting key', () => {
    const { signatures, ...fields } = tx;
    // The JCS text written out by hand: keys sorted at every level, no whitespace.
    const jcs =
      '{"app":"lite_social_test","expiration":"2026-10-21T12:10:00","operations":[{"args":{"actor":"did:lite:social-guest-1",' +
      '"target":"did:hive:test-gateway-1"},"method":"follow"}],"version":1}';
    const digest = createHash('sha256').update(Buffer.from(MAINNET_CHAIN_ID, 'hex')).update(jcs, 'utf8').digest('hex');
    assert.equal(l2Digest(fields, MAINNET_CHAIN_ID), digest);
    assert.equal(recoverPublicKey(digest, signatures[0]), identity.postingPublicKey);
  });

  it('builds set_last_read as the actor and the naive-UTC date, signed like any social op', () => {
    const marked = buildLiteSocialTransaction({
      identity,
      app: 'lite_social_test',
      chainId: MAINNET_CHAIN_ID,
      action: { method: 'set_last_read', date: '2026-10-21T11:58:30' },
      nowMs: NOW
    });
    const { signatures, ...fields } = marked;
    assert.deepEqual(fields.operations, [
      { method: 'set_last_read', args: { actor: 'did:lite:social-guest-1', date: '2026-10-21T11:58:30' } }
    ]);
    assert.equal(recoverPublicKey(l2Digest(fields, MAINNET_CHAIN_ID), signatures[0]), identity.postingPublicKey);
  });

  it('refuses a profile over 8192 bytes of JCS', () => {
    const profile = { about: 'x'.repeat(8200) };
    assert.throws(
      () => buildLiteSocialTransaction({ identity, app: 'lite_social_test', chainId: MAINNET_CHAIN_ID, action: { method: 'set_profile', profile } }),
      (error: unknown) => error instanceof LiteSocialError && error.code === 'too_large'
    );
  });
});

describe('relayLiteSocial', () => {
  const realFetch = globalThis.fetch;
  const tx = buildLiteSocialTransaction({ identity, app: 'lite_social_test', chainId: MAINNET_CHAIN_ID, action: { method: 'mute', target: 'bob' } });
  let sent: { url: string; body: unknown } | undefined;
  const answer = (status: number, body: string) => {
    globalThis.fetch = async (url, init) => {
      sent = { url: String(url), body: JSON.parse(String(init?.body)) };
      return new Response(body, { status, headers: { 'content-type': 'application/json' } });
    };
  };
  afterEach(() => {
    globalThis.fetch = realFetch;
    sent = undefined;
  });

  it('posts { tx } as is and resolves with the gateway 202', async () => {
    answer(202, JSON.stringify({ trx_id: 'abc', gate: 'test-gateway-4', app: 'lite_social_test' }));
    assert.deepEqual(await relayLiteSocial('/api/lite-gateway/l2', tx), { trx_id: 'abc', gate: 'test-gateway-4', app: 'lite_social_test' });
    assert.deepEqual(sent, { url: '/api/lite-gateway/l2', body: { tx } });
  });

  it("throws the gateway's code, with retry_after_s for rate_limited", async () => {
    answer(429, JSON.stringify({ ok: false, code: 'rate_limited', message: 'slow down', retry_after_s: 42 }));
    await assert.rejects(relayLiteSocial('/l2', tx), (error: unknown) => {
      assert.ok(error instanceof LiteSocialError);
      assert.equal(error.code, 'rate_limited');
      assert.equal(error.retryAfterS, 42);
      return true;
    });
    answer(403, JSON.stringify({ ok: false, code: 'auth_failed', message: 'no posting authority' }));
    await assert.rejects(relayLiteSocial('/l2', tx), (error: unknown) => error instanceof LiteSocialError && error.code === 'auth_failed');
  });

  it('turns an unreachable gateway or a non-JSON answer into relay_unavailable', async () => {
    answer(502, '<html>bad gateway</html>');
    await assert.rejects(relayLiteSocial('/l2', tx), (error: unknown) => error instanceof LiteSocialError && error.code === 'relay_unavailable');
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    await assert.rejects(relayLiteSocial('/l2', tx), (error: unknown) => error instanceof LiteSocialError && error.code === 'relay_unavailable');
  });
});
