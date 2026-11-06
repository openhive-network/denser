import type { Entry } from '@hive/common-hiveio-packages/wax';
import { getDiscussionWithVotes } from '@transaction/lib/bridge-api';
import { countUpvotes, isVoteFreeDiscussion, SortOrder, type UpvoteCounts } from '@/blog/lib/sorter';

/**
 * Whether `discussion` in `sort` order needs `UpvoteCounts`: in the votes order when it was read
 * without votes. `stats.total_votes` counts votes of no weight too, so it can order it otherwise.
 */
export const needsUpvoteCounts = (discussion: Record<string, Entry>, sort: SortOrder): boolean =>
  sort === SortOrder.votes && isVoteFreeDiscussion(discussion);

/** The upvote counts of a discussion, read with its votes. Rejects as `getDiscussionWithVotes` does. */
export const fetchUpvoteCounts = async (
  author: string,
  permlink: string,
  observer: string
): Promise<UpvoteCounts | null> => {
  const discussion = await getDiscussionWithVotes(author, permlink, observer);
  return discussion && countUpvotes(discussion);
};
