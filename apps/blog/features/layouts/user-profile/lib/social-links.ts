import { isSafeExternalUrl } from '@ui/lib/css-utils';

/**
 * Social handles an account owner claims in `posting_json_metadata.profile.social`.
 * They are self-declared and NOT verified: anyone can type any handle.
 */
export const SOCIAL_KEYS = ['x', 'ig', 'yt', 'tg', 'bsky', 'dc', 'nostr'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type SocialHandles = Partial<Record<SocialKey, string>>;

export interface SocialLink {
  key: SocialKey;
  handle: string;
  /** Profile URL on the platform; null for platforms without one (shown as copyable text). */
  url: string | null;
}

interface PlatformRule {
  pattern: RegExp;
  /** Whether a single leading `@` typed by the user is dropped before validation. */
  stripAt: boolean;
  urlPrefix: string | null;
}

// Dot-allowing handles must not start/end with a dot or contain `..`, so a handle
// can never act as a path segment like `.` or `..` in the profile URL.
const PLATFORM_RULES: Record<SocialKey, PlatformRule> = {
  x: { pattern: /^[A-Za-z0-9_]{1,15}$/, stripAt: true, urlPrefix: 'https://x.com/' },
  ig: {
    pattern: /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/,
    stripAt: true,
    urlPrefix: 'https://www.instagram.com/'
  },
  yt: {
    pattern: /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._-]{3,30}$/,
    stripAt: true,
    urlPrefix: 'https://www.youtube.com/@'
  },
  tg: { pattern: /^[A-Za-z][A-Za-z0-9_]{4,31}$/, stripAt: true, urlPrefix: 'https://t.me/' },
  bsky: {
    pattern: /^(?=.{3,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/,
    stripAt: true,
    urlPrefix: 'https://bsky.app/profile/'
  },
  dc: { pattern: /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9_.]{2,32}$/, stripAt: true, urlPrefix: null },
  nostr: { pattern: /^npub1[02-9ac-hj-np-z]{58}$/, stripAt: false, urlPrefix: null }
};

/**
 * Normalizes a handle typed for `key` (trims, drops a leading `@` where the platform
 * allows it) and returns it, or null when it does not match the platform's charset
 * and length.
 */
export function normalizeSocialHandle(key: SocialKey, raw: string): string | null {
  const rule = PLATFORM_RULES[key];
  const trimmed = raw.trim();
  const handle = rule.stripAt && trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return rule.pattern.test(handle) ? handle : null;
}

function buildSocialLink(key: SocialKey, value: unknown): SocialLink | null {
  if (typeof value !== 'string') return null;
  const handle = normalizeSocialHandle(key, value);
  if (!handle) return null;
  const { urlPrefix } = PLATFORM_RULES[key];
  if (urlPrefix === null) return { key, handle, url: null };
  const url = urlPrefix + handle;
  return isSafeExternalUrl(url) ? { key, handle, url } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads `profile.social` from an account's `posting_json_metadata` JSON string.
 * Unknown keys, non-string values, invalid handles and malformed JSON are ignored.
 * Links are returned in `SOCIAL_KEYS` order.
 */
export function parseSocialLinks(postingJsonMetadata: string | undefined): SocialLink[] {
  if (!postingJsonMetadata) return [];
  let metadata: unknown;
  try {
    metadata = JSON.parse(postingJsonMetadata);
  } catch {
    return [];
  }
  if (!isRecord(metadata) || !isRecord(metadata.profile) || !isRecord(metadata.profile.social)) return [];
  const social = metadata.profile.social;
  return SOCIAL_KEYS.map((key) => buildSocialLink(key, social[key])).filter(
    (link): link is SocialLink => link !== null
  );
}

/** The valid handles in `profile.social`, keyed by platform. */
export function parseSocialHandles(postingJsonMetadata: string | undefined): SocialHandles {
  const handles: SocialHandles = {};
  for (const { key, handle } of parseSocialLinks(postingJsonMetadata)) handles[key] = handle;
  return handles;
}
