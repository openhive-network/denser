import { WaxExternalSignatureProviderError } from '@hiveio/wax-signers-external';
import { isUserCancelled } from '@ui/lib/user-cancelled';

const DECRYPTION_FAILED_CODE = 'DECRYPTION_FAILED';

/** The smart-signer translation key the password prompt shows for a password that does not open the wallet */
export const WRONG_WALLET_PASSWORD_KEY = 'google_drive_error.wrong_password';

/** Whether `error` is wax's report that the wallet file did not decrypt: a wrong password or encryption key */
export function isWalletDecryptionFailure(error: unknown): boolean {
  return error instanceof WaxExternalSignatureProviderError && error.code === DECRYPTION_FAILED_CODE;
}

/**
 * Whether a failed Google Drive wallet load calls for signing in to Google again: not when the user
 * cancelled, nor when the wallet file itself answered (it did not decrypt, or lacks the key), since
 * a new Google sign-in reads the same file.
 */
export function needsGoogleSignInAgain(error: unknown): boolean {
  return !isUserCancelled(error) && !(error instanceof WaxExternalSignatureProviderError);
}

/**
 * Runs `attempt`, and once more after `signInAgain` dropped the Google session when it failed for
 * that session (`needsGoogleSignInAgain`). Any other failure, or a second one, rejects.
 */
export async function retryAfterGoogleSignIn<T>(attempt: () => Promise<T>, signInAgain: (error: unknown) => void): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (!needsGoogleSignInAgain(error)) throw error;
    signInAgain(error);
    return attempt();
  }
}

/** The access token callback given to wax, remembering whether its last call failed */
export interface TrackedAccessToken {
  getToken: () => Promise<string>;
  /** Throws the error the last `getToken` call failed with, if it failed */
  throwIfFailed: () => void;
}

/**
 * Wraps `getToken` for a wallet load. Wax reports the wallet file missing whenever its existence
 * check fails, a failed access token included, so a load told so calls `throwIfFailed` before
 * telling the user there is no wallet.
 */
export function trackAccessToken(getToken: () => Promise<string>): TrackedAccessToken {
  let failure: { error: unknown } | undefined;
  return {
    getToken: async () => {
      try {
        const token = await getToken();
        failure = undefined;
        return token;
      } catch (error) {
        failure = { error };
        throw error;
      }
    },
    throwIfFailed: () => {
      if (failure) throw failure.error;
    }
  };
}
