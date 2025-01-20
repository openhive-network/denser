import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Get chat auth token from API endpoint.
 *
 * @returns {Promise<User>}
 */
async function getChatAuthToken(): Promise<User> {
  const url = '/api/auth/chat-token';
  return await fetchJson(url, {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ],
    body: JSON.stringify({})
  });
}

export function useGetChatAuthToken() {
  const queryClient = useQueryClient();
  const getChatAuthTokenMutation = useMutation({
    mutationFn: async () => {
      const user = await getChatAuthToken();
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
  return getChatAuthTokenMutation;
}
