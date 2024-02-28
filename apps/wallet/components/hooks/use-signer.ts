import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyType } from '@smart-signer/types/common';

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType } = user;
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType: KeyType.posting,
    apiEndpoint: 'https://api.hive.blog',
    storageType: 'localStorage',
  };
  return { signerOptions };
};
