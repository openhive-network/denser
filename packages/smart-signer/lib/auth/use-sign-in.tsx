import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User, KeyType } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { authorityChecker, AuthorityLevel } from '@smart-signer/lib/authority-checker';
import {
  createHiveChain,
  IHiveChainInterface,
  transaction,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  TWaxExtended,
  ApiKeyAuth,
  operation,
  vote,
  transfer,
  ApiOperation,
  TTransactionPackType
} from '@hive/wax';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Authenticate user on client side only.
 *
 * @param {PostLoginSchema} data
 * @param {string} [uid='']
 * @returns {Promise<User>}
 */
async function signInFrontend(data: PostLoginSchema, uid: string = ''): Promise<User> {
  const { username, keyType, pack, strict, loginType } = data;
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
    };

    return user;

  } catch (error) {
    logger.error('error in signInFrontend', error);
    throw error;
  }
}

/**
 * Authenticate user via request to backend.
 *
 * @param {PostLoginSchema} data
 * @param {string} [uid='']
 * @returns {Promise<User>}
 */
async function signInBackend(data: PostLoginSchema, uid: string = ''): Promise<User> {
  const url = uid ? `/api/auth/login/${uid}` : '/api/auth/login';
  return await fetchJson(url, {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify(data)
  });
}

async function signIn(data: PostLoginSchema, uid: string = ''): Promise<User> {
  const { authenticateOnBackend } = data;
  if (authenticateOnBackend) {
    return signInBackend(data, uid);
  } else {
    return signInFrontend(data, uid);
  }
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const signInMutation = useMutation({
    mutationFn: (params: { data: PostLoginSchema; uid: string }) => {
      const { data, uid } = params;
      return signIn(data, uid);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY.user], data);
    },
    onError: (error) => {
      throw error;
    }
  });
  return signInMutation;
}
