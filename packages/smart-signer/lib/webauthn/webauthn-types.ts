/**
 * WebAuthn types for biometric authentication in Google Drive wallet.
 *
 * Uses WebAuthn PRF extension to derive encryption keys from biometric
 * credentials, which are then used to encrypt/decrypt the wallet WIF.
 */

/**
 * Stored credential data in IndexedDB.
 * The WIF is encrypted with a key derived from WebAuthn PRF output.
 */
export interface BiometricCredential {
  /** WebAuthn credential ID (base64 encoded) */
  credentialId: string;
  /** Hive username this credential belongs to */
  username: string;
  /** WIF encrypted with AES-GCM using PRF-derived key */
  encryptedWif: Uint8Array;
  /** Salt used for key derivation from PRF output */
  salt: Uint8Array;
  /** Initialization vector for AES-GCM */
  iv: Uint8Array;
  /** Timestamp when credential was created */
  createdAt: number;
  /** Timestamp when credential was last used */
  lastUsedAt: number;
}

/**
 * Device capability for biometric authentication.
 */
export interface WebAuthnCapability {
  /** Whether WebAuthn is available in this browser */
  available: boolean;
  /** Whether platform authenticator (fingerprint, Face ID) is available */
  platformAuthenticator: boolean;
  /** Whether PRF extension is supported (required for secure WIF encryption) */
  prfSupported: boolean;
  /** Human-readable reason if biometrics unavailable */
  reason?: string;
}

/**
 * Result of biometric credential enrollment.
 */
export type BiometricEnrollmentResult =
  | { success: true; credentialId: string }
  | { success: false; error: string; cancelled?: boolean };

/**
 * Result of biometric authentication attempt.
 */
export type BiometricAuthResult =
  | { success: true; wif: string }
  | { success: false; error: string; cancelled?: boolean; credentialNotFound?: boolean };

/**
 * Options for creating a WebAuthn credential.
 */
export interface CreateCredentialOptions {
  username: string;
  wif: string;
  /** Display name shown in browser's credential picker */
  displayName?: string;
}

/**
 * Options for authenticating with a WebAuthn credential.
 */
export interface AuthenticateOptions {
  username: string;
  /** Credential ID to use (if known) */
  credentialId?: string;
}

/**
 * PRF extension input for WebAuthn operations.
 * Used to derive a deterministic key from the authenticator.
 */
export interface PrfExtensionInput {
  eval: {
    first: BufferSource;
    second?: BufferSource;
  };
}

/**
 * PRF extension output from WebAuthn operations.
 */
export interface PrfExtensionOutput {
  enabled?: boolean;
  results?: {
    first: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

/**
 * Extended AuthenticationExtensionsClientOutputs with PRF.
 */
export interface AuthExtensionsWithPrf extends AuthenticationExtensionsClientOutputs {
  prf?: PrfExtensionOutput;
}

/**
 * Extended PublicKeyCredential with PRF extension output.
 */
export interface PublicKeyCredentialWithPrf extends PublicKeyCredential {
  getClientExtensionResults(): AuthExtensionsWithPrf;
}
