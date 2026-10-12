/**
 * Test stub for `@hive/common-hiveio-packages/wax` — the type-only imports of
 * `chain.ts` and the chain service of `hive-chain-service.ts`. See
 * common-hiveio-packages.ts for why the real package is stubbed.
 */
export * from './common-hiveio-packages';
export type ExtendedNodeApi = object;
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
