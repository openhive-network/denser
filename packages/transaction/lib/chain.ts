import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

export const getChain = (): Promise<Chain> => {
  // Do not cache the instance. On the server, hive-chain getChain returns a
  // request-scoped view for the api-node cookie. Caching it (or unwrapping
  // back to the singleton) would let one visitor's node serve later SSR.
  // Init failures still clear the wax singleton inside hive-chain-service.
  return getHiveChainService().getHiveChain().then(wrapChainWithLogging);
};

/**
 * Kept for callers that reset both layers after a WASM failure.
 * The transaction layer does not cache a chain anymore (that cache reused
 * one request's API node). resetChain() drops the wax singleton.
 */
export const resetTransactionChain = (): void => {
  // Intentionally empty: see the doc comment.
};
