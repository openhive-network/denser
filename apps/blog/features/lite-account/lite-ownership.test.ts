import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_ALG, DEFAULT_LITE_APP_IDS as PACKAGE_APP_IDS } from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';

const { isLiteOwner, isLiteTombstone, liteDeletedPostDestination, liteL1Author, liteL1Parent, liteManageCapabilities, liteManageErrorKey } =
  await import('./lite-ownership.ts');
const { DEFAULT_LITE_APP_IDS, liteAttribution } = await import('./lite-attribution.ts');

const APPS = { account: 'lite_account_test', posts: 'lite_posts_test' };
const ROOT_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v';

// Shapes recorded from steem-16: a native (lite-aware node) root post and reply, and the compat form.
const nativeRoot = (over: Partial<Entry> = {}) => ({
  author: 'did:lite:lite-smoke-1016',
  permlink: 're-lite-test-478380rd5v',
  url: ROOT_URL,
  category: 'lite-test',
  json_metadata: { tags: ['lite-test'], lite_posts_test: { alg: 'lite-comment-v1', attester: 'lite-smoke-1016' } },
  children: 0,
  net_rshares: 0,
  is_paidout: false,
  ...over
}) as unknown as Entry;

const nativeReply = (over: Partial<Entry> = {}) => nativeRoot({
  author: 'did:lite:warm-zebra-201',
  permlink: 're-test-gateway-1-re-lite-test-478380rd5v-d30f04n44o',
  parent_author: 'did:lite:lite-smoke-1016',
  parent_permlink: 're-lite-test-478380rd5v',
  url: `${ROOT_URL}#@test-gateway-2/re-test-gateway-1-re-lite-test-478380rd5v-d30f04n44o`,
  json_metadata: { tags: [], lite_posts_test: { alg: 'lite-comment-v1', attester: 'warm-zebra-201' } },
  ...over
} as Partial<Entry>);

const compatReply = (over: Partial<Entry> = {}) => nativeReply({
  author: 'test-gateway-2',
  parent_author: 'test-gateway-1',
  ...over
} as Partial<Entry>);

const ALL_FEATURES = { edits: true, deletes: true, tombstone_deletes: true };
const none = () => undefined;

describe('lite ownership', () => {
  it('belongs to the identity named by the DID author on a lite-aware node', () => {
    assert.equal(isLiteOwner(nativeReply(), 'warm-zebra-201', APPS), true);
    assert.equal(isLiteOwner(nativeReply(), 'lite-smoke-1016', APPS), false);
  });

  it('belongs to the attester of the marker on a compat node, read in the relay namespace', () => {
    assert.equal(isLiteOwner(compatReply(), 'warm-zebra-201', APPS), true);
    assert.equal(isLiteOwner(compatReply(), 'warm-zebra-201', { account: 'lite_account', posts: 'lite_posts' }), false);
  });

  it('belongs to nobody without an identity, and a member post to no lite identity', () => {
    assert.equal(isLiteOwner(nativeReply(), undefined, APPS), false);
    const member = { author: 'alice', json_metadata: { tags: ['hive'] } } as unknown as Entry;
    assert.equal(isLiteOwner(member, 'alice', APPS), false);
  });
});

describe('L1 location of a lite post', () => {
  it('is the gate account in the url when the node names the DID, else the author', () => {
    assert.equal(liteL1Author(nativeRoot()), 'test-gateway-1');
    assert.equal(liteL1Author(nativeReply()), 'test-gateway-2');
    assert.equal(liteL1Author(compatReply()), 'test-gateway-2');
  });

  it('is unknown for an optimistic reply until the gateway answered, and for a url naming another post', () => {
    const pending = nativeReply({ _optimistic: true, url: '/lite-test/@did:lite:warm-zebra-201/re-x' } as Partial<Entry>);
    assert.equal(liteL1Author(pending), undefined);
    const compatPending = compatReply({ _optimistic: true, url: '/lite-test/@test-gateway-2/re-x' } as Partial<Entry>);
    assert.equal(liteL1Author(compatPending), undefined);
    assert.equal(liteL1Author(nativeReply({ url: `${ROOT_URL}#@test-gateway-2/other` } as Partial<Entry>)), undefined);
  });

  it('has the category as parent for a root post', () => {
    assert.deepEqual(liteL1Parent(nativeRoot(), none), { author: '', permlink: 'lite-test' });
  });

  it('resolves a DID parent through the discussion, or through the url when the parent is the root', () => {
    assert.deepEqual(liteL1Parent(nativeReply(), none), { author: 'test-gateway-1', permlink: 're-lite-test-478380rd5v' });
    const nested = nativeReply({ parent_author: 'did:lite:warm-zebra-201', parent_permlink: 're-mid' } as Partial<Entry>);
    assert.equal(liteL1Parent(nested, none), undefined);
    const mid = nativeReply({ permlink: 're-mid', url: `${ROOT_URL}#@test-gateway-3/re-mid` } as Partial<Entry>);
    assert.deepEqual(liteL1Parent(nested, (a, p) => (a === mid.author && p === 're-mid' ? mid : undefined)), {
      author: 'test-gateway-3',
      permlink: 're-mid'
    });
    assert.deepEqual(liteL1Parent(compatReply(), none), { author: 'test-gateway-1', permlink: 're-lite-test-478380rd5v' });
  });
});

describe('tombstone detection', () => {
  it('is the marker saying deleted, in the relay namespace', () => {
    const tombstone = { json_metadata: { tags: [], lite_posts_test: { alg: 'lite-comment-v1', attester: 'bob', deleted: true } } };
    assert.equal(isLiteTombstone(tombstone as unknown as Entry, APPS), true);
    assert.equal(isLiteTombstone(nativeReply(), APPS), false);
    assert.equal(isLiteTombstone(tombstone as unknown as Entry, { account: 'lite_account', posts: 'lite_posts' }), false);
  });

  it('is not a member post whose body happens to read [deleted]', () => {
    const member = { body: '[deleted]', json_metadata: { tags: [], deleted: true } };
    assert.equal(isLiteTombstone(member as unknown as Entry, APPS), false);
  });
});

describe('manage capabilities', () => {
  it('follow the gateway features', () => {
    assert.deepEqual(liteManageCapabilities(nativeReply(), ALL_FEATURES, false), { canEdit: true, canDelete: true });
    assert.deepEqual(liteManageCapabilities(nativeReply(), { edits: true }, false), { canEdit: true, canDelete: false });
    assert.deepEqual(liteManageCapabilities(nativeReply(), undefined, false), { canEdit: false, canDelete: false });
  });

  it('offer no Delete that L1 would refuse when the gateway cannot tombstone', () => {
    const features = { edits: true, deletes: true, tombstone_deletes: false };
    assert.equal(liteManageCapabilities(nativeReply({ children: 2 }), features, false).canDelete, false);
    assert.equal(liteManageCapabilities(nativeReply({ net_rshares: 10 }), features, false).canDelete, false);
    assert.equal(liteManageCapabilities(nativeReply({ is_paidout: true }), features, false).canDelete, false);
    assert.equal(liteManageCapabilities(nativeReply({ children: 2 }), ALL_FEATURES, false).canDelete, true);
  });

  it('offer nothing for a tombstone or a post without a known L1 location', () => {
    assert.deepEqual(liteManageCapabilities(nativeReply(), ALL_FEATURES, true), { canEdit: false, canDelete: false });
    const unlocated = nativeReply({ url: '/lite-test/@did:lite:warm-zebra-201/x' } as Partial<Entry>);
    assert.deepEqual(liteManageCapabilities(unlocated, ALL_FEATURES, false), { canEdit: false, canDelete: false });
  });
});

describe('manage error keys', () => {
  it('explain the gateway errors a user can act on, unknown for the rest', () => {
    assert.equal(liteManageErrorKey('not_owner'), 'not_owner');
    assert.equal(liteManageErrorKey('wrong_gateway'), 'not_owner');
    assert.equal(liteManageErrorKey('edits_disabled'), 'edits_disabled');
    assert.equal(liteManageErrorKey('bad_signature'), 'invalid_request');
    assert.equal(liteManageErrorKey('something_new'), 'unknown');
    assert.equal(liteManageErrorKey(undefined), 'unknown');
  });
});

describe('after deleting the open post', () => {
  it('goes to the parent of a comment, or the feed of a root post', () => {
    assert.equal(
      liteDeletedPostDestination({ category: 'lite-test', parent_author: 'did:lite:lite-smoke-1016', parent_permlink: 'root' }),
      '/lite-test/@did:lite:lite-smoke-1016/root'
    );
    assert.equal(liteDeletedPostDestination({ category: 'lite-test', parent_author: '' }), '/created/lite-test');
  });
});

describe('release attribution', () => {
  it('reads the gate marker under the same app ids and algorithm as @hiveio/lite-account', () => {
    assert.deepEqual(DEFAULT_LITE_APP_IDS, PACKAGE_APP_IDS);
    assert.deepEqual(liteAttribution({ [PACKAGE_APP_IDS.posts]: { attester: 'warm-zebra-201' } }), {
      attester: 'warm-zebra-201',
      alg: CONTENT_ALG
    });
  });
});
