import { describe, it } from 'mocha';
import { expect } from 'chai';
import { fetchHiddenAuthors, withoutHiddenAuthors, type IHiddenAuthorsApi } from './hidden-authors';

type Lists = Record<
  string,
  Partial<Record<'muted' | 'blacklisted' | 'follow_muted' | 'follow_blacklist', string[]>>
>;

const api = (lists: Lists) => {
  const calls: string[] = [];
  const fake: IHiddenAuthorsApi = {
    getFollowList: async (observer, followType) => {
      calls.push(`${followType}:${observer}`);
      return (lists[observer]?.[followType] ?? []).map((name) => ({ name }));
    }
  };
  return { fake, calls };
};

describe('fetchHiddenAuthors', () => {
  it("collects the observer's mutes and blacklist and the lists it follows", async () => {
    const { fake, calls } = api({
      alice: {
        muted: ['spammer'],
        blacklisted: ['scammer'],
        follow_muted: ['curator'],
        follow_blacklist: ['watcher']
      },
      curator: { muted: ['bot'], blacklisted: ['not-followed'] },
      watcher: { muted: ['not-followed-either'], blacklisted: ['plagiarist'] }
    });

    const hidden = await fetchHiddenAuthors('alice', fake);

    expect([...hidden].sort()).to.deep.equal(['bot', 'plagiarist', 'scammer', 'spammer']);
    expect(calls.sort()).to.deep.equal([
      'blacklisted:alice',
      'blacklisted:watcher',
      'follow_blacklist:alice',
      'follow_muted:alice',
      'muted:alice',
      'muted:curator'
    ]);
  });

  it('is empty for an observer without lists', async () => {
    expect((await fetchHiddenAuthors('bob', api({}).fake)).size).to.equal(0);
  });

  it('rejects when a list cannot be read', async () => {
    const failing: IHiddenAuthorsApi = {
      getFollowList: async (_observer, followType) => {
        if (followType === 'follow_muted') throw new Error('node down');
        return [];
      }
    };
    let error: unknown;
    await fetchHiddenAuthors('alice', failing).catch((caught) => (error = caught));
    expect(error).to.be.instanceOf(Error);
  });
});

describe('withoutHiddenAuthors', () => {
  it('drops the posts of hidden authors and keeps the order of the rest', () => {
    const entries = [
      { author: 'alice', permlink: 'a' },
      { author: 'spammer', permlink: 'b' },
      { author: 'carol', permlink: 'c' }
    ];
    expect(withoutHiddenAuthors(entries, new Set(['spammer'])).map((entry) => entry.permlink)).to.deep.equal([
      'a',
      'c'
    ]);
  });
});
