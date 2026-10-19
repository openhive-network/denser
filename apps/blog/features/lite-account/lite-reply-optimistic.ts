import { bridgedCommentMetadata, liteDid, type BuiltLiteReply, type LiteAppIds } from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';

export type LiteReplyVariables = {
  built: BuiltLiteReply;
  gateAccount: string;
  apps: LiteAppIds;
  attester: string;
  body: string;
  parentAuthor: string;
  parentPermlink: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  /** Whether the discussion was read through `lite.*`, where the reply's author is its DID. */
  native: boolean;
};

export type Discussion = Record<string, Entry>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The author the node will list the reply under: the lite account's DID when it serves lite posts
 * natively, else the gate account that posted it on chain.
 */
export function optimisticReplyAuthor(v: Pick<LiteReplyVariables, 'native' | 'gateAccount' | 'attester'>): string {
  return v.native ? liteDid(v.attester) : v.gateAccount;
}

// A native discussion is keyed `<author>/<permlink>` like every entry the node returns; the compat
// cache keeps the permlink key it always had.
const optimisticKey = (v: LiteReplyVariables): string =>
  v.native ? `${optimisticReplyAuthor(v)}/${v.built.permlink}` : v.built.permlink;

/** An optimistic reply, attributed to the lite name via json_metadata. */
function optimisticEntry(v: LiteReplyVariables, parent: Entry | undefined, nowIso: string): Entry {
  const author = optimisticReplyAuthor(v);
  const jsonMetadata = { image: '', images: [], author: v.attester };
  Object.assign(jsonMetadata, bridgedCommentMetadata(v.apps, v.attester, []));
  return {
    active_votes: [],
    author,
    author_payout_value: '0.000 HBD',
    author_reputation: 25,
    beneficiaries: [],
    blacklists: [],
    body: v.body,
    parent_author: v.parentAuthor,
    parent_permlink: v.parentPermlink,
    category: parent?.category ?? '',
    children: 0,
    created: nowIso,
    curator_payout_value: '0.000 HBD',
    depth: (parent?.depth ?? 0) + 1,
    is_paidout: false,
    json_metadata: jsonMetadata,
    max_accepted_payout: '1000000.000 HBD',
    net_rshares: 0,
    payout: 0,
    payout_at: new Date(Date.now() + WEEK_MS).toISOString(),
    pending_payout_value: '0.000 HBD',
    percent_hbd: 10000,
    permlink: v.built.permlink,
    post_id: Date.now(),
    promoted: '',
    replies: [],
    stats: { hide: false, gray: false, total_votes: 0, flag_weight: 0 },
    title: `Re: ${parent?.title ?? ''}`,
    updated: nowIso,
    url: `/${parent?.category ?? ''}/@${author}/${v.built.permlink}`,
    _optimistic: true
  };
}

/** `prev` with the optimistic reply added and counted in its parent's replies. */
export function withOptimisticReply(prev: Discussion | undefined, v: LiteReplyVariables): Discussion {
  const isParent = (e: Entry) => e.author === v.parentAuthor && e.permlink === v.parentPermlink;
  const parent = prev ? Object.values(prev).find(isParent) : undefined;
  const next: Discussion = {};
  for (const [key, post] of Object.entries(prev ?? {})) {
    next[key] = isParent(post)
      ? { ...post, children: (post.children || 0) + 1, replies: [...(post.replies || []), v.built.permlink] }
      : post;
  }
  next[optimisticKey(v)] = optimisticEntry(v, parent, new Date().toISOString());
  return next;
}

/** Whether a fetched discussion holds the indexed reply (`permlink`), not just the optimistic one. */
export function hasIndexedReply(fresh: Discussion | null, v: LiteReplyVariables, permlink: string): boolean {
  if (!fresh) return false;
  const author = optimisticReplyAuthor(v);
  if (v.native) {
    const entry = fresh[`${author}/${permlink}`];
    return !!entry && !entry._optimistic;
  }
  return Object.values(fresh).some((e) => e.author === author && e.permlink === permlink && !e._optimistic);
}
