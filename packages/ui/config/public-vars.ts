import env from '@beam-australia/react-env';
import { parsePasskeySigners } from '../lib/passkey-signers';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

export const configuredAIDomain = env('AI_DOMAIN') ?? 'https://api.hive.blog';
export const configuredSiteDomain = env('SITE_DOMAIN') ?? 'https://hive.blog/';
export const configuredImagesEndpoint = (env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog').replace(/\/+$/, '');
export const configuredApiEndpoint = (env('API_ENDPOINT') ?? 'https://api.hive.blog').replace(/\/+$/, '');
export const configuredRestApiEndpoint = env('REST_API_ENDPOINT')?.replace(/\/+$/, '') || undefined;
export const configuredBlogDomain = env('BLOG_DOMAIN') ?? 'https://hive.blog/';
export const configuredSessionTime = env('APP_SESSION_TIME') ?? configuredSiteDomain.includes('wallet') ? 900 : 64800;
/**
 * API nodes the browser fails over across; the default mirrors the CSP's own. The CSP `connect-src`
 * allows them plus the node picker's nodes (`PICKER_API_NODES`), which are not failover targets.
 */
export const configuredAllowedApiNodes =
  env('ALLOWED_HIVE_API_NODES') ?? 'https://api.hive.blog https://api.syncad.com https://api.openhive.network';
/**
 * Passkey signer sites (origins) a lite account can be secured with, in order. One configured: it
 * is used without asking; several: the guest picks one when securing the account.
 */
export const configuredPasskeySigners = parsePasskeySigners(env('PASSKEY_SIGNERS'));
