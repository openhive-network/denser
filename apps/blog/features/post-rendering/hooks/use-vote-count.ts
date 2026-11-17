import type { Entry } from '@hive/common-hiveio-packages/wax';
import { useLoadedActiveVotes } from '@/blog/components/hooks/use-active-votes';
import { castVoteCount } from '@/blog/features/votes/lib/removed-votes';
import { countCountedVotes } from '../lib/counted-votes';

/**
 * The vote count to label `entry` with. Once the page has loaded its full vote list (the voters
 * popover does), the number of that list's counted votes, so the label agrees with the list;
 * until then `castVoteCount`. Loads nothing itself.
 */
export function useVoteCount(entry: Entry | null | undefined): number {
  const loadedVotes = useLoadedActiveVotes(entry?.author ?? '', entry?.permlink ?? '');
  if (!entry) return 0;
  return loadedVotes ? countCountedVotes(loadedVotes, entry.payout_at) : castVoteCount(entry);
}
