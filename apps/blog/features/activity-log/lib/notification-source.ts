// hivemind's `msg` names its source first (`@alice replied to your post`); a lite-aware node names a
// lite source by its DID (`@did:lite:bob followed you`).
const SOURCE_PATTERN = /\B@(?:did:lite:)?[a-z0-9.-]+/i;

/**
 * The account a notification message names first (a Hive name or a `did:lite:<name>`) and the
 * text after it; null for a message naming none (e.g. an `error` row).
 */
export function notificationSource(msg: string): { account: string; text: string } | null {
  const match = SOURCE_PATTERN.exec(msg);
  if (!match) return null;
  return { account: match[0].slice(1), text: msg.slice(match.index + match[0].length) };
}
