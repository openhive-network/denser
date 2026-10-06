import type { Entry, MixedPostsResponse, PostStub } from '@hive/common-hiveio-packages/wax';
import { getPostSummary } from '@/blog/lib/post-summary';
import { find_first_img } from './card-image';
import type { CardEntry, TrimmedEntry } from './card-entry';

function trimEntry(entry: Entry): TrimmedEntry {
  const trimmed: TrimmedEntry = {
    active_votes: entry.active_votes,
    author: entry.author,
    author_payout_value: entry.author_payout_value,
    author_reputation: entry.author_reputation,
    author_role: entry.author_role,
    author_title: entry.author_title,
    beneficiaries: entry.beneficiaries,
    blacklists: entry.blacklists,
    category: entry.category,
    children: entry.children,
    community: entry.community,
    community_title: entry.community_title,
    created: entry.created,
    curator_payout_value: entry.curator_payout_value,
    json_metadata: { tags: entry.json_metadata?.tags },
    max_accepted_payout: entry.max_accepted_payout,
    payout: entry.payout,
    payout_at: entry.payout_at,
    pending_payout_value: entry.pending_payout_value,
    percent_hbd: entry.percent_hbd,
    permlink: entry.permlink,
    reblogged_by: entry.reblogged_by,
    reblogs: entry.reblogs,
    stats: entry.stats,
    title: entry.title
  };
  if (entry.original_entry) trimmed.original_entry = trimEntry(entry.original_entry);
  return trimmed;
}

/**
 * Derives the card summary and image of a post and trims it to what its card reads.
 *
 * Run this where the list is fetched (server components import it, client query functions
 * `import()` it), so neither the bodies nor the Remarkable renderer reach the page's initial payload.
 */
export function toCardEntry(entry: Entry): CardEntry {
  return {
    ...trimEntry(entry),
    summary: getPostSummary(entry.json_metadata, entry.body),
    cardImage: find_first_img(entry)
  };
}

export function toCardEntries(entries: Entry[]): CardEntry[] {
  return entries.map(toCardEntry);
}

/** Converts the full posts of a HiveSense search result; its stubs, fetched page by page later, stay as they are. */
export function toCardSearchResults(results: MixedPostsResponse): Array<CardEntry | PostStub> {
  return results.map((post) => (post && 'body' in post ? toCardEntry(post) : post));
}
