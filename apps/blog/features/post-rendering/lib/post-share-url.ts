import { configuredBlogDomain } from '@hive/ui/config/public-vars';
import { joinSiteUrl } from '@hive/ui/lib/site-url';

/**
 * Absolute URL of a post on this blog, for sharing.
 * @param path - Post path as returned by the API (`/category/@author/permlink`)
 * @returns The post path resolved against the configured blog URL, keeping its base path
 */
export function getPostShareUrl(path: string): string {
  return joinSiteUrl(configuredBlogDomain, path).toString();
}
