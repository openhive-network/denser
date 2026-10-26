import type { IAccountNotification, ILiteNotificationsParams, IUnreadNotifications } from '@hive/common-hiveio-packages/wax';
import { getAccountNotifications, getUnreadNotifications } from './bridge-api';
import { readLiteNotifications } from './lite-api';

/** How many lite names `lookupLiteAccounts` asks for by default; the node's own default. */
export const LITE_LOOKUP_LIMIT = 10;

/**
 * The notifications of `account` (a Hive name or a `did:lite:<name>`), newest first: on a node
 * serving `lite.account_notifications` its rows (hivemind's merged with what lite actors did), else
 * `bridge.account_notifications`. `lastId` is the last row of the previous page, exclusive.
 */
export const getNotifications = (
  account: string,
  lastId: number | string | null = null,
  limit = 50
): Promise<IAccountNotification[] | null> => {
  const params: ILiteNotificationsParams = lastId ? { account, last_id: lastId, limit } : { account, limit };
  return readLiteNotifications(
    (api) => api.account_notifications(params),
    () => getAccountNotifications(account, lastId, limit)
  );
};

/** The unread count and read marker of `account`, from the same source as `getNotifications`. */
export const getNotificationsUnread = (account: string): Promise<IUnreadNotifications | null> =>
  readLiteNotifications(
    (api) => api.unread_notifications({ account }),
    () => getUnreadNotifications(account)
  );

/**
 * The registered lite accounts whose name starts with `prefix`, as DIDs by name (at most `limit`);
 * empty on a node without `lite.lookup_accounts`.
 */
export const lookupLiteAccounts = (prefix: string, limit = LITE_LOOKUP_LIMIT): Promise<string[]> =>
  readLiteNotifications(
    (api) => api.lookup_accounts({ prefix, limit }),
    async () => []
  );
