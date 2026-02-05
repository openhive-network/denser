/**
 * WebAuthn biometric authentication module for Google Drive wallet.
 *
 * @example
 * ```typescript
 * import {
 *   checkBiometricCapability,
 *   createCredential,
 *   authenticateAndDecrypt,
 *   hasCredential
 * } from '@smart-signer/lib/webauthn';
 *
 * // Check if biometrics available
 * const capability = await checkBiometricCapability();
 * if (capability.available) {
 *   // Enroll biometrics after password entry
 *   await createCredential({ username: 'alice', wif: 'the-wif-key' });
 *
 *   // Later, authenticate with biometrics
 *   const result = await authenticateAndDecrypt({ username: 'alice' });
 *   if (result.success) {
 *     console.log('WIF:', result.wif);
 *   }
 * }
 * ```
 */

// Types
export type {
  BiometricCredential,
  WebAuthnCapability,
  BiometricEnrollmentResult,
  BiometricAuthResult,
  CreateCredentialOptions,
  AuthenticateOptions
} from './webauthn-types';

// Service functions
export {
  checkBiometricCapability,
  createCredential,
  authenticateAndDecrypt,
  invalidateCredentials,
  hasCredential
} from './webauthn-service';

// Storage functions (for advanced use cases)
export {
  getCredentialForUser,
  deleteCredentialForUser,
  deleteAllCredentials
} from './webauthn-storage';
