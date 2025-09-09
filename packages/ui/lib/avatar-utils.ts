import { proxifyImageSrc } from './proxify-images';

/**
 * Get a user avatar URL that goes through the image hoster
 * @param username - The Hive username
 * @param size - The avatar size ('small', 'medium', 'large')
 * @returns Proxified avatar URL
 */
export function getUserAvatarUrl(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  const baseUrl = `https://images.hive.blog/u/${username}/avatar/${size}`;
  return proxifyImageSrc(baseUrl);
}

/**
 * Get a user avatar URL with specific dimensions
 * @param username - The Hive username
 * @param width - Image width
 * @param height - Image height
 * @returns Proxified avatar URL with dimensions
 */
export function getUserAvatarUrlWithDimensions(username: string, width: number, height: number): string {
  const baseUrl = `https://images.hive.blog/u/${username}/avatar`;
  return proxifyImageSrc(baseUrl, width, height);
}

/**
 * Get the default fallback image URL that goes through the image hoster
 * @returns Proxified default image URL
 */
export function getDefaultImageUrl(): string {
  const defaultUrl = 'https://images.hive.blog/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4';
  return proxifyImageSrc(defaultUrl);
}
