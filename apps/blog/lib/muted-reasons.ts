/**
 * Hivemind muted_reasons enum values.
 * See: hivemind/hive/db/sql_scripts/postgrest/utilities/muted_reasons_operations.sql
 */
export enum MutedReason {
  COMMUNITY_MODERATION = 0,
  COMMUNITY_TYPE = 1,
  PARENT_MUTED = 2,
  LOW_REPUTATION = 3,
  COMMUNITY_ROLE = 4
}

const COMMENT_REASON_KEYS: Record<number, string> = {
  [MutedReason.COMMUNITY_MODERATION]: 'cards.comment_card.reason_community_moderation',
  [MutedReason.COMMUNITY_TYPE]: 'cards.comment_card.reason_community_type',
  [MutedReason.PARENT_MUTED]: 'cards.comment_card.reason_parent_muted',
  [MutedReason.LOW_REPUTATION]: 'cards.comment_card.reason_low_reputation',
  [MutedReason.COMMUNITY_ROLE]: 'cards.comment_card.reason_community_role'
};

const POST_HIDDEN_KEYS: Record<number, string> = {
  [MutedReason.COMMUNITY_MODERATION]: 'post_content.body.content_hidden_community_moderation',
  [MutedReason.COMMUNITY_TYPE]: 'post_content.body.content_hidden_community_type',
  [MutedReason.PARENT_MUTED]: 'post_content.body.content_hidden_parent_muted',
  [MutedReason.LOW_REPUTATION]: 'post_content.body.content_hidden_low_reputation',
  [MutedReason.COMMUNITY_ROLE]: 'post_content.body.content_hidden_community_role'
};

/**
 * Returns the translation key for the comment mute reason tag.
 * Priority: muted by viewer > blacklisted > muted_reasons from API > fallback "downvoted"
 */
export function getCommentMuteReasonKey(
  mutedReasons: number[] | undefined,
  isMutedByViewer: boolean,
  isBlacklisted: boolean
): string {
  if (isMutedByViewer) return 'cards.comment_card.reason_muted';
  if (isBlacklisted) return 'cards.comment_card.reason_blacklisted';

  if (mutedReasons && mutedReasons.length > 0) {
    const key = COMMENT_REASON_KEYS[mutedReasons[0]];
    if (key) return key;
  }

  return 'cards.comment_card.reason_downvoted';
}

/**
 * Returns the translation key for the post hidden message.
 * Uses muted_reasons from API when available, falls back to generic message.
 */
export function getPostHiddenMessageKey(mutedReasons: number[] | undefined): string {
  if (mutedReasons && mutedReasons.length > 0) {
    const key = POST_HIDDEN_KEYS[mutedReasons[0]];
    if (key) return key;
  }

  return 'post_content.body.content_were_hidden';
}
