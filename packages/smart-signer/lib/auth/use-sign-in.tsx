import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { verifyLogin } from '@smart-signer/lib/verify-login';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Authenticate user via request to backend.
 *
 * @param {PostLoginSchema} data
 * @param {string} [uid='']
 * @returns {Promise<User>}
 */
async function signInBackend(data: PostLoginSchema, uid: string = ''): Promise<User> {
  const url = uid ? `/interaction/${uid}/login` : '/api/auth/login';
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
    return verifyLogin(data, uid);
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

      // FIXME Delete this, when you're done.
      // Login as other user. Only for developers.
      // queryClient.setQueryData([QUERY_KEY.user], { ...data, ...{ username: 'gtg' } });
    },
    onError: (error) => {
      throw error;
    }
  });
  return signInMutation;
}
