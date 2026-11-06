import { useQuery } from '@tanstack/react-query';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import type { SortOrder, UpvoteCounts } from '@/blog/lib/sorter';
import { StaleTime } from '@/blog/lib/react-query';
import { fetchUpvoteCounts, needsUpvoteCounts } from '../lib/discussion-upvotes';

interface IDiscussionUpvotesParams {
  author: string;
  permlink: string;
  observer: string;
  postsNamespace: string;
  discussion: Record<string, Entry> | null | undefined;
  sort: SortOrder;
  /** The counts the server seeded the first page with, for `seededSort`, while only that page is at hand. */
  seeded?: UpvoteCounts;
  seededSort?: SortOrder;
}

/**
 * The upvote counts `discussion` needs in `sort` order (see `needsUpvoteCounts`), or undefined. The
 * server's seeded counts serve the seeded page; otherwise they are read with the discussion's votes,
 * and the discussion is sorted without them until they arrive.
 */
export function useDiscussionUpvotes({
  author,
  permlink,
  observer,
  postsNamespace,
  discussion,
  sort,
  seeded,
  seededSort
}: IDiscussionUpvotesParams): UpvoteCounts | undefined {
  const needed = !!discussion && needsUpvoteCounts(discussion, sort);
  const seededCounts = sort === seededSort ? seeded : undefined;
  const { data } = useQuery({
    queryKey: ['discussionUpvotes', author, permlink, observer, postsNamespace],
    queryFn: () => fetchUpvoteCounts(author, permlink, observer),
    enabled: needed && !seededCounts,
    staleTime: StaleTime.MEDIUM
  });
  if (!needed) return undefined;
  return seededCounts ?? data ?? undefined;
}
