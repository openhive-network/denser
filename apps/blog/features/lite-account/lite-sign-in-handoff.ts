import { getStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { removeStorageItemAndNotify, setStorageItemAndNotify } from '@ui/lib/storage-with-ttl-notify';

/**
 * The hand-off from a guest's lite draft to the signed-in editors: a guest who chooses to sign in
 * instead keeps what they typed, in storage, so it survives the sign-in re-render and a sign-in
 * that leaves the page. The normal editors adopt a lite draft when their own is empty.
 */

/** The guest's root-post draft, as the lite post form keeps it. */
export type LiteRootDraft = { title: string; body: string; tags: string; category: string };

export const LITE_POST_DRAFT_KEY = 'lite-postData-new';

const SIGN_IN_REPLY_KEY = 'lite-sign-in-reply';
// Outlives a sign-in that navigates away and back (OAuth), not a later unrelated visit.
const SIGN_IN_REPLY_TTL_MS = 60 * 60 * 1000;

type ReplyParent = { author: string; permlink: string };

/** The fields of the post editor's draft (`AccountFormValues`) a lite root draft fills. */
type PostEditorDraft = { title?: string; postArea?: string; tags?: string; category?: string };

export const liteReplyDraftKey = (parentAuthor: string, parentPermlink: string) => `lite-replyTo-/${parentAuthor}/${parentPermlink}`;

/** Records that the guest left the reply to `author/permlink` to sign in: the reply box reopens there once signed in. */
export function markLiteReplySignIn(author: string, permlink: string): void {
  setStorageItemAndNotify<ReplyParent>(SIGN_IN_REPLY_KEY, { author, permlink }, SIGN_IN_REPLY_TTL_MS);
}

/** True, once, when a guest left the reply to `author/permlink` to sign in; the mark is removed. */
export function takeLiteReplySignIn(author: string, permlink: string): boolean {
  const parent = getStorageItem<ReplyParent>(SIGN_IN_REPLY_KEY);
  if (parent?.author !== author || parent.permlink !== permlink) return false;
  removeStorageItemAndNotify(SIGN_IN_REPLY_KEY);
  return true;
}

/**
 * Moves the guest's reply draft for the parent into `ownKey` when that holds no draft, and
 * removes the lite one. Returns the adopted text, or null when nothing was adopted (no lite
 * draft, or an own draft that is kept, with the lite draft left as it is).
 */
export function adoptLiteReplyDraft(parentAuthor: string, parentPermlink: string, ownKey: string): string | null {
  const liteKey = liteReplyDraftKey(parentAuthor, parentPermlink);
  const lite = getStorageItem<string>(liteKey);
  if (!lite || getStorageItem<string>(ownKey)) return null;
  setStorageItemAndNotify(ownKey, lite, StorageTTL.DRAFT);
  removeStorageItemAndNotify(liteKey);
  return lite;
}

const hasPostContent = (draft: PostEditorDraft | null): boolean => !!(draft?.title || draft?.postArea || draft?.tags);

/**
 * Moves the guest's root-post draft (title, body, tags, category) into the post editor's draft
 * under `ownKey` when that holds no title, body or tags, and removes the lite one. Returns
 * whether it was adopted; an own draft is kept and the lite draft left as it is.
 */
export function adoptLiteRootDraft(ownKey: string): boolean {
  const lite = getStorageItem<LiteRootDraft>(LITE_POST_DRAFT_KEY);
  if (!lite || !(lite.title || lite.body || lite.tags)) return false;
  const own = getStorageItem<PostEditorDraft>(ownKey);
  if (hasPostContent(own)) return false;
  const adopted: PostEditorDraft = { ...own, title: lite.title, postArea: lite.body, tags: lite.tags, category: lite.category };
  setStorageItemAndNotify(ownKey, adopted, StorageTTL.DRAFT);
  removeStorageItemAndNotify(LITE_POST_DRAFT_KEY);
  return true;
}
