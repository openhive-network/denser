import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { useLocalStorage } from 'usehooks-ts';
import { siteConfig } from '@ui/config/site';

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType, keyType } = user;
  const [apiEndpoint] = useLocalStorage<string>(
    'node-endpoint',
    siteConfig.endpoint
    );
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType,
    apiEndpoint,
    storageType: 'localStorage',
    chainId: siteConfig.chainId,
  };
  return { signerOptions };
};
