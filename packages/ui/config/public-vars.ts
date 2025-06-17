import env from '@beam-australia/react-env';

/// Contains list of public variables which can have safely set defaults and allow application build without explicit env. definition

export const configuredSiteDomain = env('SITE_DOMAIN') ?? 'https://hive.blog/';
export const configuredImagesEndpoint = env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog/';
export const configuredApiEndpoint = env('API_ENDPOINT') ?? 'https://api.hive.blog/';
export const configuredBlogDomain = env('BLOG_DOMAIN') ?? 'https://hive.blog/';