// No runtime import of hb-auth or the signing package: the lite actions' failure toasts use it.

/**
 * The unlock step of a Safe Storage identity did not unlock it: the guest cancelled it, or hb-auth
 * refused (the message is hb-auth's, through smart-signer's auth-error, and `messageKey` its
 * smart-signer translation key when the refusal is a well-known one). The action was not sent.
 */
export class LiteWalletUnlockError extends Error {
  readonly cancelled: boolean;
  readonly messageKey?: string;

  constructor(message: string, cancelled: boolean, options?: ErrorOptions & { messageKey?: string }) {
    super(message, options);
    this.name = 'LiteWalletUnlockError';
    this.cancelled = cancelled;
    this.messageKey = options?.messageKey;
  }
}

/**
 * What a failed lite action's toast says when the unlock step failed it: undefined for any other
 * failure, null when the guest cancelled (nothing to say), else the refusal's text, given by
 * `translateSignerKey` for a well-known one and hb-auth's own message for an unknown one.
 */
export function liteWalletFailureMessage(
  error: unknown,
  translateSignerKey: (key: string) => string
): string | null | undefined {
  if (!(error instanceof LiteWalletUnlockError)) return undefined;
  if (error.cancelled) return null;
  return error.messageKey ? translateSignerKey(error.messageKey) : error.message;
}
