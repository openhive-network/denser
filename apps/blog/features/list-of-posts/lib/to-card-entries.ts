import type { Entry, MixedPostsResponse, PostStub } from '@hive/common-hiveio-packages/wax';
import { AI_SEARCH_BODY_LENGTH } from '@transaction/lib/hivesense-search';
import { dropUnfinishedMarkup } from '@/blog/lib/cut-body';
import { getPostSummary } from '@/blog/lib/post-summary';
import { find_first_img } from './card-image';
import { isLiteDid } from '@/blog/features/lite-account/lite-did';
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
  if (isLiteDid(entry.author)) trimmed.url = entry.url;
  return trimmed;
}

/**
 * Derives the card summary and image of a post and trims it to what its card reads.
 *
 * Run this where the list is fetched (server components import it, client query functions
 * `import()` it), so neither the bodies nor the Remarkable renderer reach the page's initial payload.
 *
 * @param bodyCutAt - the length the server cut the body at, when it was fetched cut
 */
export function toCardEntry(entry: Entry, bodyCutAt?: number): CardEntry {
  const post = bodyCutAt ? { ...entry, body: dropUnfinishedMarkup(entry.body, bodyCutAt) } : entry;
  return {
    ...trimEntry(post),
    summary: getPostSummary(post.json_metadata, post.body),
    cardImage: find_first_img(post)
  };
}

export function toCardEntries(entries: Entry[], bodyCutAt?: number): CardEntry[] {
  return entries.map((entry) => toCardEntry(entry, bodyCutAt));
}

/** Converts the full posts of a HiveSense search result; its stubs, fetched page by page later, stay as they are. */
export function toCardSearchResults(results: MixedPostsResponse): Array<CardEntry | PostStub> {
  return results.map((post) => (post && 'body' in post ? toCardEntry(post, AI_SEARCH_BODY_LENGTH) : post));
}
