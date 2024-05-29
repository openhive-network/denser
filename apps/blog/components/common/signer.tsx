import { type getSigner } from '@smart-signer/lib/signer/get-signer';
import { useSigner } from '@smart-signer/lib/use-signer';
import { transactionService } from '@transaction/index';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
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

export const SignerProvider = ({ children }: { children: ReactNode }) => {
  const [signer, setSigner] = useState<ReturnType<typeof getSigner> | null>(null);
  const { signerOptions } = useSigner();
  useEffect(() => {
    logger.info('Starting SignerProvider.useEffect() to setup Signer');
    (async () => {
      const _getSigner = (await import('@smart-signer/lib/signer/get-signer')).getSigner;
      if (signerOptions.username !== '') {
        setSigner(_getSigner(signerOptions));
        transactionService.setSignerOptions(signerOptions);
      }
    })().catch(logger.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signerOptions.username]);

  // TODO: Wait for signer to be initialized
  return <SignerContext.Provider value={{ signer: signer! }}>{children}</SignerContext.Provider>;
};
