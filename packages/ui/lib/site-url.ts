/**
 * Resolves a site path against the configured site URL, keeping the URL's own path.
 * `new URL('/login', 'https://h/blog')` drops `/blog`; a deployment served under a base path
 * includes it in its site URL, so every site link must keep it.
 * @param siteUrl - Absolute site URL, optionally with a base path and trailing slash (`https://h/blog/`)
 * @param path - Site path, with or without a leading slash (`/login`)
 * @returns The absolute URL (`https://h/blog/login`)
 */
export function joinSiteUrl(siteUrl: string, path: string): URL {
  const site = new URL(siteUrl);
  const basePath = site.pathname.replace(/\/+$/, '');
  const relativePath = path.replace(/^\/+/, '');
  return new URL(`${basePath}/${relativePath}`, site.origin);
}
