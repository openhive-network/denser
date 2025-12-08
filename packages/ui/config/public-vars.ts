import env from '@beam-australia/react-env';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

export const configuredAIDomain = env('AI_DOMAIN') ?? 'https://api.syncad.com';
export const configuredSiteDomain = env('SITE_DOMAIN') ?? 'https://hive.blog/';
export const configuredImagesEndpoint = env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog/';
export const configuredApiEndpoint = env('API_ENDPOINT') ?? 'https://api.hive.blog';
export const configuredBlogDomain = env('BLOG_DOMAIN') ?? 'https://hive.blog/';
export const configuredSessionTime = env('APP_SESSION_TIME') ?? configuredSiteDomain.includes('wallet') ? 900 : 64800;
