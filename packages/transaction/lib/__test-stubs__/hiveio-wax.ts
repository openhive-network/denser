/**
 * Test stub for `@hiveio/wax`.
 *
 * The real package is ESM/`import`-only (its package.json `exports` define no
 * `require` condition), so it cannot be loaded by the CommonJS mocha + ts-node
 * runner. `wax-errors.ts` only needs the `WaxRequestError` class for an
 * `instanceof` check, so this minimal stand-in is enough — wax-errors' name-based
 * backstop covers the rest, which is what the unit tests exercise.
 *
 * Wired in via the `@hiveio/wax` path mapping in tsconfig.test.json +
 * tsconfig-paths/register (see .mocharc.yml).
 */
export class WaxRequestError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'WaxRequestError';
  }
}

/** Minimal chain shape for modules that only reference wax chain types. */
/** The wax API entity types the transaction modules name; their fields are not checked. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- stands in for wax's account type, field by field
export type ApiAccount = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- stands in for wax's global properties type
export type GetDynamicGlobalPropertiesResponse = any;
export type TWaxApiRequest<TParams, TResult> = (params: TParams) => Promise<TResult>;

/** The calls of wax's own APIs the transaction modules make. */
interface IWaxBaseApi {
  database_api: {
    find_accounts: TWaxApiRequest<{ accounts: string[]; delayed_votes_active?: boolean }, { accounts: ApiAccount[] }>;
  };
  rc_api: {
    find_rc_accounts: TWaxApiRequest<{ accounts: string[] }, { rc_accounts: ApiAccount[] }>;
  };
}

export type TWaxExtended<NodeApi, RestApi> = {
  api: NodeApi & IWaxBaseApi;
  restApi: RestApi & { endpointUrl: string };
  readonly chainId: string;
  readonly endpointUrl: string;
  extendConfig(config: { chainId: string; apiEndpoint: string; restApiEndpoint: string; apiTimeout: number }): TWaxExtended<NodeApi, RestApi>;
  isValidAccountName(name: string): boolean;
};
/** wax's REST API type: a `{ params, result }` node is callable, every node has an `endpointUrl`. */
export type TWaxRestExtended<RestApi> = {
  [K in keyof RestApi]: (RestApi[K] extends { params: infer P; result: infer R } ? (params: P) => Promise<R> : unknown) &
    TWaxRestExtended<Omit<RestApi[K], 'params' | 'result'>>;
} & { endpointUrl: string };

/** Asset types for the pure-TS asset modules of `@hive/ui` (type-only imports of wax). */
export interface NaiAsset {
  amount: string;
  precision: number;
  nai: string;
}
export enum EAssetName {
  HIVE = 'HIVE',
  HBD = 'HBD',
  VESTS = 'VESTS'
}
