import env from '@beam-australia/react-env';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

const envOrDefault = (key: string, fallback: string): string => {
  const value = env(key);
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

export const configuredAIDomain = envOrDefault('AI_DOMAIN', 'https://api.syncad.com');
export const configuredSiteDomain = envOrDefault('SITE_DOMAIN', 'https://hive.blog/');
export const configuredImagesEndpoint = ensureTrailingSlash(
  envOrDefault('IMAGES_ENDPOINT', 'https://images.hive.blog/')
);
export const configuredApiEndpoint = envOrDefault('API_ENDPOINT', 'https://api.hive.blog');
export const configuredBlogDomain = envOrDefault('BLOG_DOMAIN', 'https://hive.blog/');
export const configuredSessionTime = env('APP_SESSION_TIME') ?? configuredSiteDomain.includes('wallet') ? 900 : 64800;
