import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver, QueryClient } from '@tanstack/react-query';

const { optimisticUpdateTotalVotes } = await import('./optimistic-total-votes.ts');
const { castVoteCount } = await import('./removed-votes.ts');
const { buildOperationMutationOptions } = await import(
  '../../../../../packages/ui/lib/operation-mutation.ts'
);

type CacheSnapshots = ReturnType<typeof optimisticUpdateTotalVotes>;
type Vote = { author: string; permlink: string; weight: number };

const AUTHOR = 'gtg';
const PERMLINK = 'hive-hardfork-25-jump-starter-kit';
const POST_KEY = ['postData', AUTHOR, PERMLINK];

const effects = {
  notifySuccess: () => {},
  reportError: () => {},
  logSuccess: () => {},
  isUnconfirmedBroadcast: () => false,
  offlineError: () => undefined
};

/** A vote whose broadcast fails as `run` does, with the vote mutation's count update and rollback. */
function attemptVote(client: QueryClient, vote: Vote, run: () => Promise<unknown>) {
  const options = buildOperationMutationOptions<Vote, unknown, CacheSnapshots>(
    client,
    {
      name: 'useVoteMutation',
      run,
      optimistic: ({ author, permlink, weight }, queryClient) =>
        optimisticUpdateTotalVotes(queryClient, author, permlink, weight === 0 ? -1 : 1),
      rollback: (snapshots, _vote, queryClient) => {
        for (const { queryKey, data } of snapshots ?? []) queryClient.setQueryData(queryKey, data);
      }
    },
    effects
  );
  return new MutationObserver(client, options).mutate(vote);
}

const countOf = (client: QueryClient) => castVoteCount(client.getQueryData(POST_KEY) ?? {});

const PAID_OUT = { is_paidout: true, payout_at: '2021-07-07T14:12:15' };
const PENDING = { is_paidout: false, payout_at: '2999-01-01T00:00:00' };

function clientWithPost(payout: typeof PAID_OUT, observerVote: { rshares: number; percent: number } | null) {
  const client = new QueryClient();
  client.setQueryData(POST_KEY, {
    author: AUTHOR,
    permlink: PERMLINK,
    ...payout,
    stats: { total_votes: 589, flag_weight: 0, gray: false, hide: false },
    observer_vote: observerVote
  });
  return client;
}

/** The count while `vote` broadcasts and once it has, the broadcast answering as `outcome` does. */
async function countsAround(client: QueryClient, vote: Vote, outcome: () => Promise<unknown>) {
  let whileBroadcasting = 0;
  const attempt = attemptVote(client, vote, async () => {
    whileBroadcasting = countOf(client);
    return outcome();
  });
  await attempt.catch(() => undefined);
  return { whileBroadcasting, after: countOf(client) };
}

const upvote = { author: AUTHOR, permlink: PERMLINK, weight: 10000 };
const unvote = { ...upvote, weight: 0 };
const broadcast = async () => ({});
const unreachable = async () => {
  throw new TypeError('Failed to fetch');
};

describe('optimisticUpdateTotalVotes', () => {
  it('moves the count by one for a vote on a post not yet paid out', async () => {
    assert.deepEqual(await countsAround(clientWithPost(PENDING, null), upvote, broadcast), {
      whileBroadcasting: 590,
      after: 590
    });
    assert.deepEqual(
      await countsAround(clientWithPost(PENDING, { rshares: 1000, percent: 10000 }), unvote, broadcast),
      { whileBroadcasting: 588, after: 588 }
    );
  });

  it('keeps the count of a paid-out post as the chain gives it for a vote and its removal', async () => {
    assert.deepEqual(await countsAround(clientWithPost(PAID_OUT, null), upvote, broadcast), {
      whileBroadcasting: 589,
      after: 589
    });
    assert.deepEqual(
      await countsAround(clientWithPost(PAID_OUT, { rshares: 0, percent: 10000 }), unvote, broadcast),
      { whileBroadcasting: 589, after: 589 }
    );
  });

  it('keeps the count of a post past its payout time that is not yet marked paid out', async () => {
    const client = clientWithPost({ ...PENDING, payout_at: PAID_OUT.payout_at }, null);
    assert.deepEqual(await countsAround(client, upvote, broadcast), { whileBroadcasting: 589, after: 589 });
  });

  it('rolls the count back after a vote attempt that could not reach the server', async () => {
    assert.deepEqual(await countsAround(clientWithPost(PENDING, null), upvote, unreachable), {
      whileBroadcasting: 590,
      after: 589
    });
  });

  it('leaves the count of a paid-out post unchanged through a failed vote attempt', async () => {
    assert.deepEqual(await countsAround(clientWithPost(PAID_OUT, null), upvote, unreachable), {
      whileBroadcasting: 589,
      after: 589
    });
  });

  it('changes only the entries in each cache a vote still counts on', () => {
    const client = new QueryClient();
    const entry = (permlink: string, payout: typeof PAID_OUT) => ({
      author: AUTHOR,
      permlink,
      ...payout,
      stats: { total_votes: 5, flag_weight: 0, gray: false, hide: false }
    });
    client.setQueryData(['discussionData', AUTHOR, PERMLINK], {
      [`${AUTHOR}/${PERMLINK}`]: entry(PERMLINK, PAID_OUT)
    });
    client.setQueryData(['entriesInfinite', 'trending'], {
      pages: [[entry(PERMLINK, PENDING)]],
      pageParams: [undefined]
    });

    const snapshots = optimisticUpdateTotalVotes(client, AUTHOR, PERMLINK, 1);

    assert.deepEqual(
      snapshots.map(({ queryKey }) => queryKey[0]),
      ['entriesInfinite']
    );
    const discussion = client.getQueryData<Record<string, { stats: { total_votes: number } }>>([
      'discussionData',
      AUTHOR,
      PERMLINK
    ]);
    assert.equal(discussion?.[`${AUTHOR}/${PERMLINK}`].stats.total_votes, 5);
    const feed = client.getQueryData<{ pages: { stats: { total_votes: number } }[][] }>([
      'entriesInfinite',
      'trending'
    ]);
    assert.equal(feed?.pages[0][0].stats.total_votes, 6);
  });
});
