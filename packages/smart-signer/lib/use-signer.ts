import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';

import { siteConfig } from '@ui/config/site';
let apiEndpoint = siteConfig.endpoint;
if (typeof window !== 'undefined') {
  let hiveBlogEndpoint = window.localStorage.getItem('hive-blog-endpoint');
  apiEndpoint = hiveBlogEndpoint ? hiveBlogEndpoint : siteConfig.endpoint;
}

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType } = user;
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType: KeyType.posting,
    apiEndpoint,
    storageType: 'localStorage',
  };
  return { signerOptions };
};
