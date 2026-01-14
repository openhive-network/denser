import env from '@beam-australia/react-env';

// Size mappings for CDN avatar URLs
const CDN_SIZE_MAP: Record<'small' | 'medium' | 'large', string> = {
  small: 'u',      // small avatar
  medium: 'u',     // medium avatar
  large: 'u'       // large avatar (same endpoint, sizing handled by CSS)
};

/**
 * Gets the images endpoint from environment or uses default
 * @returns The images endpoint URL without trailing slash
 */
function getImagesEndpoint(): string {
  const endpoint = env('IMAGES_ENDPOINT') ?? 'https://images.hive.blog/';
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

/**
 * Gets the base path for API routes
 * @returns The base path or empty string
 */
function getBasePath(): string {
  if (typeof window !== 'undefined') {
    return env('BASE_PATH') || '';
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  return '';
}

/**
 * Builds the internal API endpoint URL for avatars
 * @param path - The API path
 * @returns Full API URL with base path if needed
 */
function getApiUrl(path: string): string {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

/**
 * Get a user avatar URL directly from CDN (images.hive.blog)
 * Use this for Next.js Image component to leverage CDN caching and optimization
 * @param username - The Hive username
 * @param size - The avatar size ('small', 'medium', 'large')
 * @returns Direct CDN URL for avatar
 */
export function getUserAvatarUrlCDN(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  const imagesEndpoint = getImagesEndpoint();
  const sizePrefix = CDN_SIZE_MAP[size];
  return `${imagesEndpoint}/${sizePrefix}/${username}`;
}

/**
 * Get a user avatar URL using internal API endpoint (prevents caching)
 * Use this when you need to bypass CDN caching (e.g., after profile update)
 * @param username - The Hive username
 * @param size - The avatar size ('small', 'medium', 'large')
 * @returns Internal API URL for avatar
 */
export function getUserAvatarUrl(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  return getApiUrl(`/api/avatar?username=${encodeURIComponent(username)}&size=${size}`);
}

/**
 * Get a user avatar URL with specific dimensions using internal API endpoint (prevents caching)
 * @param username - The Hive username
 * @param width - Image width
 * @param height - Image height
 * @returns Internal API URL for avatar with dimensions
 */
export function getUserAvatarUrlWithDimensions(username: string, width: number, height: number): string {
  return getApiUrl(`/api/avatar?username=${encodeURIComponent(username)}&width=${width}&height=${height}`);
}

/**
 * Get the default fallback image URL using internal API endpoint (prevents caching)
 * @returns Internal API URL for default avatar
 */
export function getDefaultImageUrl(): string {
  return getApiUrl('/api/avatar/default');
}
