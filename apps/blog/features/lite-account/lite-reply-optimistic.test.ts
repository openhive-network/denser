import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { hasIndexedReply, optimisticReplyAuthor, withOptimisticReply, withRelayedReply } = await import('./lite-reply-optimistic.ts');
const { liteL1Author } = await import('./lite-ownership.ts');

type Variables = Parameters<typeof withOptimisticReply>[1];

const variables = (native: boolean): Variables => ({
  built: { permlink: 're-post-abc', request: {} },
  gateAccount: 'test-gateway-1',
  apps: { account: 'lite_account', posts: 'lite_posts' },
  attester: 'lite-smoke-1016',
  body: 'hello',
  parentAuthor: 'alice',
  parentPermlink: 'post',
  discussionAuthor: 'alice',
  discussionPermlink: 'post',
  observer: 'hive.blog',
  native
} as unknown as Variables);

const discussion = () => ({
  'alice/post': { author: 'alice', permlink: 'post', category: 'lite-test', depth: 0, children: 0, replies: [], title: 'Post' }
}) as unknown as Parameters<typeof withOptimisticReply>[0];

describe('guest reply optimistic entry', () => {
  it('is authored by the lite DID on a lite-aware node, keyed like the node keys it', () => {
    const v = variables(true);
    const next = withOptimisticReply(discussion(), v);

    assert.equal(optimisticReplyAuthor(v), 'did:lite:lite-smoke-1016');
    const entry = next['did:lite:lite-smoke-1016/re-post-abc'];
    assert.equal(entry.author, 'did:lite:lite-smoke-1016');
    assert.equal(entry.url, '/lite-test/@did:lite:lite-smoke-1016/re-post-abc');
    assert.equal(entry._optimistic, true);
    assert.deepEqual(next['alice/post'].replies, ['re-post-abc']);
    assert.equal(next['alice/post'].children, 1);
  });

  it('is authored by the gate account on a compat node, keyed by permlink as before', () => {
    const v = variables(false);
    const next = withOptimisticReply(discussion(), v);

    assert.equal(optimisticReplyAuthor(v), 'test-gateway-1');
    assert.equal(next['re-post-abc'].author, 'test-gateway-1');
    assert.equal(next['re-post-abc'].url, '/lite-test/@test-gateway-1/re-post-abc');
  });

  it('is validated by the DID key natively and by gate + permlink on a compat node', () => {
    const native = variables(true);
    const compat = variables(false);
    const nativeEntry = { author: 'did:lite:lite-smoke-1016', permlink: 're-post-abc' };
    const compatEntry = { author: 'test-gateway-1', permlink: 're-post-abc' };
    const fresh = (key: string, entry: object) => ({ [key]: entry }) as unknown as Parameters<typeof hasIndexedReply>[0];

    assert.equal(hasIndexedReply(fresh('did:lite:lite-smoke-1016/re-post-abc', nativeEntry), native, 're-post-abc'), true);
    assert.equal(hasIndexedReply(fresh('test-gateway-1/re-post-abc', compatEntry), native, 're-post-abc'), false);
    assert.equal(hasIndexedReply(fresh('test-gateway-1/re-post-abc', compatEntry), compat, 're-post-abc'), true);
    assert.equal(hasIndexedReply(withOptimisticReply(discussion(), native), native, 're-post-abc'), false);
    assert.equal(hasIndexedReply(null, compat, 're-post-abc'), false);
  });

  it('names its L1 location once the gateway posted it, as the node will', () => {
    const v = variables(true);
    const pending = withOptimisticReply(discussion(), v);
    const key = 'did:lite:lite-smoke-1016/re-post-abc';
    assert.equal(liteL1Author(pending[key]), undefined);

    const entry = withRelayedReply(pending, v, 'test-gateway-3')?.[key];
    assert.ok(entry);
    assert.equal(entry.url, '/lite-test/@alice/post#@test-gateway-3/re-post-abc');
    assert.equal(liteL1Author(entry), 'test-gateway-3');
    assert.equal(entry._optimistic, true);

    const indexed = discussion();
    assert.equal(withRelayedReply(indexed, v, 'test-gateway-3'), indexed);
  });
});
