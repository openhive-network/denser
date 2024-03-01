import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyTypes } from '@smart-signer/types/common';

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType } = user;
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType: KeyTypes.posting,
    apiEndpoint: 'https://api.hive.blog',
    storageType: 'localStorage',
  };
  return { signerOptions };
};
