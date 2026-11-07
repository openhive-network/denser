let signerWarmup: (() => void) | undefined;

/**
 * Sets what `warmSigner` starts: the loads the current session's signer would otherwise make on its
 * first signature, or nothing (`undefined`) for a signer that makes none.
 */
export const setSignerWarmup = (warmup: (() => void) | undefined): void => {
  signerWarmup = warmup;
};

/** Called when an action that is likely to sign begins, so the signer's loads overlap the action's. */
export const warmSigner = (): void => signerWarmup?.();
