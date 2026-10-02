/**
 * Test stub for `@hive/common-hiveio-packages/wax` — the type-only imports of
 * `chain.ts` and the chain service of `hive-chain-service.ts`. See
 * common-hiveio-packages.ts for why the real package is stubbed.
 */
export * from './common-hiveio-packages';
export type ExtendedNodeApi = object;
export type ExtendedRestApi = object;
// Plain data with no imports, so the real definition loads under mocha.
export { EXTENDED_REST_API_DEFINITION } from '../../../common-hiveio-packages/src/wax/rest-api-definition';
