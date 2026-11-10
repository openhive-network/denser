type NotificationMessageKey =
  | 'voted_on_your_post'
  | 'replied_on_your_post'
  | 'replied_to_your_comment'
  | 'reblogged_on_your_post'
  | 'followed_you'
  | 'mentioned_you'
  | 'mentioned_you_and_others'
  | 'subscribed_to';

type Translate = (key: `user_profile.notifications_tab.${NotificationMessageKey}`, options: Record<string, string>) => string;

// hivemind's English wording of the text after the source account, see `notificationSource`.
const MESSAGE_PATTERNS: { pattern: RegExp; key: NotificationMessageKey; params?: (match: RegExpExecArray) => Record<string, string> }[] = [
  { pattern: /^ voted on your post (\(.+\))$/, key: 'voted_on_your_post', params: (m) => ({ amount: m[1] }) },
  { pattern: /^ replied to your post$/, key: 'replied_on_your_post' },
  { pattern: /^ replied to your comment$/, key: 'replied_to_your_comment' },
  { pattern: /^ reblogged your post$/, key: 'reblogged_on_your_post' },
  { pattern: /^ followed you$/, key: 'followed_you' },
  { pattern: /^ mentioned you$/, key: 'mentioned_you' },
  { pattern: /^ mentioned you and (\d+) others$/, key: 'mentioned_you_and_others', params: (m) => ({ others: m[1] }) },
  { pattern: /^ subscribed to (.+)$/, key: 'subscribed_to', params: (m) => ({ community: m[1] }) }
];

// Stands in for `@{{username}}` so the caller can render the account (bold, linked, badged) itself.
const SOURCE_MARKER = '\u0000';

/**
 * The translated notification around its source account: `before` and `after` are the text on
 * either side of `@<account>`. `text` is the message after the account (`notificationSource`'s
 * `text`); null when hivemind's wording is not one this function knows, so the caller shows it as is.
 */
export function translateNotificationMessage(
  text: string,
  t: Translate
): { before: string; after: string } | null {
  for (const { pattern, key, params } of MESSAGE_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const translated = t(`user_profile.notifications_tab.${key}`, {
      ...params?.(match),
      username: SOURCE_MARKER
    });
    const [before, after] = translated.split(`@${SOURCE_MARKER}`);
    if (after === undefined) return null;
    return { before, after };
  }
  return null;
}
