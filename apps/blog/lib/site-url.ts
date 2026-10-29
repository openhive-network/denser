/** The site's public URL (`REACT_APP_SITE_DOMAIN`); the root layout's metadataBase. */
export const SITE_URL = process.env.REACT_APP_SITE_DOMAIN || 'https://hive.blog';

/**
 * Absolute URL of a site path (`/trending`), joined onto the site URL's own path as Next joins
 * a relative metadata URL onto metadataBase. An absolute URL is returned unchanged.
 */
export function absoluteSiteUrl(path: string, siteUrl: string = SITE_URL): string {
  if (!path.startsWith('/')) return path;
  return `${siteUrl.replace(/\/+$/, '')}${path}`;
}
