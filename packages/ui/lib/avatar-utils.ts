import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

/**
 * Avatar URL helpers.
 *
 * Avatars are served directly from the configured image hoster (imagehoster).
 * These helpers only build the URL — the browser fetches the image straight
 * from imagehoster, which handles resizing and caching. Denser does no
 * server-side image fetching, proxying, or caching.
 *
 * Avatar endpoint: {imagesEndpoint}/u/{username}/avatar/{size}
 *   size ∈ { small, medium, large }
 */

// Default avatar served by imagehoster when a user has no profile image.
const DEFAULT_AVATAR_HASH = 'DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4';

/**
 * Get a user avatar URL served directly from the image hoster.
 * @param username - The Hive username
 * @param size - The avatar size ('small', 'medium', 'large')
 * @returns Direct image hoster avatar URL
 */
export function getUserAvatarUrl(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  return `${configuredImagesEndpoint}/u/${encodeURIComponent(username)}/avatar/${size}`;
}

/**
 * Get a user avatar URL without a named size, served directly from the image
 * hoster. The image hoster's avatar endpoint does not take pixel dimensions;
 * callers needing a specific size should request a named size or use
 * proxifyImageSrc. Kept for API compatibility.
 * @param username - The Hive username
 * @returns Direct image hoster avatar URL
 */
export function getUserAvatarUrlWithDimensions(username: string, _width: number, _height: number): string {
  return `${configuredImagesEndpoint}/u/${encodeURIComponent(username)}/avatar`;
}

/**
 * Get the default fallback avatar URL served directly from the image hoster.
 * @returns Direct image hoster default avatar URL
 */
export function getDefaultImageUrl(): string {
  return `${configuredImagesEndpoint}/${DEFAULT_AVATAR_HASH}`;
}
