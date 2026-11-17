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
