import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { getImageSrc } from './path-utils';

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

// Authors that are not Hive accounts (lite accounts, `did:lite:<name>`) have no imagehoster
// avatar; asking for one would only cost a failing request.
const DID_PREFIX = 'did:';
const PLACEHOLDER_AVATAR_PATH = '/defaultavatar.png';
// Some callers pass a not-yet-loaded author through untyped data.
const isDid = (username: string): boolean => typeof username === 'string' && username.startsWith(DID_PREFIX);

/**
 * Get a user avatar URL served directly from the image hoster.
 * @param username - The Hive username, or a lite account DID (which gets the local placeholder)
 * @param size - The avatar size ('small', 'medium', 'large')
 * @returns Direct image hoster avatar URL
 */
export function getUserAvatarUrl(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  if (isDid(username)) return getImageSrc(PLACEHOLDER_AVATAR_PATH);
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
  if (isDid(username)) return getImageSrc(PLACEHOLDER_AVATAR_PATH);
  return `${configuredImagesEndpoint}/u/${encodeURIComponent(username)}/avatar`;
}

/**
 * Get the default fallback avatar URL served directly from the image hoster.
 * @returns Direct image hoster default avatar URL
 */
export function getDefaultImageUrl(): string {
  return `${configuredImagesEndpoint}/${DEFAULT_AVATAR_HASH}`;
}
