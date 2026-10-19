import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import type { AccountAuthorities } from '@smart-signer/lib/validators/key-role';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Create a User object from validated login data.
 * Note: Cryptographic signature verification is performed in the login
 * handler (login.ts) before this function is called.
 *
 * @param {PostLoginSchema} data
 * @param account the authorities of the account signing in, when the caller has read them already
 * @returns {Promise<User>}
 */
export async function verifyLogin(data: PostLoginSchema, account?: AccountAuthorities): Promise<User> {
  const { username, keyType, loginType } = data;
  logger.info('verifyLogin argument data: %o', data);

  try {
    // Loaded on sign-in only: it brings wax, which a signed-in user's page must not load
    const { isStrictLogin } = await import('@smart-signer/lib/auth/strict-login');
    // Create User object from login data
    const user: User = {
      isLoggedIn: true,
      username,
      avatarUrl: '',
      loginType,
      keyType,
      authenticateOnBackend: false,
      chatAuthToken: '',
      oauthConsent: {},
      strict: await isStrictLogin(data, account)
    };
    return user;
  } catch (error) {
    logger.error(error, 'Error in verifyLogin');
    throw error;
  }
}
