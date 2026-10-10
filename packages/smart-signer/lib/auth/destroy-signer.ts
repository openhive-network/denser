import { User } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/** End the signer session (unlocked keys, tokens) `user` signed in with. Failures are logged. */
export async function destroyAccountSigner(user: User): Promise<void> {
  const { username, loginType, keyType } = user;
  try {
    const { getSigner } = await import('@smart-signer/lib/signer/get-signer');
    const signer = getSigner({ username, loginType, keyType, storageType: 'localStorage' });
    await signer.destroy();
  } catch (error) {
    logger.error(error, 'Failed to destroy signer of %s', username);
  }
}
