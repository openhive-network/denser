/**
 * Test stub for `@hive/common-hiveio-packages/wax` — the type-only imports of
 * `chain.ts` and the chain service of `hive-chain-service.ts`. See
 * common-hiveio-packages.ts for why the real package is stubbed.
 */
export * from './common-hiveio-packages';

type PostsRead = (params: object) => Promise<unknown>;
interface IPostsApi {
  get_discussion: PostsRead;
  get_post: PostsRead;
  get_ranked_posts: PostsRead;
  get_account_posts: PostsRead;
}
/** The post reads of `lite-api.ts`; the other JSON-RPC APIs stay untyped. */
export type ExtendedNodeApi = {
  lite: IPostsApi & {
    get_info: PostsRead;
    get_profile: (params: object) => Promise<ILiteProfile | null>;
    get_followers: (params: ILiteFollowParams) => Promise<ILiteFollow[]>;
    get_following: (params: ILiteFollowParams) => Promise<ILiteFollow[]>;
    get_follow_count: (params: { account: string }) => Promise<ILiteFollowCount>;
    list_subscribers: (params: { community: string; last?: string; limit?: number }) => Promise<string[][] | null>;
    list_all_subscriptions: (params: { account: string }) => Promise<string[][] | null>;
    account_notifications: (params: ILiteNotificationsParams) => Promise<IAccountNotification[] | null>;
    unread_notifications: (params: { account: string }) => Promise<IUnreadNotifications | null>;
    lookup_accounts: (params: { prefix: string; limit?: number }) => Promise<string[]>;
  };
  bridge: IPostsApi;
};
export interface ILiteApiInfo {
  version: string;
  modes: string[];
  render_base: string;
  apps: { posts: string; social?: string };
  methods: string[];
}
export interface ILiteFollow {
  follower: string;
  following: string;
  what: string[];
}
export interface ILiteFollowCount {
  account: string;
  follower_count: number;
  following_count: number;
}
export interface ILiteFollowParams {
  account: string;
  start: string | null;
  type: string;
  limit: number;
}
/** A row of `bridge.account_notifications` / `lite.account_notifications`, and the unread answer. */
export interface IAccountNotification {
  date: string;
  id?: number | string;
  msg: string;
  score: number;
  type: string;
  url: string;
}
export interface IUnreadNotifications {
  lastread: string;
  unread: number;
}
export interface ILiteNotificationsParams {
  account: string;
  last_id?: number | string;
  limit: number;
}
/** condenser's follow row and follow counts, as `lite-social-api.ts` returns them. */
export interface IFollow {
  follower: string;
  following: string;
  what: string[];
}
export interface AccountFollowStats {
  follower_count: number;
  following_count: number;
  account: string;
}
/** `lite.get_profile`'s answer, reduced to the fields the tests build. */
export interface ILiteProfile {
  id: number;
  name: string;
  created: string;
  active: string;
  post_count: number;
  reputation: number;
  blacklists: string[];
  stats: { rank: number; followers: number; following: number };
  metadata: { profile?: { name?: string; about?: string } };
  lite?: { gateway?: boolean; pools?: unknown[] };
}
// Plain data with no imports, so the real definition loads under mocha.
export { EXTENDED_REST_API_DEFINITION } from '../../../common-hiveio-packages/src/wax/rest-api-definition';

/** The HiveSense post types of `hivesense-api.ts`, reduced to the fields it reads. */
export interface Entry {
  author: string;
  permlink: string;
  title: string;
}
export interface PostStub {
  author: string;
  permlink: string;
}
export type MixedPostsResponse = Array<Entry | PostStub>;

type RestCall<TResult> = (params: object) => Promise<TResult>;
/** The HiveSense calls of `hivesense-api.ts`; the other REST APIs stay untyped. */
export type ExtendedRestApi = {
  'hivesense-api': {
    posts: {
      search: RestCall<MixedPostsResponse>;
      author: { permlink: { similar: RestCall<Entry[]> } };
      byIds: RestCall<Entry[]>;
    };
  };
};
