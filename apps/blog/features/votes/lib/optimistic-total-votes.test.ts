import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver, QueryClient } from '@tanstack/react-query';

const { optimisticUpdateTotalVotes } = await import('./optimistic-total-votes.ts');
const { castVoteCount } = await import('./removed-votes.ts');
const { buildOperationMutationOptions } = await import('../../../../../packages/ui/lib/operation-mutation.ts');

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

describe('optimisticUpdateTotalVotes', () => {
  it('rolls the count back after a vote attempt that could not reach the server', async () => {
    const client = new QueryClient();
    client.setQueryData(POST_KEY, {
      author: AUTHOR,
      permlink: PERMLINK,
      is_paidout: true,
      stats: { total_votes: 589, flag_weight: 0, gray: false, hide: false },
      observer_vote: null
    });
    const unreachable = new TypeError('Failed to fetch');
    let countWhileBroadcasting = 0;

    await assert.rejects(
      attemptVote(client, { author: AUTHOR, permlink: PERMLINK, weight: 10000 }, async () => {
        countWhileBroadcasting = countOf(client);
        throw unreachable;
      }),
      unreachable
    );

    assert.equal(countWhileBroadcasting, 590);
    assert.equal(countOf(client), 589);
  });
});
