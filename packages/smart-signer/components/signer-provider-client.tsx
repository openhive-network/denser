'use client';
import { useSignerClient } from '@smart-signer/lib/use-signer-client';
import { useLazySigner, type LoadSigner } from '@smart-signer/lib/use-lazy-signer';
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { clearStoredDriveKeys } from '@smart-signer/lib/auth/destroy-signer';

type SignerContextType = {
  loadSigner: LoadSigner;
};

export const SignerContext = createContext<SignerContextType | undefined>(undefined);

export const useSignerContext = () => {
  const context = useContext(SignerContext);
  if (!context) {
    throw new Error('useSignerContext must be used within a SignerProvider');
  }
  return context;
};

/**
 * SignerProvider for App Router (uses useSignerClient).
 * Use SignerProvider for Pages Router components.
 */
export const SignerProviderClient = ({ children }: { children: ReactNode }) => {
  const { signerOptions } = useSignerClient();
  const loadSigner = useLazySigner(signerOptions);
  // Stored by earlier versions; the Drive wallet's encryption key now lives in memory only
  useEffect(clearStoredDriveKeys, []);

  return <SignerContext.Provider value={{ loadSigner }}>{children}</SignerContext.Provider>;
};
