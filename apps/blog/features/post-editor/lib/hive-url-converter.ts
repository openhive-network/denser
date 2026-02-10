/**
 * Utility for detecting and converting Hive blockchain blog URLs
 * to frontend-agnostic relative paths.
 *
 * Hive has multiple blog frontends (peakd.com, ecency.com, hive.blog, etc.)
 * all serving the same blockchain content. This utility converts URLs from
 * any known frontend to relative paths like `/@username/permlink` that work
 * on any frontend.
 */

/** Hive blog frontend domains that use the standard `/@username/permlink` URL pattern */
const HIVE_BLOG_DOMAINS = new Set([
  'hive.blog',
  'peakd.com',
  'ecency.com',
  'leofinance.io',
  'steemit.com',
  'actifit.io',
  'travelfeed.com',
  'ctptalk.com',
  'splintertalk.io',
  'proofofbrain.io',
  'inji.com',
  'blog.dev.openhive.network'
]);

interface HiveUrlMatch {
  originalUrl: string;
  /** Agnostic relative path, e.g. "/@username/permlink" or "/@username" */
  relativePath: string;
}

export interface ConversionResult {
  convertedText: string;
  conversionsCount: number;
  hadConversions: boolean;
}

/**
 * Parses a URL and returns the agnostic relative path if it's a known Hive blog URL.
 * Supports post URLs (`/@user/permlink`) and profile URLs (`/@user`).
 */
export function parseHiveBlogUrl(urlString: string): HiveUrlMatch | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, '');

  if (!HIVE_BLOG_DOMAINS.has(hostname)) return null;

  const { pathname } = url;
  const atIndex = pathname.indexOf('/@');
  if (atIndex === -1) return null;

  const rawPath = pathname.slice(atIndex);
  // Split into segments: ["", "username", "permlink", ...]
  const segments = rawPath.slice(2).split('/');
  if (segments.length === 0 || !segments[0]) return null;

  const username = segments[0];
  if (!/^[a-z0-9][a-z0-9.-]{1,15}$/.test(username)) return null;

  // Build relative path: /@username or /@username/permlink
  const relativePath = segments.length >= 2 && segments[1]
    ? `/@${segments[0]}/${segments[1]}`
    : `/@${segments[0]}`;

  return { originalUrl: urlString, relativePath };
}

/**
 * Converts all Hive blog URLs in a text string to agnostic relative paths.
 *
 * - URLs inside markdown links `[text](url)` → only the URL is replaced
 * - Bare URLs → wrapped in markdown link syntax `[path](path)` to stay clickable
 */
export function convertHiveUrlsInText(text: string): ConversionResult {
  let conversionsCount = 0;

  // Pass 1: Handle URLs inside markdown link syntax [text](url)
  // Use [^\s)] instead of [^)] to prevent matching across whitespace/newlines
  const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let result = text.replace(MARKDOWN_LINK_REGEX, (match, linkText: string, url: string) => {
    const parsed = parseHiveBlogUrl(url);
    if (!parsed) return match;
    conversionsCount++;
    return `[${linkText}](${parsed.relativePath})`;
  });

  // Pass 2: Handle bare URLs (not already inside markdown link parentheses)
  const BARE_URL_REGEX = /(?<!\]\()https?:\/\/[^\s\])"<>,]+/g;
  result = result.replace(BARE_URL_REGEX, (url) => {
    const parsed = parseHiveBlogUrl(url);
    if (!parsed) return url;
    conversionsCount++;
    return `[${parsed.relativePath}](${parsed.relativePath})`;
  });

  return {
    convertedText: result,
    conversionsCount,
    hadConversions: conversionsCount > 0
  };
}
