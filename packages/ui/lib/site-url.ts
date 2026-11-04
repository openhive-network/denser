/**
 * Resolves a site path against the configured site URL, keeping the URL's own path.
 * `new URL('/login', 'https://h/blog')` drops `/blog`; a deployment served under a base path
 * includes it in its site URL, so every site link must keep it.
 * @param siteUrl - Absolute site URL, optionally with a base path and trailing slash (`https://h/blog/`)
 * @param path - Site path, with or without a leading slash (`/login`)
 * @returns The absolute URL (`https://h/blog/login`)
 * @throws {Error} If the result would leave the site's origin
 */
export function joinSiteUrl(siteUrl: string, path: string): URL {
  const site = new URL(siteUrl);
  const basePath = site.pathname.replace(/\/+$/, '');
  // The URL parser drops tabs and newlines and reads `\` as `/`, so any of them left at the start
  // would make the joined path scheme-relative (`//other.host`).
  const relativePath = path.replace(/^[/\\\t\n\r]+/, '');
  const url = new URL(`${basePath}/${relativePath}`, site.origin);
  if (url.origin !== site.origin) {
    throw new Error(`Site path leaves the site origin: ${path}`);
  }
  return url;
}
