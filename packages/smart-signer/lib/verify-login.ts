import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Authenticate user by checking signature in fake transaction.
 *
 * @param {PostLoginSchema} data
 * @returns {Promise<User>}
 */
export async function verifyLogin(data: PostLoginSchema): Promise<User> {
  const { username, keyType, strict, loginType } = data;
  logger.info('verifyLogin argument data: %o', data);

  try {
    // this basically saves the user to the local storage
    const user: User = {
      isLoggedIn: true,
      username,
      avatarUrl: '',
      loginType,
      keyType,
      authenticateOnBackend: false,
      chatAuthToken: '',
      oauthConsent: {},
      strict
    };
    return user;
  } catch (error) {
    logger.error('error in verifyLogin', error);
    throw error;
  }
}
