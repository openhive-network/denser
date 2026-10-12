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
 * Statuses that reject the request itself, so every node would answer it the same. 404 is not one:
 * a node without the REST API answers it.
 */
const isRequestRejected = (status: number): boolean =>
  status >= 400 && status < 500 && status !== 404 && status !== 408 && status !== 429;

/**
 * Whether a failed REST call means this node cannot serve that REST API: it does not have it (404),
 * is down or overloaded (5xx, 408, 429, timeout, network failure) or did not answer with JSON, so
 * another node may serve it. False for a request the API rejected (any other 4xx) and for any error
 * that is not a `ReadTransportError`.
 */
export const isRestApiUnavailable = (error: unknown): boolean =>
  error instanceof ReadTransportError && (error.status === undefined || !isRequestRejected(error.status));

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
  if (name === 'TimeoutError') return new ReadTransportError(`Request timed out: ${describeRequest(request)}`, request);
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
