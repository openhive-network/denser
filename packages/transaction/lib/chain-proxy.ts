import { logApiCall, isApiLoggingEnabled } from './api-logger';

/**
 * Creates a proxy that intercepts API calls and logs them.
 * Recursively wraps nested objects to handle namespaced APIs like
 * chain.api.bridge.get_post() or chain.restApi['hivesense-api'].posts.search()
 */
function createLoggingProxy<T extends object>(target: T, pathPrefix: string): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      const propName = String(prop);
      const currentPath = pathPrefix ? `${pathPrefix}.${propName}` : propName;

      // Skip internal properties and symbols
      if (typeof prop === 'symbol' || propName.startsWith('_')) {
        return value;
      }

      // If it's a function, wrap it with logging
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          const start = Date.now();

          try {
            const result = await value.apply(obj, args);
            logApiCall({
              api: currentPath,
              params: args.length === 1 ? args[0] : args,
              status: 'success',
              duration_ms: Date.now() - start
            });
            return result;
          } catch (error) {
            logApiCall({
              api: currentPath,
              params: args.length === 1 ? args[0] : args,
              status: 'error',
              duration_ms: Date.now() - start,
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        };
      }

      // For nested objects, recursively wrap them
      if (typeof value === 'object' && value !== null) {
        return createLoggingProxy(value as object, currentPath);
      }

      return value;
    }
  });
}

/**
 * Wraps a HiveChain instance with logging proxies on api and restApi properties.
 * Only wraps if DEBUG_API_CALLS is enabled.
 */
export function wrapChainWithLogging<T extends { api: object; restApi: object }>(chain: T): T {
  if (!isApiLoggingEnabled()) {
    return chain;
  }

  // Create a proxy for the chain that intercepts api and restApi access
  return new Proxy(chain, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);

      if (prop === 'api' && typeof value === 'object' && value !== null) {
        return createLoggingProxy(value as object, '');
      }

      if (prop === 'restApi' && typeof value === 'object' && value !== null) {
        return createLoggingProxy(value as object, 'rest');
      }

      return value;
    }
  });
}
