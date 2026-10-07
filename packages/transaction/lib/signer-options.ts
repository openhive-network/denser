import type { SignerOptions } from '@smart-signer/lib/signer/signer';

type SignerOptionsListener = (signerOptions: SignerOptions) => void;

let currentSignerOptions: SignerOptions | undefined;
const listeners = new Set<SignerOptionsListener>();

/**
 * Records whose keys sign transactions. Imports nothing from wax or the signers, so the signer
 * provider can keep it current on every page while `TransactionService` loads only on first write.
 */
export const setSignerOptions = (signerOptions: SignerOptions): void => {
  currentSignerOptions = signerOptions;
  listeners.forEach((listener) => listener(signerOptions));
};

/** Calls `listener` with the current signer options, if any, and with every later change. */
export const subscribeToSignerOptions = (listener: SignerOptionsListener): void => {
  if (currentSignerOptions) listener(currentSignerOptions);
  listeners.add(listener);
};
