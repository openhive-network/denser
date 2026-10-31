import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { asLiteTombstone, showsLiteDeletion, showsLiteEdit, withLiteDeletion, withLiteEdit } =
  await import('./lite-manage-cache.ts');
const { isLiteTombstone } = await import('./lite-ownership.ts');

type Discussion = Parameters<typeof withLiteDeletion>[0];
type Entry = Discussion[string];

const APPS = { account: 'lite_account_test', posts: 'lite_posts_test' };
const TOMBSTONE = { apps: APPS, attester: 'warm-zebra-201' };
const ROOT = { author: 'did:lite:lite-smoke-1016', permlink: 'root' };
const REPLY = { author: 'did:lite:warm-zebra-201', permlink: 're-root' };

const discussion = (): Discussion => ({
  [`${ROOT.author}/${ROOT.permlink}`]: {
    ...ROOT, category: 'lite-test', depth: 0, children: 1, replies: [`${REPLY.author}/${REPLY.permlink}`], title: 'Root', body: 'root body',
    json_metadata: { tags: ['lite-test'] }
  },
  [`${REPLY.author}/${REPLY.permlink}`]: {
    ...REPLY, category: 'lite-test', depth: 1, children: 0, replies: [], title: '', body: 'reply body',
    parent_author: ROOT.author, parent_permlink: ROOT.permlink,
    json_metadata: { tags: [], lite_posts_test: { alg: 'lite-comment-v1', attester: 'warm-zebra-201' } }
  }
}) as unknown as Discussion;

const find = (d: Discussion | null, ref: { author: string; permlink: string }) =>
  Object.values(d ?? {}).find((e) => e.author === ref.author && e.permlink === ref.permlink);

describe('edit in the cache', () => {
  it('shows the new title, body and tags and keeps the rest', () => {
    const entry = find(discussion(), ROOT) as Entry;
    const edited = withLiteEdit(entry, { title: 'New', body: 'new body', tags: ['lite-test', 'x'] }, '2026-10-20T00:00:00Z');
    assert.equal(edited.title, 'New');
    assert.equal(edited.body, 'new body');
    assert.deepEqual(edited.json_metadata.tags, ['lite-test', 'x']);
    assert.equal(edited.updated, '2026-10-20T00:00:00Z');
    assert.equal(edited.children, 1);
  });

  it('is indexed once a fetched discussion carries the new body', () => {
    const fresh = discussion();
    assert.equal(showsLiteEdit(fresh, REPLY, 'new body'), false);
    (find(fresh, REPLY) as Entry).body = 'new body';
    assert.equal(showsLiteEdit(fresh, REPLY, 'new body'), true);
    (find(fresh, REPLY) as Entry)._optimistic = true;
    assert.equal(showsLiteEdit(fresh, REPLY, 'new body'), false);
    assert.equal(showsLiteEdit(null, REPLY, 'new body'), false);
  });
});

describe('delete modes in the cache', () => {
  it('l1_delete removes the entry and its place in the parent', () => {
    const next = withLiteDeletion(discussion(), REPLY, 'l1_delete', TOMBSTONE);
    assert.equal(find(next, REPLY), undefined);
    const root = find(next, ROOT) as Entry;
    assert.equal(root.children, 0);
    assert.deepEqual(root.replies, []);
  });

  it('tombstone keeps the entry with the tombstone content, which reads as a tombstone', () => {
    const next = withLiteDeletion(discussion(), REPLY, 'tombstone', TOMBSTONE);
    const reply = find(next, REPLY) as Entry;
    assert.equal(reply.body, '[deleted]');
    assert.equal(reply.title, '');
    assert.equal(isLiteTombstone(reply, APPS), true);
    assert.equal((find(next, ROOT) as Entry).children, 1);
  });

  it('leaves a discussion without the entry as it is', () => {
    const d = discussion();
    const ref = { author: 'did:lite:x', permlink: 'gone' };
    assert.equal(withLiteDeletion(d, ref, 'l1_delete', TOMBSTONE), d);
    assert.equal(withLiteDeletion(d, ref, 'tombstone', TOMBSTONE), d);
  });

  it('is indexed when the entry is gone (l1_delete) or a tombstone (tombstone)', () => {
    const removed = withLiteDeletion(discussion(), REPLY, 'l1_delete', TOMBSTONE);
    assert.equal(showsLiteDeletion(removed, REPLY, 'l1_delete', APPS), true);
    assert.equal(showsLiteDeletion(discussion(), REPLY, 'l1_delete', APPS), false);
    assert.equal(showsLiteDeletion(discussion(), REPLY, 'tombstone', APPS), false);
    const tomb: Discussion = { ...discussion(), x: asLiteTombstone(find(discussion(), REPLY) as Entry, APPS, 'warm-zebra-201') };
    delete tomb[`${REPLY.author}/${REPLY.permlink}`];
    assert.equal(showsLiteDeletion(tomb, REPLY, 'tombstone', APPS), true);
  });
});
