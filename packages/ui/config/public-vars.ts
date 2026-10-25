import env from '@beam-australia/react-env';
import { resolveSessionTime } from '@hive/ui/lib/session-time';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

export const configuredAIDomain = env('AI_DOMAIN') ?? 'https://api.hive.blog';
export const configuredSiteDomain = env('SITE_DOMAIN') ?? 'https://hive.blog/';
export const configuredImagesEndpoint = (env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog').replace(/\/+$/, '');
export const configuredApiEndpoint = (env('API_ENDPOINT') ?? 'https://api.hive.blog').replace(/\/+$/, '');
export const configuredRestApiEndpoint = env('REST_API_ENDPOINT')?.replace(/\/+$/, '') || undefined;
/** The haf_fyp API root of the blog's For You feed; the feed is off when it is unset. */
export const configuredFypApiUrl = env('FYP_API_URL')?.replace(/\/+$/, '') || undefined;
export const configuredBlogDomain = env('BLOG_DOMAIN') ?? 'https://hive.blog/';
export const configuredSessionTime = resolveSessionTime(
  env('APP_SESSION_TIME'),
  process.env.DENSER_APP === 'wallet' ? 'wallet' : 'blog'
);
/**
 * API nodes the browser fails over across; the default mirrors the CSP's own. The CSP `connect-src`
 * allows them plus the node picker's nodes (`PICKER_API_NODES`), which are not failover targets.
 */
export const configuredAllowedApiNodes =
  env('ALLOWED_HIVE_API_NODES') ?? 'https://api.hive.blog https://api.syncad.com https://api.openhive.network';
