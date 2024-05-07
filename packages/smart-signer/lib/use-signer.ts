import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';
import { useLocalStorage } from 'usehooks-ts';
import { siteConfig } from '@ui/config/site';

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType } = user;
  const [apiEndpoint] = useLocalStorage<string>(
    'hive-blog-endpoint',
    siteConfig.endpoint
    );
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType: KeyType.posting,
    apiEndpoint,
    storageType: 'localStorage',
    chainId: siteConfig.chainId,
  };
  return { signerOptions };
};
