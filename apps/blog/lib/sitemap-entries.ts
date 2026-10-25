import type { MetadataRoute } from 'next';
import { absoluteSiteUrl } from './site-url.ts';

const FEED_PAGES = ['/', '/trending', '/hot', '/created', '/payout', '/communities'];
const STATIC_PAGES = ['/welcome', '/faq.html', '/tos.html', '/privacy.html'];
const COMMUNITY_NAME = /^hive-\d+$/;

/**
 * The sitemap: the main feeds, the static pages and the given communities' pages, in that order.
 * A community name that isn't one (`hive-<number>`) is left out rather than put in a URL.
 */
export function buildSitemap(siteUrl: string, communities: readonly string[]): MetadataRoute.Sitemap {
  const pages = (paths: readonly string[], changeFrequency: 'hourly' | 'monthly') =>
    paths.map((path) => ({ url: absoluteSiteUrl(path, siteUrl), changeFrequency }));
  const communityPaths = [...new Set(communities)]
    .filter((name) => COMMUNITY_NAME.test(name))
    .map((name) => `/trending/${name}`);
  return [
    ...pages(FEED_PAGES, 'hourly'),
    ...pages(STATIC_PAGES, 'monthly'),
    ...pages(communityPaths, 'hourly')
  ];
}
