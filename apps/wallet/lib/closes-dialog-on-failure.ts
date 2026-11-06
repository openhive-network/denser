import { GoogleDriveSignInCancelledError } from '@smart-signer/lib/signer/google-drive-sign-in-cancelled';
import { TransactionNotConfirmedError } from '@transaction/lib/transaction-inclusion';

/**
 * Whether a failed operation should close the dialog that submitted it: OK would only bring the
 * Google Drive dialog back, or send a transaction the node took but no block was seen to include twice.
 */
export function closesDialogOnFailure(error: unknown): boolean {
  return error instanceof GoogleDriveSignInCancelledError || error instanceof TransactionNotConfirmedError;
}
