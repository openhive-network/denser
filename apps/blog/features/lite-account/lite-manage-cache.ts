import {
  LITE_TOMBSTONE_BODY,
  tombstoneCommentMetadata,
  type CommentContent,
  type LiteAppIds,
  type LiteDeleteMode
} from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { isLiteTombstone } from './lite-ownership.ts';

export type Discussion = Record<string, Entry>;
export type EntryRef = { author: string; permlink: string };

const isEntry = (ref: EntryRef) => (e: Entry) => e.author === ref.author && e.permlink === ref.permlink;

/** `entry` showing the edited content while the node indexes it. */
export function withLiteEdit(entry: Entry, content: Pick<CommentContent, 'title' | 'body' | 'tags'>, nowIso: string): Entry {
  return {
    ...entry,
    title: content.title,
    body: content.body,
    json_metadata: { ...entry.json_metadata, tags: content.tags },
    updated: nowIso
  };
}

/** `entry` as the tombstone the gateway blank-edited it to. */
export function asLiteTombstone(entry: Entry, apps: LiteAppIds, attester: string): Entry {
  return {
    ...entry,
    title: '',
    body: LITE_TOMBSTONE_BODY,
    json_metadata: { ...entry.json_metadata, ...tombstoneCommentMetadata(apps, attester) }
  };
}

/** `discussion` with `update` applied to the entry `ref`; the same object when it holds none. */
export function updateEntry(discussion: Discussion, ref: EntryRef, update: (entry: Entry) => Entry): Discussion {
  const matches = isEntry(ref);
  if (!Object.values(discussion).some(matches)) return discussion;
  return Object.fromEntries(Object.entries(discussion).map(([key, e]) => [key, matches(e) ? update(e) : e]));
}

/** `discussion` without the entry `ref`, and without it in its parent's replies. */
function withoutEntry(discussion: Discussion, ref: EntryRef): Discussion {
  const matches = isEntry(ref);
  const target = Object.values(discussion).find(matches);
  if (!target) return discussion;
  const isParent = (e: Entry) => e.author === target.parent_author && e.permlink === target.parent_permlink;
  const next: Discussion = {};
  for (const [key, e] of Object.entries(discussion)) {
    if (matches(e)) continue;
    next[key] = isParent(e)
      ? {
          ...e,
          children: Math.max(0, (e.children || 0) - 1),
          replies: (e.replies || []).filter((r) => r !== ref.permlink && r !== `${ref.author}/${ref.permlink}`)
        }
      : e;
  }
  return next;
}

/**
 * The discussion after the gateway deleted `ref` in `mode`: `l1_delete` removed it from the chain,
 * `tombstone` left it in place with the tombstone content.
 */
export function withLiteDeletion(
  discussion: Discussion,
  ref: EntryRef,
  mode: LiteDeleteMode,
  tombstone: { apps: LiteAppIds; attester: string }
): Discussion {
  if (mode === 'l1_delete') return withoutEntry(discussion, ref);
  return updateEntry(discussion, ref, (e) => asLiteTombstone(e, tombstone.apps, tombstone.attester));
}

/** Whether a fetched discussion shows the edit of `ref` indexed (its body is the new one). */
export function showsLiteEdit(fresh: Discussion | null, ref: EntryRef, body: string): boolean {
  const entry = fresh ? Object.values(fresh).find(isEntry(ref)) : undefined;
  return !!entry && !entry._optimistic && entry.body === body;
}

/** Whether a fetched discussion shows the deletion of `ref` indexed: gone, or a tombstone. */
export function showsLiteDeletion(fresh: Discussion | null, ref: EntryRef, mode: LiteDeleteMode, apps: LiteAppIds): boolean {
  if (!fresh) return false;
  const entry = Object.values(fresh).find(isEntry(ref));
  return mode === 'l1_delete' ? !entry : !!entry && isLiteTombstone(entry, apps);
}

/**
 * Where to go after the open post was deleted from the chain: a comment's parent, or the feed
 * of a root post's category.
 */
export function liteDeletedPostDestination(entry: Pick<Entry, 'parent_author' | 'parent_permlink' | 'category'>): string {
  if (entry.parent_author && entry.parent_permlink) {
    return `/${entry.category}/@${entry.parent_author}/${entry.parent_permlink}`;
  }
  return `/created/${entry.category}`;
}
