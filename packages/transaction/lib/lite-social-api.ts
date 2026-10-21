import type { AccountFollowStats, IFollow, ILiteFollow } from '@hive/common-hiveio-packages/wax';
import { readLiteSocial } from './lite-api';

const HIVE_DID_PREFIX = 'did:hive:';

/**
 * The account a lite social row names, as the rest of the app names it: a Hive account by its
 * name (`did:hive:<name>` → `<name>`), a lite account by its `did:lite:<name>`.
 */
export const accountOfDid = (account: string): string =>
  account.startsWith(HIVE_DID_PREFIX) ? account.slice(HIVE_DID_PREFIX.length) : account;

/** A `lite.get_followers` / `lite.get_following` row in the shape of condenser's `get_followers`. */
export const toFollow = (row: ILiteFollow): IFollow => ({
  follower: accountOfDid(row.follower),
  following: accountOfDid(row.following),
  what: row.what
});

export interface ILiteFollowQuery {
  /** A Hive account name or a `did:lite:<name>`. */
  account: string;
  /** The last row of the previous page (as `toFollow` names it), or null for the first page. */
  start: string | null;
  /** `blog` (follows) or `ignore` (mutes). */
  type: string;
  limit: number;
}

// A Hive account `start` is passed by name: the node pages Hive rows by name and lite rows by DID.
const followParams = (query: ILiteFollowQuery) => ({ ...query, start: query.start || null });

/**
 * The followers of an account with lite followers among them, on a node that serves the lite social
 * graph; null on any other node (the caller reads `condenser_api.get_followers`).
 */
export const getLiteFollowers = async (query: ILiteFollowQuery): Promise<IFollow[] | null> => {
  const rows = await readLiteSocial((api) => api.get_followers(followParams(query)));
  return rows && rows.map(toFollow);
};

/** The accounts an account follows (`type` blog) or mutes (`ignore`), lite ones included; null as above. */
export const getLiteFollowing = async (query: ILiteFollowQuery): Promise<IFollow[] | null> => {
  const rows = await readLiteSocial((api) => api.get_following(followParams(query)));
  return rows && rows.map(toFollow);
};

/** Follower and following counts with lite follows included; null on a node without the social graph. */
export const getLiteFollowCount = (account: string): Promise<AccountFollowStats | null> =>
  readLiteSocial((api) => api.get_follow_count({ account }));

/** The communities an account (a Hive name or a lite DID) subscribes to; null as above. */
export const getLiteSubscriptions = (account: string): Promise<string[][] | null> =>
  readLiteSocial(async (api) => (await api.list_all_subscriptions({ account })) ?? []);
