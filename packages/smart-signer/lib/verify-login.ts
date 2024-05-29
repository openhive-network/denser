import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User, KeyType } from '@smart-signer/types/common';
import { authorityChecker, AuthorityLevel } from '@smart-signer/lib/authority-checker';
import { ApiTransaction } from '@hiveio/wax';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Authenticate user by checking signature in fake transaction.
 *
 * @param {PostLoginSchema} data
 * @param {string} [uid='']
 * @returns {Promise<User>}
 */
export async function verifyLogin(data: PostLoginSchema, uid: string = ''): Promise<User> {
    const { username, keyType, pack, strict, loginType } = data;
    logger.info('verifyLogin argument data: %o', data);
    let authorityLevel: AuthorityLevel;
    if (keyType === KeyType.posting) {
      authorityLevel = AuthorityLevel.POSTING;
    } else if (keyType === KeyType.active) {
      authorityLevel = AuthorityLevel.ACTIVE;
    } else {
      throw new Error('Unsupported keyType');
    }

    try {
      const isAuthenticated = await authorityChecker(
        JSON.parse(data.txJSON) as ApiTransaction,
        username,
        authorityLevel,
        pack,
        strict
      );

      const mode = strict ? 'strict' : 'non-strict';
      if (isAuthenticated) {
        logger.info(
          'User %s passed authentication in %s mode with key type %s',
          username, mode, keyType
          );
      } else {
        logger.info(
          'User %s failed authentication in %s mode with key type %s',
          username, mode, keyType
          );
      }

      const user: User = {
        isLoggedIn: isAuthenticated,
        username,
        avatarUrl: '',
        loginType,
        keyType,
        authenticateOnBackend: false,
      };
      return user;

    } catch (error) {
      logger.error('error in verifyLogin', error);
      throw error;
    }
  }

