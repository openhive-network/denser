/**
 * Utility for detecting and converting Hive blockchain blog URLs
 * to frontend-agnostic relative paths.
 *
 * Hive has multiple blog frontends (peakd.com, ecency.com, hive.blog, etc.)
 * all serving the same blockchain content. This utility converts URLs from
 * any known frontend to relative paths like `/@username/permlink` that work
 * on any frontend.
 */

/** Hive blog frontend domains */
const HIVE_BLOG_DOMAINS = new Set([
  'hive.blog',
  'peakd.com',
  'ecency.com',
  'leofinance.io',
  'actifit.io',
  'blog.openhive.network',
  'blog.dev.openhive.network'
]);

/** Blog path prefixes that should be converted to relative paths */
const KNOWN_BLOG_PATH_PREFIXES = [
  '/trending', '/hot', '/created', '/payout', '/muted', '/roles',
  '/communities', '/search', '/welcome',
  '/faq.html', '/privacy.html', '/tos.html', '/submit.html'
];

interface HiveUrlMatch {
  originalUrl: string;
  /** Agnostic relative path, e.g. "/@username/permlink", "/trending", "/" */
  relativePath: string;
}

export interface ConversionResult {
  convertedText: string;
  conversionsCount: number;
  hadConversions: boolean;
}

/**
 * Parses a URL and returns the agnostic relative path if it's a known Hive blog URL.
 * Supports user paths (`/@user/...`), feed pages (`/trending/...`), and static pages.
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

  const { pathname, hash } = url;

  // User paths: /@username and all subpaths (posts, followed, lists, etc.)
  const atIndex = pathname.indexOf('/@');
  if (atIndex !== -1) {
    const userPath = pathname.slice(atIndex);
    const segments = userPath.slice(2).split('/');
    if (segments.length === 0 || !segments[0]) return null;

    const username = segments[0];
    if (!/^[a-z0-9][a-z0-9.-]{1,15}$/.test(username)) return null;

    return { originalUrl: urlString, relativePath: userPath + hash };
  }

  // Homepage
  if (pathname === '/' || pathname === '') {
    return { originalUrl: urlString, relativePath: '/' + hash };
  }

  // Known blog paths (feeds, pages, etc.) - exact match or prefix + /
  const isKnownPath = KNOWN_BLOG_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
  if (isKnownPath) {
    return { originalUrl: urlString, relativePath: pathname + hash };
  }

  return null;
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
