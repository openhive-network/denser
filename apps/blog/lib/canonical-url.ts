/** The fields of a post (a bridge `Entry`) its canonical URL is derived from. */
export interface ICanonicalPost {
  category: string;
  author: string;
  permlink: string;
  json_metadata?: { app?: unknown; canonical_url?: unknown } | null;
}

const CANONICAL_URL_PATTERN = /^(hive|https)?:\/\//;
const APP_PATTERN = /^([^/]+)\/[^/]+$/;

// `url_scheme` of condenser's reciprocating apps, as listed in @hiveio/hivescript's
// apps.json (a dependency of @hive/ui only, so inlined here). `hive` and `steempeak` are
// in condenser's whitelist too, but apps.json gives them no url_scheme.
const APP_URL_SCHEMES: ReadonlyMap<string, string> = new Map([
  ['hiveblog', 'https://hive.blog/{category}/@{username}/{permlink}'],
  ['peakd', 'https://peakd.com/{category}/@{username}/{permlink}'],
  ['steemit', 'https://steemit.com/{category}/@{username}/{permlink}'],
  ['esteem', 'https://ecency.com/{category}/@{username}/{permlink}'],
  ['ecency', 'https://ecency.com/{category}/@{username}/{permlink}'],
  ['travelfeed', 'https://travelfeed.com/@{username}/{permlink}'],
  ['leofinance', 'https://leofinance.io/{category}/@{username}/{permlink}']
]);

function appUrlScheme(app: unknown): string | undefined {
  if (typeof app !== 'string') return undefined;
  const name = APP_PATTERN.exec(app)?.[1];
  return name ? APP_URL_SCHEMES.get(name) : undefined;
}

/**
 * Canonical URL of a post page, by condenser's rule (`makeCanonicalLink`):
 * 1. `json_metadata.canonical_url`, when it is a string starting with `hive://`, `https://` or `://`;
 * 2. else the post's URL on the app that published it (`json_metadata.app` = `<name>/<version>`),
 *    when that app is a reciprocating one with a known URL scheme;
 * 3. else the path of the post under its own category (`/<category>/@<author>/<permlink>`),
 *    relative so the root layout's metadataBase resolves it against the configured site.
 */
export function postCanonicalUrl({ category, author, permlink, json_metadata }: ICanonicalPost): string {
  const canonicalUrl = json_metadata?.canonical_url;
  if (typeof canonicalUrl === 'string' && CANONICAL_URL_PATTERN.test(canonicalUrl)) return canonicalUrl;

  const scheme = appUrlScheme(json_metadata?.app);
  if (!scheme) return `/${category}/@${author}/${permlink}`;
  return scheme
    .split('{category}')
    .join(category)
    .split('{username}')
    .join(author)
    .split('{permlink}')
    .join(permlink);
}
