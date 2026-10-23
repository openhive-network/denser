/**
 * The user closed a dialog saying the Google Drive wallet lacks what the sign-in needs. The message
 * says "user cancelled" so that it is not reported as a failure. Trying the same operation again
 * shows the same dialog, so a caller ends the whole flow rather than offering a retry.
 */
export class GoogleDriveSignInCancelledError extends Error {
  name = 'GoogleDriveSignInCancelledError';

  constructor(reason: string) {
    super(`User cancelled Google Drive sign-in: ${reason}`);
  }
}
