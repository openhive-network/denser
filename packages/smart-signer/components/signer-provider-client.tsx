'use client';
import { useSignerClient } from '@smart-signer/lib/use-signer-client';
import { useLazySigner, type LoadSigner } from '@smart-signer/lib/use-lazy-signer';
import { createContext, useContext, ReactNode } from 'react';

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

  return <SignerContext.Provider value={{ loadSigner }}>{children}</SignerContext.Provider>;
};
