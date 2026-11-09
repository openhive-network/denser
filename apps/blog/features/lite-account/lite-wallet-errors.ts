// No runtime import of hb-auth or the signing package: the lite actions' failure toasts use it.

/**
 * The unlock step of a Safe Storage identity did not unlock it: the guest cancelled it, or hb-auth
 * refused (the message is hb-auth's, through smart-signer's auth-error). The action was not sent.
 */
export class LiteWalletUnlockError extends Error {
  readonly cancelled: boolean;

  constructor(message: string, cancelled: boolean, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LiteWalletUnlockError';
    this.cancelled = cancelled;
  }
}

/**
 * What a failed lite action's toast says when the unlock step failed it: undefined for any other
 * failure, null when the guest cancelled (nothing to say), else hb-auth's message.
 */
export function liteWalletFailureMessage(error: unknown): string | null | undefined {
  if (!(error instanceof LiteWalletUnlockError)) return undefined;
  return error.cancelled ? null : error.message;
}
