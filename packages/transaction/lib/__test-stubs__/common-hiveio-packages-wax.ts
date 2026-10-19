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
  lite: IPostsApi & { get_info: PostsRead };
  bridge: IPostsApi;
};
export interface ILiteApiInfo {
  version: string;
  modes: string[];
  render_base: string;
  apps: { posts: string };
  methods: string[];
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
