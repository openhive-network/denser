/**
 * Cryptographic utilities for WebAuthn biometric authentication.
 *
 * Uses Web Crypto API for AES-GCM encryption of WIF keys.
 * The encryption key is derived from WebAuthn PRF extension output.
 */

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('webauthn-crypto');

/** AES-GCM key length in bits */
const AES_KEY_LENGTH = 256;

/** AES-GCM IV length in bytes */
const AES_IV_LENGTH = 12;

/** Salt length in bytes for key derivation */
const SALT_LENGTH = 16;

/**
 * Generates a cryptographically secure random salt.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generates a cryptographically secure random IV for AES-GCM.
 */
export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
}

/**
 * Derives an AES-GCM encryption key from WebAuthn PRF output.
 *
 * Uses HKDF to expand the PRF output with a salt to produce
 * a key suitable for AES-GCM encryption.
 *
 * @param prfOutput - Raw PRF output from WebAuthn authenticator
 * @param salt - Random salt for key derivation
 * @returns CryptoKey suitable for AES-GCM encryption/decryption
 */
export async function deriveKeyFromPrfOutput(
  prfOutput: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import PRF output as raw key material for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using HKDF
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: salt,
      info: new TextEncoder().encode('biometric-wif-encryption'),
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts a WIF key using AES-GCM.
 *
 * @param wif - The WIF key to encrypt
 * @param key - AES-GCM key derived from PRF output
 * @returns Object containing ciphertext and IV
 */
export async function encryptWif(
  wif: string,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = generateIv();
  const encodedWif = new TextEncoder().encode(wif);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedWif
  );

  logger.info('WIF encrypted successfully');

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv
  };
}

/**
 * Decrypts a WIF key using AES-GCM.
 *
 * @param ciphertext - Encrypted WIF data
 * @param iv - Initialization vector used during encryption
 * @param key - AES-GCM key derived from PRF output
 * @returns Decrypted WIF string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decryptWif(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<string> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const wif = new TextDecoder().decode(decrypted);
    logger.info('WIF decrypted successfully');

    return wif;
  } catch (error) {
    logger.error('WIF decryption failed: %o', error);
    throw new Error('Failed to decrypt WIF - biometric credential may be invalid');
  }
}

/**
 * Generates the PRF input salt used during WebAuthn operations.
 * This is a fixed value that identifies our application's PRF usage.
 *
 * @returns Uint8Array to use as PRF eval.first input
 */
export function getPrfInputSalt(): Uint8Array {
  // Use a fixed, application-specific salt for PRF input
  // This ensures the same credential always produces the same PRF output
  return new TextEncoder().encode('denser-biometric-wallet-v1');
}

/**
 * Converts an ArrayBuffer to a base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a base64 string.
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return arrayBufferToBase64(array.buffer);
}
