/**
 * Test stub for `@hive/common-hiveio-packages`.
 *
 * The real package re-exports `@hiveio/wax` and `@hiveio/hb-auth`, which are
 * ESM/WASM-only and cannot be loaded by the CommonJS mocha + ts-node runner.
 * Modules that only reach it through chain bootstrapping (e.g. `validate-hive-account.ts`
 * via `chain.ts`) load against this inert stand-in; nothing here talks to a node.
 *
 * Wired in via the path mapping in tsconfig.test.json + tsconfig-paths/register.
 */
import type { TWaxExtended } from './hiveio-wax';

export type HiveChain = TWaxExtended<unknown, unknown>;

const STUB_ERROR_MESSAGE = '@hive/common-hiveio-packages is stubbed in unit tests';

export const getChain = (): Promise<HiveChain> => Promise.reject(new Error(STUB_ERROR_MESSAGE));
export const reuseHiveChain = (): HiveChain | undefined => undefined;
export const setRpcEndpoint = (_endpoint: string): void => {
  throw new Error(STUB_ERROR_MESSAGE);
};
export const setAiEndpoint = (_endpoint: string): void => {
  throw new Error(STUB_ERROR_MESSAGE);
};
export const getAiEndpoint = (): string => {
  throw new Error(STUB_ERROR_MESSAGE);
};
export interface IApiEndpoints {
  chainId: string;
  apiEndpoint: string;
  restApiEndpoint: string;
  apiTimeout: number;
  aiEndpoint: string;
  searchApiEndpoint?: string;
}
export const getApiEndpoints = (): IApiEndpoints => {
  throw new Error(STUB_ERROR_MESSAGE);
};
export const isWasmMemoryError = (_error: unknown): boolean => false;
export const resetChain = (): void => undefined;
