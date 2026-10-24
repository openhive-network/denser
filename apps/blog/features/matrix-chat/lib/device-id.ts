import { getStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

const DEVICE_KEY_PREFIX = 'matrix-chat-device-';
const DEVICE_ID_PREFIX = 'DENSER';
const DEVICE_ID_RANDOM_BYTES = 6;

/**
 * The Matrix device this browser signs `userId` in on, the same on every sign-in, so that signing
 * in again replaces the device's access token rather than adding a device. Not a secret.
 */
export function chatDeviceId(userId: string): string {
  const key = `${DEVICE_KEY_PREFIX}${userId}`;
  const known = getStorageItem<unknown>(key);
  if (typeof known === 'string' && known.startsWith(DEVICE_ID_PREFIX)) return known;
  const random = crypto.getRandomValues(new Uint8Array(DEVICE_ID_RANDOM_BYTES));
  const deviceId = DEVICE_ID_PREFIX + Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  setStorageItem(key, deviceId, StorageTTL.PERMANENT);
  return deviceId;
}
