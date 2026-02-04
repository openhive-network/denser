'use client';
import { type getSigner } from '@smart-signer/lib/signer/get-signer';
import { useSignerClient } from '@smart-signer/lib/use-signer-client';
import { transactionService } from '@transaction/index';
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

type SignerContextType = {
  signer: ReturnType<typeof getSigner>;
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
  const [signer, setSigner] = useState<ReturnType<typeof getSigner> | null>(null);
  const { signerOptions } = useSignerClient();
  useEffect(() => {
    logger.info('Starting SignerProviderClient.useEffect() to setup Signer');
    (async () => {
      const _getSigner = (await import('@smart-signer/lib/signer/get-signer')).getSigner;
      if (signerOptions.username !== '') {
        setSigner(_getSigner(signerOptions));
        transactionService.setSignerOptions(signerOptions);
      }
    })().catch(logger.error);
  }, [signerOptions.username, signerOptions.loginType, signerOptions.keyType]);

  // TODO: Wait for signer to be initialized
  return <SignerContext.Provider value={{ signer: signer! }}>{children}</SignerContext.Provider>;
};
