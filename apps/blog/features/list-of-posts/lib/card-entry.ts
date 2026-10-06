import type { Entry, JsonMetadata } from '@hive/common-hiveio-packages/wax';

/**
 * An entry trimmed to the fields post list cards read. Lists send only these to the client: the
 * body and most of the metadata are by far the largest part of an entry.
 */
export type TrimmedEntry = Pick<
  Entry,
  | 'active_votes'
  | 'author'
  | 'author_payout_value'
  | 'author_reputation'
  | 'author_role'
  | 'author_title'
  | 'beneficiaries'
  | 'blacklists'
  | 'category'
  | 'children'
  | 'community'
  | 'community_title'
  | 'created'
  | 'curator_payout_value'
  | 'max_accepted_payout'
  | 'payout'
  | 'payout_at'
  | 'pending_payout_value'
  | 'percent_hbd'
  | 'permlink'
  | 'reblogged_by'
  | 'reblogs'
  | 'stats'
  | 'title'
> & {
  json_metadata: Pick<JsonMetadata, 'tags'>;
  original_entry?: TrimmedEntry;
};

/** A post list entry with the summary and image its card shows, derived from the dropped body. */
export type CardEntry = TrimmedEntry & { summary: string; cardImage: string };

/**
 * Card entries for a page of posts fetched on the client. The converter, and the Remarkable renderer
 * it runs, load with the first page fetched after startup instead of with the page itself.
 */
export async function loadCardEntries(posts: Promise<Entry[] | null | undefined>): Promise<CardEntry[] | null> {
  const [entries, { toCardEntries }] = await Promise.all([posts, import('./to-card-entries')]);
  return entries ? toCardEntries(entries) : null;
}
