import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { appApiPath } from '@ui/lib/app-api-path';
import { User } from '@smart-signer/types/common';
import * as userLocalStorage from './user-localstore';

async function getUser(): Promise<User> {
  return await fetchJson(appApiPath('/api/users/me'));
}

/** The signed-in user's query, which every user hook reads. */
export const userQueryOptions = {
  queryKey: [QUERY_KEY.user],
  queryFn: getUser,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  // Read once, when the query is created, not by every hook instance
  initialData: (): User => userLocalStorage.getUser()
};
