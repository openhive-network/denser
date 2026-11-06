import type { IReadRequest, IReadTransport } from './read-client';

/**
 * The read client failed to get a usable answer from the node: an HTTP non-2xx/3xx status, a
 * timeout, an aborted request, a network/CORS failure or a malformed-JSON body. `isTransportError`
 * recognises it like wax's `WaxRequestError` family, whose messages it reuses. For a non-2xx/3xx
 * status, `body` is the parsed response body, so callers can tell apart the API's answers.
 */
export class ReadTransportError extends Error {
  constructor(
    message: string,
    readonly request: IReadRequest,
    readonly status?: number,
    cause?: unknown,
    readonly body?: unknown
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ReadTransportError';
  }
}

/**
 * Statuses that reject the request itself, so every node would answer it the same. 404 is one only
 * when it is not a missing endpoint (see `isEndpointMissing`).
 */
export const isRequestRejected = (status: number): boolean =>
  status >= 400 && status < 500 && status !== 408 && status !== 429;

/**
 * REST endpoints (`<api>.<method>`) newer than the rest of their API, which nodes serving the API
 * may not have yet: their 404 means the node lacks the endpoint, not the API.
 */
const ENDPOINTS_NOT_ON_EVERY_NODE = new Set([
  'balance-api.proposalsPayments',
  ...[
    'rankedPosts',
    'post',
    'postVotes',
    'postDiscussion',
    'postHeader',
    'postRebloggedBy',
    'accountPosts',
    'accountProfile',
    'accountFollowers',
    'accountFollowing',
    'accountNotifications',
    'accountUnreadNotifications',
    'accountFollowList',
    'accountFollowsAnyLists',
    'accountSubscriptions',
    'communities',
    'community',
    'communityRoles',
    'communitySubscribers',
    'searchPosts'
  ].map((endpoint) => `hivemind-api.${endpoint}`)
]);

/**
 * REST endpoints (`<api>.<method path>`) whose cold query can outlast the request timeout on a healthy
 * node: their timeout is that node's answer, not a sign that it cannot serve the API.
 */
const ENDPOINTS_SLOWER_THAN_A_TIMEOUT = new Set(['hivesense-api.posts.author.permlink.similar']);

/** Whether the request was aborted by its own timeout. */
const isRequestTimeout = (error: ReadTransportError): boolean =>
  error.cause instanceof Error && error.cause.name === 'TimeoutError';

/** PostgREST's code for a request naming no SQL function the node has. */
const POSTGREST_FUNCTION_NOT_FOUND = 'PGRST202';
/** The SQLSTATE a PostgREST function raises to answer 404 itself, e.g. for an item that does not exist. */
const POSTGREST_OWN_NOT_FOUND = 'PT404';

/**
 * Whether a failed REST call means the node lacks the endpoint called: PostgREST's "function not
 * found" (PGRST202) whatever the status, or any other 404 but the endpoint's own (PT404), which is
 * its answer about one item, not a sign the node lacks it.
 */
export const isEndpointMissing = (error: unknown): boolean => {
  if (!(error instanceof ReadTransportError)) return false;
  const { body } = error;
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  if (code === POSTGREST_FUNCTION_NOT_FOUND) return true;
  return error.status === 404 && code !== POSTGREST_OWN_NOT_FOUND;
};

/**
 * Whether a failed REST call means this node cannot serve that REST API: it does not have it
 * (`isEndpointMissing`), is down or overloaded (5xx, 408, 429, timeout, network failure) or did not
 * answer with JSON, so another node may serve it. False for a request the API rejected (any other
 * 4xx, including the endpoint's own 404 about one item), for a missing endpoint at `path` (e.g.
 * `['balance-api', 'proposalsPayments']`) that not every node has, for a timeout of an endpoint
 * whose cold query may take longer, and for any error that is not a `ReadTransportError`.
 */
export const isRestApiUnavailable = (error: unknown, path: readonly string[] = []): boolean => {
  if (!(error instanceof ReadTransportError)) return false;
  const endpoint = path.join('.');
  if (error.status === undefined) return !(isRequestTimeout(error) && ENDPOINTS_SLOWER_THAN_A_TIMEOUT.has(endpoint));
  if (isEndpointMissing(error)) return !ENDPOINTS_NOT_ON_EVERY_NODE.has(endpoint);
  return !isRequestRejected(error.status);
};

/**
 * Node's error codes (`error.code` of the failure `fetch` wraps) for a request that never reached
 * the node's server: the connection was refused or reset, its address did not resolve or could not
 * be routed to, or TLS could not be set up. A timeout is none of them.
 */
const CONNECTION_FAILURE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EPROTO',
  'UND_ERR_SOCKET',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
]);

const isConnectionFailureCode = (code: unknown): boolean =>
  typeof code === 'string' &&
  (CONNECTION_FAILURE_CODES.has(code) || code.startsWith('ERR_TLS_') || code.startsWith('ERR_SSL_'));

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

/** Deepest `cause` followed; the chain of a failed request is three errors long. */
const MAX_CAUSE_DEPTH = 5;

/**
 * Whether a failed request (a `ReadTransportError` or wax's `WaxRequestError`, both keeping the
 * failure of `fetch` as `cause`) could not connect to the node at all (see
 * CONNECTION_FAILURE_CODES), so no other API of the node can be reached either. False for a
 * timeout, an HTTP status, a malformed body, and for a browser's network failure, which carries
 * no code to tell it from a CORS rejection.
 */
export const isConnectionFailure = (error: unknown): boolean => {
  let current = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && isObject(current); depth += 1) {
    if (isConnectionFailureCode(Reflect.get(current, 'code'))) return true;
    current = Reflect.get(current, 'cause');
  }
  return false;
};

/** wax's `WaxRequestError` family, by name: this module does not import wax (see `fetchReadTransport`). */
export const WAX_REQUEST_ERROR_NAMES: ReadonlySet<string> = new Set([
  'WaxRequestError',
  'WaxMalformedJsonError',
  'WaxNon_2XX_3XX_ResponseCodeError',
  'WaxUnknownRequestError',
  'WaxRequestTimeoutError',
  'WaxRequestAbortedByUser'
]);

/**
 * Whether `error`, or a few levels deep its `cause`, is a request that got no usable answer from the
 * node, a `ReadTransportError` or one of wax's `WaxRequestError` family: the node could not be
 * reached, did not answer in time or answered with an HTTP error. False for an answer the node gave,
 * such as a JSON-RPC error.
 */
export const isNodeRequestFailure = (error: unknown): boolean => {
  let current = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && isObject(current); depth += 1) {
    const name = Reflect.get(current, 'name');
    if (name === 'ReadTransportError' || (typeof name === 'string' && WAX_REQUEST_ERROR_NAMES.has(name))) return true;
    current = Reflect.get(current, 'cause');
  }
  return false;
};

const describeRequest = (request: IReadRequest): string => `"${request.method} ${request.endpoint + request.url}"`;

const parseBody = (request: IReadRequest, status: number, text: string): unknown => {
  if (text.length === 0 || status === 204) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ReadTransportError(
      `Received malformed JSON while requesting given resource ${describeRequest(request)}: #${status}`,
      request,
      status
    );
  }
};

const toTransportError = (request: IReadRequest, error: unknown): ReadTransportError => {
  if (error instanceof ReadTransportError) return error;
  const name = error instanceof Error ? error.name : undefined;
  if (name === 'TimeoutError') {
    return new ReadTransportError(`Request timed out: ${describeRequest(request)}`, request, undefined, error);
  }
  if (name === 'AbortError') {
    return new ReadTransportError(`Request aborted by user action: ${describeRequest(request)}`, request);
  }
  return new ReadTransportError(
    `Unknown request error caught (possible network or CORS error): ${describeRequest(request)}`,
    request,
    undefined,
    error
  );
};

/**
 * `fetch` transport of the read client. Sends the same requests as wax's `RequestHelper` (checked by
 * `wax-equivalence.test.ts`) without importing `@hiveio/wax`, whose JavaScript alone is ~70 KB gzip,
 * so pages that only read never load it. Every failure rejects with a `ReadTransportError`.
 */
export const fetchReadTransport: IReadTransport = {
  async request(request) {
    const controller = request.timeout !== 0 ? new AbortController() : undefined;
    const timeoutId = controller
      ? setTimeout(
          () => controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError')),
          request.timeout
        )
      : undefined;
    try {
      const response = await fetch(request.endpoint + request.url, {
        method: request.method,
        headers: request.data !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: typeof request.data === 'object' ? JSON.stringify(request.data) : request.data,
        signal: controller?.signal
      });
      const body = parseBody(request, response.status, await response.text());
      if (response.status < 200 || response.status > 399) {
        throw new ReadTransportError(
          `Received non 2xx-3xx http response code while requesting given resource ${describeRequest(request)}: #${response.status}`,
          request,
          response.status,
          undefined,
          body
        );
      }
      return { response: body };
    } catch (error) {
      throw toTransportError(request, error);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
};
