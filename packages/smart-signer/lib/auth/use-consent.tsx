import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';
import { postConsentSchema, PostConsentSchema } from '@smart-signer/lib/auth/utils';

const logger = getLogger('app');

/**
 * Get chat auth token from API endpoint.
 *
 * @returns {Promise<User>}
 */
async function registerConsent(data: PostConsentSchema): Promise<User> {
  const url = '/api/auth/consent';
  return await fetchJson(url, {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify(data)
  });
}

export function useConsent() {
  const queryClient = useQueryClient();
  const registerConsentMutation = useMutation({
    mutationFn: async (params: { data: PostConsentSchema; }) => {
      const { data } = params;
      const user = await registerConsent(data);
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
  return registerConsentMutation;
}
