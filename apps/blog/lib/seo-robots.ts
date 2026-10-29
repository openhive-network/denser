import type { Metadata, MetadataRoute } from 'next';
import { absoluteSiteUrl } from './site-url.ts';

/** Robots directive of a public page; the root layout's, so every page inherits it. */
export const INDEX_ROBOTS = { index: true, follow: true } as const satisfies Metadata['robots'];

/** Robots directive of a page whose content depends on who is signed in. */
export const NOINDEX_ROBOTS = { index: false, follow: true } as const satisfies Metadata['robots'];

const FEED_SORTS = ['trending', 'hot', 'created', 'payout', 'muted'];

// Matched as a whole path (with or without a query): `/search` must not also block a `/searchx` tag page.
const USER_SPECIFIC_PAGES = [
  '/@*/feed',
  '/@*/communities',
  '/@*/settings',
  '/@*/notifications',
  ...FEED_SORTS.map((sort) => `/${sort}/my`),
  '/search',
  '/submit.html',
  '/login'
];

const USER_SPECIFIC_PREFIXES = ['/api/'];

export interface IRobotsOptions {
  /** `SEO_ALLOW_INDEXING`: off, the site asks every crawler to stay out. */
  allowIndexing: boolean;
  siteUrl: string;
  /** The app's base path (`/blog`); robots.txt rules are paths on the host. */
  basePath: string;
}

/** The site's robots.txt: everything disallowed, unless indexing is allowed. */
export function buildRobots({ allowIndexing, siteUrl, basePath }: IRobotsOptions): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: '*', disallow: '/' } };
  const disallow = [
    ...USER_SPECIFIC_PAGES.flatMap((page) => [`${basePath}${page}$`, `${basePath}${page}?`]),
    ...USER_SPECIFIC_PREFIXES.map((prefix) => `${basePath}${prefix}`)
  ];
  return {
    rules: { userAgent: '*', allow: `${basePath}/`, disallow },
    sitemap: absoluteSiteUrl('/sitemap.xml', siteUrl)
  };
}
