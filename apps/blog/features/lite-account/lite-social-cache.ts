import type { AccountFollowStats } from '@hive/common-hiveio-packages/wax';
import type { LiteSocialAction } from './lite-social-state.ts';

/**
 * What the browser's lite account follows, mutes and subscribes to, as the node serves it: Hive
 * accounts by name, lite accounts by DID, communities by name.
 */
export type LiteRelations = { following: string[]; muted: string[]; subscriptions: string[] };

export const EMPTY_LITE_RELATIONS: LiteRelations = { following: [], muted: [], subscriptions: [] };

/** The react-query key of the relations of the lite account `did`. */
export const liteRelationsKey = (did: string) => ['liteSocialRelations', did] as const;

/** The react-query key of an account's follow counts (shared with the Hive author popover). */
export const followCountKey = (account: string) => ['followCountData', account] as const;

const without = (list: string[], item: string) => list.filter((entry) => entry !== item);
const withItem = (list: string[], item: string) => (list.includes(item) ? list : [...list, item]);

/** The relations once `action` is applied; actions on posts or the profile change none. */
export function applyLiteSocialAction(relations: LiteRelations, action: LiteSocialAction): LiteRelations {
  switch (action.method) {
    case 'follow':
      return { ...relations, following: withItem(relations.following, action.target) };
    case 'unfollow':
      return { ...relations, following: without(relations.following, action.target) };
    case 'mute':
      return { ...relations, muted: withItem(relations.muted, action.target) };
    case 'unmute':
      return { ...relations, muted: without(relations.muted, action.target) };
    case 'subscribe':
      return { ...relations, subscriptions: withItem(relations.subscriptions, action.community) };
    case 'unsubscribe':
      return { ...relations, subscriptions: without(relations.subscriptions, action.community) };
    default:
      return relations;
  }
}

/** Whether relations read from the node already show `action` (the indexer caught up). */
export function showsLiteSocialAction(relations: LiteRelations, action: LiteSocialAction): boolean {
  switch (action.method) {
    case 'follow':
      return relations.following.includes(action.target);
    case 'unfollow':
      return !relations.following.includes(action.target);
    case 'mute':
      return relations.muted.includes(action.target);
    case 'unmute':
      return !relations.muted.includes(action.target);
    case 'subscribe':
      return relations.subscriptions.includes(action.community);
    case 'unsubscribe':
      return !relations.subscriptions.includes(action.community);
    default:
      return true;
  }
}

/** +1 for a follow, -1 for an unfollow, 0 for any other action: how the follow counts move. */
export function followCountDelta(action: LiteSocialAction): number {
  if (action.method === 'follow') return 1;
  if (action.method === 'unfollow') return -1;
  return 0;
}

/** `stats` with `field` moved by `delta`, never below zero. */
export function shiftFollowCount(
  stats: AccountFollowStats,
  field: 'follower_count' | 'following_count',
  delta: number
): AccountFollowStats {
  return { ...stats, [field]: Math.max(0, stats[field] + delta) };
}
