import { useEffect, useMemo } from 'react';
import type { SignerTool } from '@smart-signer/lib/signer/get-signer';
import type { SignerOptions } from '@smart-signer/lib/signer/signer';
import { setSignerOptions } from '@transaction/lib/signer-options';

/** Resolves to the signer of the logged-in user, loading the signers (and wax) on the first call. */
export type LoadSigner = () => Promise<SignerTool>;

/**
 * Keeps the transaction service's signer options current and returns a `LoadSigner` for them.
 * Being logged in loads nothing: the signer modules, which pull in wax, beekeeper and hb-auth,
 * are imported on the first `LoadSigner` call, when the user signs something.
 */
export const useLazySigner = ({ username, loginType, keyType, storageType }: SignerOptions): LoadSigner => {
  useEffect(() => {
    if (username === '') return;
    setSignerOptions({ username, loginType, keyType, storageType });
  }, [username, loginType, keyType, storageType]);

  return useMemo(() => {
    let signer: Promise<SignerTool> | undefined;
    return () => {
      signer ??= import('@smart-signer/lib/signer/get-signer')
        .then(({ getSigner }) => getSigner({ username, loginType, keyType, storageType }))
        .catch((error: unknown) => {
          signer = undefined; // let the next action retry the load
          throw error;
        });
      return signer;
    };
  }, [username, loginType, keyType, storageType]);
};
