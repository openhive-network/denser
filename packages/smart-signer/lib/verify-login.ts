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
 * @returns {Promise<User>}
 */
export async function verifyLogin(data: PostLoginSchema): Promise<User> {
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
      const result = await authorityChecker(
        JSON.parse(data.txJSON) as ApiTransaction,
        username,
        authorityLevel,
        pack,
        true // always check "strictness"
      );

      logger.info('result: %o', result);

      const user: User = {
        isLoggedIn: strict ? !!result.strict : result.nonStrict,
        username,
        avatarUrl: '',
        loginType,
        keyType,
        authenticateOnBackend: false,
        chatAuthToken: '',
        oauthConsent: {},
        strict: !!result.strict,
      };
      return user;

    } catch (error) {
      logger.error('error in verifyLogin', error);
      throw error;
    }
  }

