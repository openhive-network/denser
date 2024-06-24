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
 * @returns {Promise<User>}
 */
async function signInBackend(data: PostLoginSchema): Promise<User> {
  const url = '/api/auth/login';
  return await fetchJson(url, {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify(data)
  });
}

async function signIn(data: PostLoginSchema): Promise<User> {
  const { authenticateOnBackend } = data;
  if (authenticateOnBackend) {
    return signInBackend(data);
  } else {
    return verifyLogin(data);
  }
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const signInMutation = useMutation({
    mutationFn: async (params: { data: PostLoginSchema; }) => {
      const { data } = params;
      const user = await signIn(data);
      return ({ user });
    },
    onSuccess: (data) => {
      const { user } = data;
      queryClient.setQueryData([QUERY_KEY.user], user);
    },
    onError: (error) => {
      throw error;
    }
  });
  return signInMutation;
}
