import { useUser } from '@smart-signer/lib/auth/use-user';
import { SignerOptions } from '@smart-signer/lib/signer/signer';

export const useSigner = () => {
  const { user } = useUser();
  const { username, loginType, keyType } = user;
  const signerOptions: SignerOptions = {
    username,
    loginType,
    keyType,
    storageType: 'localStorage',
  };
  return { signerOptions };
};
