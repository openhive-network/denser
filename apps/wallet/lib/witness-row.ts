/** Hive front ends whose post URLs a witness announcement can be opened from on our own blog. */
const HIVE_FRONT_ENDS = [
  'hive.blog',
  'peakd.com',
  'ecency.com',
  'inleo.io',
  'leofinance.io',
  'hivesuite.app',
  'ureka.social'
];

// Tabs of an account's page, which share the post path's shape: `/@author/posts` is not a post.
const PROFILE_TABS = new Set([
  'activities',
  'author-rewards',
  'blog',
  'comments',
  'communities',
  'curation-rewards',
  'feed',
  'followers',
  'following',
  'muted',
  'notifications',
  'payout',
  'permissions',
  'posts',
  'replies',
  'settings',
  'wallet'
]);

// `/@author/permlink` or `/<category>/@author/permlink`, with Hive's account name and permlink characters
const POST_PATH = /^\/(?:[^/@]+\/)?@([a-z0-9.-]{3,16})\/([a-z0-9-]+)\/?$/;

const MAX_LABEL_LENGTH = 30;

/** Where a witness's URL leads: a post we open on our blog, or another site, with the text naming it. */
export type WitnessSite =
  | { kind: 'announcement'; postPath: string }
  | { kind: 'external'; href: string; label: string };

const withoutWww = (hostname: string) => hostname.replace(/^www\./, '');

const truncate = (text: string, length: number) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/**
 * Reads a witness's URL. Witness URLs come from the blockchain and are attacker-controlled, so only
 * a parseable `https:` URL without embedded credentials is accepted; anything else gives `null`.
 * A post on a known Hive front end is an announcement, opened on our blog at `postPath`
 * (`/@author/permlink`); any other URL, an account page's tab (`/@author/posts`) among them, is an
 * external site labelled by its host and path.
 */
export const parseWitnessSite = (url: unknown): WitnessSite | null => {
  if (typeof url !== 'string' || !URL.canParse(url)) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;

  const hostname = withoutWww(parsed.hostname);
  const post = HIVE_FRONT_ENDS.includes(hostname) ? POST_PATH.exec(parsed.pathname) : null;
  if (post && !PROFILE_TABS.has(post[2])) return { kind: 'announcement', postPath: `/@${post[1]}/${post[2]}` };

  const path = parsed.pathname.replace(/\/+$/, '');
  return { kind: 'external', href: encodeURI(url), label: truncate(hostname + path, MAX_LABEL_LENGTH) };
};

/**
 * Whether a witness has published a price feed: `lastUpdate`, a Hive timestamp (UTC, usually without a
 * zone designator), is set and later than the epoch the chain gives a witness that never published.
 */
export const hasPublishedFeed = (lastUpdate: string | undefined): boolean => {
  if (!lastUpdate) return false;
  const time = Date.parse(lastUpdate.replace(/Z?$/, 'Z'));
  return Number.isFinite(time) && time > 0;
};

const versionParts = (version: string) => version.split('.').map((part) => Number.parseInt(part, 10) || 0);

/** Whether dotted version `a` is lower than `b`, comparing part by part as numbers. */
export const isVersionBelow = (a: string, b: string): boolean => {
  const left = versionParts(a);
  const right = versionParts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
};

/** The version most of `versions` run; the higher one on a tie, `undefined` for none. */
export const majorityVersion = (versions: readonly string[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const version of versions) counts.set(version, (counts.get(version) ?? 0) + 1);
  let best: string | undefined;
  for (const [version, count] of counts) {
    const bestCount = best === undefined ? 0 : (counts.get(best) ?? 0);
    if (count > bestCount || (count === bestCount && best !== undefined && isVersionBelow(best, version))) {
      best = version;
    }
  }
  return best;
};
