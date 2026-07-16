import env from '@beam-australia/react-env';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

export const configuredAIDomain = env('AI_DOMAIN') ?? 'https://api.hive.blog';
export const configuredSiteDomain = env('SITE_DOMAIN') ?? 'https://hive.blog/';
export const configuredImagesEndpoint = (env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog').replace(/\/+$/, '');
// REACT_APP_API_ENDPOINT accepts a comma-separated list: the first entry is the primary
// node, the rest are failover nodes tried in order when the primary keeps returning
// transport errors (5xx / timeouts) - see hive/denser#761.
const configuredApiEndpoints = (env('API_ENDPOINT') ?? 'https://api.hive.blog,https://api.openhive.network')
  .split(',')
  .map((endpoint) => endpoint.trim().replace(/\/+$/, ''))
  .filter(Boolean);
export const configuredApiEndpoint = configuredApiEndpoints[0];
export const configuredApiEndpointFallbacks = configuredApiEndpoints.slice(1);
export const configuredRestApiEndpoint = env('REST_API_ENDPOINT')?.replace(/\/+$/, '') || undefined;
export const configuredBlogDomain = env('BLOG_DOMAIN') ?? 'https://hive.blog/';
export const configuredSessionTime = env('APP_SESSION_TIME') ?? configuredSiteDomain.includes('wallet') ? 900 : 64800;
