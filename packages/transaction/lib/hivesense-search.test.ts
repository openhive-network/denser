import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  hiveSenseSyncStatusLooksHealthy,
  isRenderableSearchEntry,
  nextAiSearchPageState,
  partitionHiveSensePosts,
  promiseWithTimeout
} from './hivesense-search';

/**
 * Guest AI search stayed blank because HiveSense entries have no post_id and
 * empty by-ids pages still advanced the pager (#947, #949).
 */
describe('hivesense search fallback', () => {
  describe('health probe (#947)', () => {
    it('accepts the sync-status shape of a node that has processed a block', () => {
      expect(
        hiveSenseSyncStatusLooksHealthy({ last_block_num: 111179054, last_block_time: '2026-10-28T21:56:00' })
      ).to.equal(true);
    });

    it('rejects a node that has not processed its first block', () => {
      expect(hiveSenseSyncStatusLooksHealthy({ last_block_num: 0, last_block_time: null })).to.equal(false);
    });

    it('rejects bodies that are not the sync-status shape', () => {
      expect(hiveSenseSyncStatusLooksHealthy({ last_block_num: '111179054', last_block_time: 'x' })).to.equal(
        false
      );
      expect(hiveSenseSyncStatusLooksHealthy({ last_block_time: '2026-10-28T21:56:00' })).to.equal(false);
      expect(hiveSenseSyncStatusLooksHealthy([{ last_block_num: 1, last_block_time: 'x' }])).to.equal(false);
      expect(hiveSenseSyncStatusLooksHealthy({ code: 'PGRST', message: 'down' })).to.equal(false);
      expect(hiveSenseSyncStatusLooksHealthy('<html>404 Not Found</html>')).to.equal(false);
      expect(hiveSenseSyncStatusLooksHealthy(null)).to.equal(false);
    });
  });

  describe('renderable posts (#949)', () => {
    const fullWithoutPostId = {
      author: 'alice',
      permlink: 'hello-hive',
      title: 'Hello',
      body: 'world'
    };

    it('keeps a full HiveSense entry that omits post_id', () => {
      expect(isRenderableSearchEntry(fullWithoutPostId)).to.equal(true);
    });

    it('keeps a legacy entry that has post_id', () => {
      expect(
        isRenderableSearchEntry({ author: 'alice', permlink: 'hello', post_id: 7, title: 'Hello' })
      ).to.equal(true);
    });

    it('rejects stubs, empties, and junk', () => {
      expect(isRenderableSearchEntry({ author: 'alice', permlink: 'hello-hive' })).to.equal(false);
      expect(isRenderableSearchEntry(null)).to.equal(false);
      expect(isRenderableSearchEntry({ author: '', permlink: 'x', title: 't' })).to.equal(false);
    });

    it('splits a mixed search payload into full posts and stubs', () => {
      const { fullPosts, stubPosts } = partitionHiveSensePosts([
        null,
        fullWithoutPostId,
        { author: 'bob', permlink: 'stub-only' },
        { author: 'carol', permlink: 'also', title: 'Also' }
      ]);
      expect(fullPosts.map((post) => post.author)).to.deep.equal(['alice', 'carol']);
      expect(stubPosts.map((post) => post.author)).to.deep.equal(['bob']);
    });
  });

  describe('empty-page pagination (#949)', () => {
    it('advances only when the batch produced visible posts', () => {
      expect(nextAiSearchPageState({ currentPage: 2, validCount: 3, consecutiveEmpty: 1 })).to.deep.equal({
        currentPage: 3,
        consecutiveEmpty: 0,
        stop: false
      });
    });

    it('does not advance and stops when a batch has zero valid posts', () => {
      expect(nextAiSearchPageState({ currentPage: 1, validCount: 0, consecutiveEmpty: 0 })).to.deep.equal({
        currentPage: 1,
        consecutiveEmpty: 1,
        stop: true
      });
    });
  });

  describe('request timeout (#947)', () => {
    it('rejects when the call does not settle in time', async () => {
      const hung = new Promise(() => undefined);
      try {
        await promiseWithTimeout(hung, 20, 'searchPosts');
        expect.fail('should have timed out');
      } catch (error) {
        expect((error as Error).message).to.equal('searchPosts timed out after 20ms');
      }
    });

    it('resolves when the call finishes first', async () => {
      const result = await promiseWithTimeout(Promise.resolve('ok'), 200, 'searchPosts');
      expect(result).to.equal('ok');
    });
  });
});
