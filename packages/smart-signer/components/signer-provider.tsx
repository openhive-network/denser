import { type getSigner } from '@smart-signer/lib/signer/get-signer';
import { useSigner } from '@smart-signer/lib/use-signer';
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
      if (signerOptions.username === '') return;
      // Signers and the transaction service pull in wax: load them only for a logged-in user.
      const [{ getSigner: _getSigner }, { transactionService }] = await Promise.all([
        import('@smart-signer/lib/signer/get-signer'),
        import('@transaction/index')
      ]);
      setSigner(_getSigner(signerOptions));
      transactionService.setSignerOptions(signerOptions);
    })().catch(logger.error);
  }, [signerOptions.username, signerOptions.loginType, signerOptions.keyType]);

  // TODO: Wait for signer to be initialized
  return <SignerContext.Provider value={{ signer: signer! }}>{children}</SignerContext.Provider>;
};
