import { WaxExternalSignatureProviderError } from '@hiveio/wax-signers-external';
import type { THiveRoles } from '@hiveio/wax';
import type { GoogleDriveErrorDialogProps } from '@smart-signer/components/google-drive-error-dialog';

const KEY_NOT_FOUND_CODE = 'KEY_NOT_FOUND';
// Wax names the role ("No key found for account role: alice@active") only when the account has other keys
const MISSING_ROLE_PATTERN = /No key found for account role:/;

/**
 * The dialog telling the user which key their Google Drive wallet lacks, or null when `error` is
 * not wax's report of a missing key. Such a wallet was decrypted fine: it is not locked.
 */
export function missingKeyDialogProps(
  error: unknown,
  username: string,
  keyType: keyof THiveRoles
): GoogleDriveErrorDialogProps | null {
  if (!(error instanceof WaxExternalSignatureProviderError) || error.code !== KEY_NOT_FOUND_CODE) return null;
  return MISSING_ROLE_PATTERN.test(error.message)
    ? { errorType: 'key_not_found', username, keyType }
    : { errorType: 'account_not_found', username };
}
