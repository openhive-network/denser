import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { MAX_COMMENTS_PER_PAGE, getEntryKey, paginateDiscussion } = await import('./paginate-threads.ts');

interface ITestEntry {
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  depth: number;
}

const POST: ITestEntry = { author: 'op', permlink: 'post', parent_author: '', parent_permlink: 'tag', depth: 0 };

const reply = (parent: ITestEntry, permlink: string): ITestEntry => ({
  author: 'user',
  permlink,
  parent_author: parent.author,
  parent_permlink: parent.permlink,
  depth: parent.depth + 1
});

// A top-level reply to POST followed by a chain of `chainLength` nested replies under it.
const thread = (name: string, chainLength: number): ITestEntry[] => {
  const entries = [reply(POST, name)];
  for (let i = 1; i <= chainLength; i++) entries.push(reply(entries[i - 1], `${name}-${i}`));
  return entries;
};

const allPages = <T extends ITestEntry>(entries: T[], root: ITestEntry) => {
  const { totalPages } = paginateDiscussion(entries, root, 1);
  return Array.from({ length: totalPages }, (_, i) => paginateDiscussion(entries, root, i + 1).comments);
};

const replyKeysOnPages = (pages: ITestEntry[][], root: ITestEntry) =>
  pages.flatMap((comments) => comments.filter((entry) => entry.depth > root.depth).map(getEntryKey));

describe('paginateDiscussion', () => {
  it('moves a thread that does not fit the rest of a page to the next page whole', () => {
    const first = thread('first', 30);
    const second = thread('second', 30);
    const pages = allPages([POST, ...first, ...second], POST);

    assert.equal(pages.length, 2);
    assert.deepEqual(pages[0].map(getEntryKey), [POST, ...first].map(getEntryKey));
    assert.deepEqual(pages[1].map(getEntryKey), [POST, ...second].map(getEntryKey));
  });

  it('gives a thread larger than a page a page of its own instead of cutting it', () => {
    const small = thread('small', 2);
    const huge = thread('huge', MAX_COMMENTS_PER_PAGE + 10);
    const pages = allPages([POST, ...small, ...huge, ...thread('after', 2)], POST);

    assert.equal(pages.length, 3);
    assert.deepEqual(pages[1].map(getEntryKey), [POST, ...huge].map(getEntryKey));
  });

  it('packs whole threads in order up to the page limit', () => {
    const threads = Array.from({ length: 30 }, (_, i) => thread(`t${i}`, 2));
    const pages = allPages([POST, ...threads.flat()], POST);

    assert.deepEqual(
      pages.map((comments) => comments.length),
      [1 + 3 * 16, 1 + 3 * 14]
    );
  });

  it('puts every reply of a recorded 981-reply discussion on exactly one page', () => {
    const recording = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          '../../../playwright/tests/mock/fixtures/postLargeDiscussion/0002-bridge.get_discussion.json'
        ),
        'utf8'
      )
    );
    const entries: ITestEntry[] = Object.values(recording.response.result);
    const root = entries.find((entry) => entry.depth === 0);
    assert.ok(root);
    const pages = allPages(entries, root);
    const replyKeys = replyKeysOnPages(pages, root);

    assert.equal(replyKeys.length, entries.length - 1);
    assert.equal(new Set(replyKeys).size, replyKeys.length);
    for (const comments of pages) assert.ok(comments.length <= MAX_COMMENTS_PER_PAGE);
  });

  it('paginates a comment page by the replies to that comment', () => {
    const main = reply(POST, 'main');
    const child = reply(main, 'child');
    const grandchild = reply(child, 'grandchild');
    const { comments, totalPages, totalMainComments } = paginateDiscussion(
      [POST, main, child, grandchild, ...thread('other', 1)],
      main,
      1
    );

    assert.equal(totalPages, 1);
    assert.equal(totalMainComments, 1);
    assert.deepEqual(comments.map(getEntryKey), [POST, main, child, grandchild].map(getEntryKey));
  });
});
