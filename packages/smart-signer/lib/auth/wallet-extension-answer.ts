/**
 * How long a sign-in waits for a wallet extension to answer its signing request. An extension whose
 * background was asleep or reloaded may never receive the request, and then never answers it.
 */
export const WALLET_EXTENSION_ANSWER_TIMEOUT_MS = 90 * 1000;

/** A wallet extension did not answer a signing request within `WALLET_EXTENSION_ANSWER_TIMEOUT_MS` */
export class WalletExtensionTimeoutError extends Error {
  name = 'WalletExtensionTimeoutError';

  constructor() {
    super(`The wallet extension did not answer within ${WALLET_EXTENSION_ANSWER_TIMEOUT_MS} ms`);
  }
}

/**
 * Settles as `request` does, or rejects with `WalletExtensionTimeoutError` if it is still pending
 * after `WALLET_EXTENSION_ANSWER_TIMEOUT_MS`. The request itself is not withdrawn from the extension:
 * a late answer is dropped.
 */
export async function awaitWalletExtensionAnswer<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new WalletExtensionTimeoutError()), WALLET_EXTENSION_ANSWER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
