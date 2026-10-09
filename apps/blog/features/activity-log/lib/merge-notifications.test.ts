import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { mergeNewNotifications } = await import('./merge-notifications.ts');

const item = (id: number) => ({ id, msg: `n${id}`, url: '', date: '', type: 'vote', score: 0 });

describe('mergeNewNotifications', () => {
  it('prepends unseen head items and keeps every loaded page', () => {
    const loaded = [item(10), item(9), item(8), item(2), item(1)];
    const head = [item(12), item(11), item(10), item(9), item(8)];
    assert.deepEqual(
      mergeNewNotifications(loaded, head)?.map((n) => n.id),
      [12, 11, 10, 9, 8, 2, 1]
    );
  });

  it('returns the loaded list itself when the head brings nothing new', () => {
    const loaded = [item(3), item(2), item(1)];
    assert.equal(mergeNewNotifications(loaded, [item(3), item(2)]), loaded);
    assert.equal(mergeNewNotifications(loaded, []), loaded);
    assert.equal(mergeNewNotifications(loaded, null), loaded);
  });

  it('keeps loaded items that dropped out of the head page', () => {
    const loaded = [item(5), item(4)];
    assert.deepEqual(
      mergeNewNotifications(loaded, [item(6)])?.map((n) => n.id),
      [6, 5, 4]
    );
  });

  it('takes the head when nothing is loaded yet', () => {
    const head = [item(1)];
    assert.equal(mergeNewNotifications(undefined, head), head);
    assert.equal(mergeNewNotifications([], head), head);
  });
});
