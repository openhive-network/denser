/**
 * WebAuthn service for biometric authentication.
 *
 * Provides functionality to:
 * - Check device biometric capability
 * - Create biometric credentials (enrollment)
 * - Authenticate with biometrics and decrypt WIF
 * - Invalidate stored credentials
 */

import { getLogger } from '@hive/ui/lib/logging';
import type {
  WebAuthnCapability,
  BiometricEnrollmentResult,
  BiometricAuthResult,
  CreateCredentialOptions,
  AuthenticateOptions,
  PublicKeyCredentialWithPrf,
  PrfExtensionInput
} from './webauthn-types';
import {
  generateSalt,
  deriveKeyFromPrfOutput,
  encryptWif,
  decryptWif,
  getPrfInputSalt,
  arrayBufferToBase64,
  base64ToUint8Array
} from './webauthn-crypto';
import {
  saveCredential,
  getCredentialForUser,
  deleteCredentialForUser,
  updateLastUsed,
  isIndexedDBAvailable
} from './webauthn-storage';

const logger = getLogger('webauthn-service');

/** Relying Party ID - uses current origin's hostname */
const getRelyingPartyId = (): string => {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname;
};

/** Relying Party name for display */
const RELYING_PARTY_NAME = 'Denser';

/**
 * Checks if biometric authentication is available on this device.
 *
 * Requirements:
 * - WebAuthn API available
 * - Platform authenticator available (fingerprint, Face ID, Windows Hello)
 * - PRF extension supported (for secure key derivation)
 * - IndexedDB available (for credential storage)
 */
export async function checkBiometricCapability(): Promise<WebAuthnCapability> {
  // Check basic requirements
  if (typeof window === 'undefined') {
    return {
      available: false,
      platformAuthenticator: false,
      prfSupported: false,
      reason: 'Not running in browser'
    };
  }

  if (!window.PublicKeyCredential) {
    return {
      available: false,
      platformAuthenticator: false,
      prfSupported: false,
      reason: 'WebAuthn not supported'
    };
  }

  if (!isIndexedDBAvailable()) {
    return {
      available: false,
      platformAuthenticator: false,
      prfSupported: false,
      reason: 'IndexedDB not available'
    };
  }

  // Check for platform authenticator
  let platformAuthenticator = false;
  try {
    platformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    logger.error('Error checking platform authenticator: %o', error);
  }

  if (!platformAuthenticator) {
    return {
      available: false,
      platformAuthenticator: false,
      prfSupported: false,
      reason: 'No biometric authenticator available'
    };
  }

  // Check for PRF extension support
  // LIMITATION: There's no reliable way to detect PRF support before attempting
  // to create a credential. The WebAuthn spec doesn't provide a pre-check method.
  //
  // We optimistically assume PRF support is available when:
  // 1. A platform authenticator exists (checked above)
  // 2. The browser supports modern WebAuthn features (indicated by isConditionalMediationAvailable)
  // 3. The browser is not Firefox (which doesn't support PRF as of 2025)
  //
  // PRF support in modern browsers:
  // - Chrome 116+ (August 2023)
  // - Safari 17+ (September 2023)
  // - Edge 116+ (August 2023)
  // - Firefox: Not yet supported (as of 2025)
  //
  // Actual PRF support is verified during credential creation in createCredential().
  // If PRF fails there, we return an appropriate error to the user.
  let prfSupported = false;
  try {
    // Detect Firefox which doesn't support PRF extension
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

    if (isFirefox) {
      logger.info('Firefox detected - PRF extension not supported');
      return {
        available: false,
        platformAuthenticator,
        prfSupported: false,
        reason: 'Biometric authentication is not supported in Firefox. Please use Chrome, Edge, or Safari.'
      };
    }

    // Use isConditionalMediationAvailable as a heuristic for modern WebAuthn support
    const hasModernWebAuthn =
      'PublicKeyCredential' in window &&
      typeof (PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> })
        .isConditionalMediationAvailable === 'function';

    // Optimistically assume PRF support if platform authenticator is available
    // and browser has modern WebAuthn features
    prfSupported = hasModernWebAuthn || platformAuthenticator;
  } catch (error) {
    logger.error('Error checking PRF support: %o', error);
  }

  return {
    available: platformAuthenticator && prfSupported,
    platformAuthenticator,
    prfSupported,
    reason: prfSupported ? undefined : 'PRF extension not supported'
  };
}

/**
 * Creates a new biometric credential and encrypts the WIF.
 *
 * This is called after user successfully enters their password for the first time.
 * The WIF is encrypted with a key derived from the WebAuthn PRF output.
 */
export async function createCredential(
  options: CreateCredentialOptions
): Promise<BiometricEnrollmentResult> {
  const { username, wif, displayName } = options;

  try {
    logger.info('Creating biometric credential for user: %s', username);

    // Generate challenge for WebAuthn
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // PRF extension input - used to derive encryption key
    const prfSalt = getPrfInputSalt();
    const prfExtension: PrfExtensionInput = {
      eval: {
        first: prfSalt
      }
    };

    // Create credential options
    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: RELYING_PARTY_NAME,
        id: getRelyingPartyId()
      },
      user: {
        id: new TextEncoder().encode(username),
        name: username,
        displayName: displayName || username
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use platform authenticator (fingerprint, Face ID)
        userVerification: 'required', // Require biometric verification
        residentKey: 'required' // Store credential on device
      },
      timeout: 60000,
      attestation: 'none', // We don't need attestation for this use case
      extensions: {
        prf: prfExtension
      } as AuthenticationExtensionsClientInputs
    };

    // Create credential
    const credential = (await navigator.credentials.create({
      publicKey: createOptions
    })) as PublicKeyCredentialWithPrf | null;

    if (!credential) {
      return { success: false, error: 'Credential creation cancelled', cancelled: true };
    }

    // Get PRF output from extensions
    const extensions = credential.getClientExtensionResults();
    const prfResults = extensions.prf?.results;

    if (!prfResults?.first) {
      logger.error('PRF extension not supported or failed');
      return {
        success: false,
        error: 'Biometric authentication not fully supported on this device'
      };
    }

    // Derive encryption key from PRF output
    const prfOutput = new Uint8Array(prfResults.first);
    const salt = generateSalt();
    const encryptionKey = await deriveKeyFromPrfOutput(prfOutput, salt);

    // Encrypt WIF
    const { ciphertext, iv } = await encryptWif(wif, encryptionKey);

    // Save credential to IndexedDB
    const credentialId = arrayBufferToBase64(credential.rawId);
    await saveCredential({
      credentialId,
      username,
      encryptedWif: ciphertext,
      salt,
      iv,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    });

    logger.info('Biometric credential created successfully for user: %s', username);

    return { success: true, credentialId };
  } catch (error) {
    logger.error('Error creating biometric credential: %o', error);

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric enrollment was cancelled', cancelled: true };
      }
      if (error.name === 'InvalidStateError') {
        return { success: false, error: 'A credential already exists for this device' };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create biometric credential'
    };
  }
}

/**
 * Authenticates with biometrics and decrypts the stored WIF.
 *
 * This is called when user has an existing biometric credential and
 * needs to unlock their wallet.
 */
export async function authenticateAndDecrypt(
  options: AuthenticateOptions
): Promise<BiometricAuthResult> {
  const { username, credentialId } = options;

  try {
    logger.info('Authenticating with biometrics for user: %s', username);

    // Get stored credential
    const storedCredential = await getCredentialForUser(username);

    if (!storedCredential) {
      return {
        success: false,
        error: 'No biometric credential found',
        credentialNotFound: true
      };
    }

    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // PRF extension input - same as during enrollment
    const prfSalt = getPrfInputSalt();
    const prfExtension: PrfExtensionInput = {
      eval: {
        first: prfSalt
      }
    };

    // Prepare allowed credentials
    const allowCredentials: PublicKeyCredentialDescriptor[] = [
      {
        type: 'public-key',
        id: base64ToUint8Array(credentialId || storedCredential.credentialId),
        transports: ['internal'] // Platform authenticator
      }
    ];

    // Get assertion options
    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: getRelyingPartyId(),
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: prfExtension
      } as AuthenticationExtensionsClientInputs
    };

    // Get assertion (authenticate)
    const assertion = (await navigator.credentials.get({
      publicKey: getOptions
    })) as PublicKeyCredentialWithPrf | null;

    if (!assertion) {
      return { success: false, error: 'Biometric authentication cancelled', cancelled: true };
    }

    // Get PRF output from extensions
    const extensions = assertion.getClientExtensionResults();
    const prfResults = extensions.prf?.results;

    if (!prfResults?.first) {
      logger.error('PRF extension failed during authentication');
      return {
        success: false,
        error: 'Failed to retrieve encryption key from biometric authenticator'
      };
    }

    // Derive decryption key from PRF output
    const prfOutput = new Uint8Array(prfResults.first);
    const decryptionKey = await deriveKeyFromPrfOutput(prfOutput, storedCredential.salt);

    // Decrypt WIF
    const wif = await decryptWif(storedCredential.encryptedWif, storedCredential.iv, decryptionKey);

    // Update last used timestamp
    await updateLastUsed(username);

    logger.info('Biometric authentication successful for user: %s', username);

    return { success: true, wif };
  } catch (error) {
    logger.error('Error during biometric authentication: %o', error);

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled', cancelled: true };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometric authentication failed'
    };
  }
}

/**
 * Deletes biometric credentials for a user.
 *
 * Call this when:
 * - User logs out
 * - User switches Google accounts
 * - User wants to disable biometric authentication
 */
export async function invalidateCredentials(username: string): Promise<void> {
  try {
    await deleteCredentialForUser(username);
    logger.info('Invalidated biometric credentials for user: %s', username);
  } catch (error) {
    logger.error('Error invalidating credentials: %o', error);
    throw error;
  }
}

/**
 * Checks if a user has a biometric credential stored.
 */
export async function hasCredential(username: string): Promise<boolean> {
  try {
    const credential = await getCredentialForUser(username);
    return credential !== null;
  } catch (error) {
    logger.error('Error checking credential: %o', error);
    return false;
  }
}
