import { getLogger } from '@ui/lib/logging';
import { isTransportError } from './wax-errors';

/**
 * Wraps every read API call on a HiveChain instance (`chain.api`, `chain.restApi`) with retry
 * (exponential backoff) and ordered endpoint failover for transport errors - see hive/denser#761.
 *
 * `network_broadcast_api` is deliberately excluded: retrying/redirecting an already-submitted
 * signed transaction on a transient error has different (non-idempotent) risk characteristics
 * than retrying a read, so it is left to callers to handle broadcast failures explicitly.
 */

const logger = getLogger('chain-retry');

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

const NON_RETRYABLE_NAMESPACES = new Set(['network_broadcast_api']);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface IEndpointHolder {
  endpointUrl: string;
}

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>;

function wrapWithRetryAndFailover(
  fn: AnyAsyncFn,
  thisArg: object,
  apiPath: string,
  endpointHolder: IEndpointHolder,
  fallbackEndpoints: readonly string[]
): AnyAsyncFn {
  return async (...args: unknown[]): Promise<unknown> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await fn.apply(thisArg, args);
      } catch (error) {
        lastError = error;
        if (!isTransportError(error)) {
          throw error;
        }

        if (attempt < MAX_ATTEMPTS - 1) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          logger.warn(
            '%s transport error (attempt %d/%d), retrying in %dms: %o',
            apiPath,
            attempt + 1,
            MAX_ATTEMPTS,
            delay,
            error
          );
          await sleep(delay);
        }
      }
    }

    for (const fallbackEndpoint of fallbackEndpoints) {
      if (endpointHolder.endpointUrl === fallbackEndpoint) {
        continue;
      }

      logger.warn(
        '%s exhausted retries on %s, failing over to %s',
        apiPath,
        endpointHolder.endpointUrl,
        fallbackEndpoint
      );
      // Sticky for the process lifetime: once a fallback is selected it stays the active
      // endpoint for every subsequent call (including from other in-flight requests, since
      // `endpointHolder` is shared) - there is no automatic fall-back-forward to the primary
      // once it recovers. Acceptable for now (avoids flip-flopping under a flaky primary);
      // revisit if the primary needs to be re-preferred once healthy again.
      endpointHolder.endpointUrl = fallbackEndpoint;

      try {
        return await fn.apply(thisArg, args);
      } catch (error) {
        lastError = error;
        // A non-transport error here is a definitive answer from a reachable fallback (e.g.
        // "post does not exist") - not something trying yet another fallback would fix, so it
        // propagates immediately, same as the primary-endpoint loop above.
        if (!isTransportError(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  };
}

function createRetryProxy<T extends object>(
  target: T,
  pathPrefix: string,
  endpointHolder: IEndpointHolder,
  fallbackEndpoints: readonly string[]
): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      const propName = String(prop);

      if (typeof prop === 'symbol' || propName.startsWith('_')) {
        return value;
      }

      if (NON_RETRYABLE_NAMESPACES.has(propName)) {
        return value;
      }

      const currentPath = pathPrefix ? `${pathPrefix}.${propName}` : propName;

      if (typeof value === 'function') {
        return wrapWithRetryAndFailover(value as AnyAsyncFn, obj, currentPath, endpointHolder, fallbackEndpoints);
      }

      if (typeof value === 'object' && value !== null) {
        return createRetryProxy(value as object, currentPath, endpointHolder, fallbackEndpoints);
      }

      return value;
    }
  });
}

export interface IChainRetryFallbackEndpoints {
  api?: readonly string[];
  restApi?: readonly string[];
}

export function wrapChainWithRetry<T extends { api: object; restApi: object }>(
  chain: T,
  fallbackEndpoints: IChainRetryFallbackEndpoints = {}
): T {
  return new Proxy(chain, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);

      if (prop === 'api' && typeof value === 'object' && value !== null) {
        return createRetryProxy(
          value as object,
          '',
          value as unknown as IEndpointHolder,
          fallbackEndpoints.api ?? []
        );
      }

      if (prop === 'restApi' && typeof value === 'object' && value !== null) {
        return createRetryProxy(
          value as object,
          'rest',
          value as unknown as IEndpointHolder,
          fallbackEndpoints.restApi ?? []
        );
      }

      return value;
    }
  });
}
