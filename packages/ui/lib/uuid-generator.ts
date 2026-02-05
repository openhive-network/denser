import { getLogger } from './logging';

const logger = getLogger('uuid-generator');

/**
 * Generate a UUID v4 compatible with all server environments
 * (Node.js, Edge Runtime, etc.)
 */
export function generateUUID(): string {
  // Try native crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: RFC4122 version 4 UUID implementation
  // Uses crypto.getRandomValues if available, otherwise Math.random
  const getRandomValues = (arr: Uint8Array): Uint8Array => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(arr);
    }
    // Fallback to Math.random (less secure but works everywhere)
    // Log a warning as this should be rare and is less secure
    logger.warn(
      'crypto.getRandomValues unavailable, using Math.random() for UUID generation. ' +
        'This is less secure and should not happen in modern browsers.'
    );
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert to UUID string format
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
