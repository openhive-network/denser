import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateActiveUser } from '@smart-signer/lib/auth/active-user';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';
import { appApiPath } from '@ui/lib/app-api-path';

const logger = getLogger('app');

/**
 * Get chat auth token from API endpoint.
 *
 * @returns {Promise<User>}
 */
async function getChatAuthToken(): Promise<User> {
  const url = appApiPath('/api/auth/chat-token');
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
      updateActiveUser(queryClient, user);
    },
    onError: (error) => {
      throw error;
    }
  });
  return getChatAuthTokenMutation;
}
