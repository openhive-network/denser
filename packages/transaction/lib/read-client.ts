/**
 * A wasm-free client for the read-only Hive APIs: JSON-RPC calls (`bridge.*`, `database_api.*`,
 * `condenser_api.*`, ...) and the REST APIs described by a wax `extendRest`-style definition.
 *
 * It mirrors wax's `chain.api` / `chain.restApi` call shape and builds the same HTTP requests, so
 * read code can use it in place of the wax chain and anonymous readers never load the wax wasm.
 * Transport (fetch, timeout, transport-error classes) is injected; production passes wax's own
 * `RequestHelper`, which is plain JavaScript.
 */

/** A node of a REST API definition: `urlPath` and `method` as in wax's `extendRest`. */
export interface IRestApiDefinition {
  urlPath?: string;
  method?: string;
  [child: string]: IRestApiDefinition | string | undefined;
}

export interface IReadClientConfig {
  chainId: string;
  apiEndpoint: string;
  restApiEndpoint: string;
  timeoutMs: number;
  /** Endpoints of individual JSON-RPC APIs, keyed by path (`'search-api.find_text'`); the longest matching path wins. */
  jsonRpcEndpoints?: Readonly<Record<string, string>>;
  /** Endpoints of individual REST APIs, keyed by path (`'hivesense-api'`); the longest matching path wins. */
  restEndpoints?: Readonly<Record<string, string>>;
}

export interface IReadRequest {
  method: string;
  endpoint: string;
  url: string;
  timeout: number;
  data?: string | object;
  responseType: 'json';
}

/** Performs one HTTP request and rejects with a transport error (see `isTransportError`) when it fails. */
export interface IReadTransport {
  request(config: IReadRequest): Promise<{ response?: unknown }>;
}

export interface IReadClientOptions {
  /** Read on every call, so endpoint changes apply to the next request. */
  getConfig: () => IReadClientConfig;
  transport: IReadTransport;
  restApiDefinition: IRestApiDefinition;
}

export interface IReadClient<TApi, TRestApi> {
  readonly api: TApi;
  readonly restApi: TRestApi;
  readonly chainId: string;
  readonly endpointUrl: string;
}

/**
 * A JSON-RPC call answered with an `error` (or without a `result`): a definitive API answer such
 * as "post does not exist", never a transport failure.
 */
export class JsonRpcApiError extends Error {
  constructor(
    readonly method: string,
    readonly response: unknown
  ) {
    super(`${method}: ${jsonRpcErrorMessage(response)}`);
    this.name = 'JsonRpcApiError';
  }
}

const jsonRpcErrorMessage = (response: unknown): string => {
  if (isRecord(response) && isRecord(response.error) && typeof response.error.message === 'string') {
    return response.error.message;
  }
  return 'Invalid response from chain API';
};

const ENDPOINT_URL_KEY = 'endpointUrl';
const QUERY_STRING_METHODS = new Set(['GET', 'DELETE']);
const DEFAULT_REST_METHOD = 'GET';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveEndpoint = (
  path: readonly string[],
  fallback: string,
  endpoints: Readonly<Record<string, string>> = {}
): string => {
  for (let length = path.length; length > 0; length--) {
    const endpoint = endpoints[path.slice(0, length).join('.')];
    if (endpoint) return endpoint;
  }
  return fallback;
};

/** Same encoding as wax's `objectToQueryString`. */
const toQueryString = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}=${value.map((item) => encodeURIComponent(item)).join(',')}`;
      if (typeof value === 'object') return `${key}=${encodeURIComponent(JSON.stringify(value))}`;
      return `${key}=${encodeURIComponent(String(value))}`;
    })
    .join('&');

/**
 * A callable, indexable stand-in for a wax API path: `node.bridge.get_post(params)` calls
 * `onCall(['bridge', 'get_post'], params)`. Function members (`apply`, `call`, `bind`) and `then`
 * are not API paths, so wrappers and `await` behave as on a plain function.
 */
const createApiNode = <TState>(
  state: TState,
  descend: (state: TState, key: string) => TState,
  onCall: (state: TState, params: unknown) => Promise<unknown>,
  getEndpointUrl: (state: TState) => string
): object =>
  new Proxy(function apiNode() {}, {
    get: (target, prop) => {
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      if (prop === ENDPOINT_URL_KEY) return getEndpointUrl(state);
      if (prop in Function.prototype) return Reflect.get(target, prop);
      return createApiNode(descend(state, prop), descend, onCall, getEndpointUrl);
    },
    apply: (_target, _thisArg, args: unknown[]) => onCall(state, args[0])
  });

interface IRestPathState {
  path: readonly string[];
  urlPath: readonly string[];
  method: string;
  definition: IRestApiDefinition | undefined;
}

const fillUrlPlaceholders = (urlPath: string, params: unknown): { url: string; rest: unknown } => {
  if (!isRecord(params) || Array.isArray(params)) return { url: urlPath, rest: params };

  const rest = { ...params };
  const url = urlPath.replace(/\{([^}]*)\}/g, (_match, name: string) => {
    if (!(name in rest)) throw new Error(`No ${name} in request`);
    const value = String(rest[name]);
    delete rest[name];
    return value;
  });
  return { url, rest };
};

/**
 * Creates the read client. `TApi` / `TRestApi` are the wax types the proxies stand in for
 * (`chain.api`, `chain.restApi`); the client only answers the paths those types describe.
 */
export function createReadClient<TApi extends object, TRestApi extends object>({
  getConfig,
  transport,
  restApiDefinition
}: IReadClientOptions): IReadClient<TApi, TRestApi> {
  const callJsonRpc = async (path: readonly string[], params: unknown): Promise<unknown> => {
    const config = getConfig();
    const method = path.join('.');
    const { response } = await transport.request({
      method: 'POST',
      endpoint: resolveEndpoint(path, config.apiEndpoint, config.jsonRpcEndpoints),
      url: '',
      timeout: config.timeoutMs,
      data: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      responseType: 'json'
    });
    if (isRecord(response) && 'result' in response) return response.result;
    throw new JsonRpcApiError(method, response);
  };

  const callRest = async (state: IRestPathState, params: unknown): Promise<unknown> => {
    const config = getConfig();
    const { url: path, rest } = fillUrlPlaceholders(
      `/${state.urlPath.filter((segment) => segment.length > 0).join('/')}`,
      params
    );
    const isQueryOnly = QUERY_STRING_METHODS.has(state.method);
    const query = isQueryOnly && isRecord(rest) && Object.keys(rest).length > 0 ? `?${toQueryString(rest)}` : '';
    const { response } = await transport.request({
      method: state.method,
      endpoint: resolveEndpoint(state.path, config.restApiEndpoint, config.restEndpoints),
      url: path + query,
      timeout: config.timeoutMs,
      data: isQueryOnly || !isRecord(rest) ? undefined : rest,
      responseType: 'json'
    });
    return response;
  };

  const descendRest = (state: IRestPathState, key: string): IRestPathState => {
    const child = state.definition?.[key];
    const definition = isRecord(child) ? child : undefined;
    return {
      path: [...state.path, key],
      urlPath: [...state.urlPath, definition?.urlPath ?? key],
      method: definition?.method ?? state.method,
      definition
    };
  };

  const api = createApiNode<readonly string[]>(
    [],
    (path, key) => [...path, key],
    callJsonRpc,
    (path) => {
      const config = getConfig();
      return resolveEndpoint(path, config.apiEndpoint, config.jsonRpcEndpoints);
    }
  );
  const restApi = createApiNode<IRestPathState>(
    { path: [], urlPath: [], method: DEFAULT_REST_METHOD, definition: restApiDefinition },
    descendRest,
    callRest,
    (state) => {
      const config = getConfig();
      return resolveEndpoint(state.path, config.restApiEndpoint, config.restEndpoints);
    }
  );

  return {
    // The proxies answer every path of the wax API types they stand in for; TypeScript cannot
    // see through a Proxy, so the type is asserted here once.
    api: api as TApi,
    restApi: restApi as TRestApi,
    get chainId() {
      return getConfig().chainId;
    },
    get endpointUrl() {
      return getConfig().apiEndpoint;
    }
  };
}
