import { PUBLISHING_APP } from '@transaction/lib/publishing-app';
import { Entry } from '@hive/common-hiveio-packages/wax';

const PAYOUT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface OptimisticReply {
  username: string;
  reputation: number;
  parentAuthor: string;
  parentPermlink: string;
  body: string;
}

/**
 * Discussion data with an optimistic reply (`_optimistic`, fully interactive) added under a
 * temporary permlink, and the parent's children/replies bumped when the parent is in the thread.
 */
export function withOptimisticReply(
  prevData: Record<string, Entry> | undefined,
  { username, reputation, parentAuthor, parentPermlink, body }: OptimisticReply
) {
  const tempPermlink = `re-${parentAuthor}-${Date.now()}`;
  const isParent = (post: Entry) => post.author === parentAuthor && post.permlink === parentPermlink;
  // A reply to the main post has no parent in discussionData
  const parentPost = prevData ? Object.values(prevData).find(isParent) : undefined;
  const now = new Date().toISOString();
  const newComment = {
    active_votes: [],
    author: username,
    author_payout_value: '0.000 HBD',
    author_reputation: reputation,
    beneficiaries: [],
    blacklists: [],
    body,
    parent_author: parentAuthor,
    parent_permlink: parentPermlink,
    category: parentPost?.category ?? '',
    children: 0,
    created: now,
    curator_payout_value: '0.000 HBD',
    depth: (parentPost?.depth ?? 0) + 1,
    is_paidout: false,
    json_metadata: { images: [], author: username, image: '', app: PUBLISHING_APP },
    max_accepted_payout: '1000000.000 HBD',
    net_rshares: 0,
    payout: 0,
    payout_at: new Date(Date.now() + PAYOUT_WINDOW_MS).toISOString(),
    pending_payout_value: '0.000 HBD',
    percent_hbd: 10000,
    permlink: tempPermlink,
    post_id: Date.now(),
    promoted: '',
    replies: [],
    stats: { hide: false, gray: false, total_votes: 0, flag_weight: 0 },
    title: `Re: ${parentPost?.title ?? 'No title'}`,
    updated: now,
    url: `/${parentPost?.category ?? ''}/@${username}/${tempPermlink}`,
    _optimistic: true
  };
  const updatedData: Record<string, Entry> = {};
  for (const [key, post] of Object.entries(prevData ?? {})) {
    updatedData[key] = isParent(post)
      ? { ...post, children: (post.children || 0) + 1, replies: [...(post.replies || []), tempPermlink] }
      : post;
  }
  updatedData[tempPermlink] = newComment as Entry;
  return { updatedData, tempPermlink };
}
