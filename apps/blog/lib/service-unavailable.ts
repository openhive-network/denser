import type { OutgoingHttpHeaders, ServerResponse } from 'node:http';

/** Seconds a client or crawler is asked to wait before retrying a 503. */
export const RETRY_AFTER_SECONDS = 30;

const SERVICE_UNAVAILABLE_ERROR_NAME = 'ServiceUnavailableError';

/**
 * Thrown by a server component when the data its page must render could not be fetched from any
 * Hive API node. The request then answers HTTP 503 with `Retry-After` (crawlers retry a 503 and do
 * not index it) instead of a 200 without content, or Next's generic 500.
 */
export class ServiceUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Hive API unavailable', { cause });
    this.name = SERVICE_UNAVAILABLE_ERROR_NAME;
  }
}

const isServiceUnavailableError = (error: unknown): boolean =>
  error instanceof ServiceUnavailableError ||
  (typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === SERVICE_UNAVAILABLE_ERROR_NAME);

// Keyed by the request's headers object: it is the only per-request object that Next hands both to
// `onRequestError` and (as `response.req.headers`) to the response.
const unavailableRequests = new WeakSet<object>();

/**
 * `onRequestError` hook: remembers that this request's render failed with a
 * `ServiceUnavailableError`. Next reports render errors before it writes the status line.
 */
export function markServiceUnavailableRequest(error: unknown, request: { headers: object }): void {
  if (isServiceUnavailableError(error)) unavailableRequests.add(request.headers);
}

type WriteHead = (
  this: ServerResponse,
  statusCode: number,
  statusMessageOrHeaders?: string | OutgoingHttpHeaders,
  headers?: OutgoingHttpHeaders
) => ServerResponse;

/**
 * Makes `ServerResponse` answer 503 + `Retry-After` instead of the 500 Next sends for a render that
 * threw: App Router offers no way for a page to choose that status itself. Only requests marked by
 * `markServiceUnavailableRequest` are affected; call once, from the Node.js `register()`.
 */
export function installServiceUnavailableStatus(responseClass: typeof ServerResponse): void {
  const writeHead = responseClass.prototype.writeHead as WriteHead;
  const patched: WriteHead = function (statusCode, ...rest) {
    if (statusCode === 500 && this.req && unavailableRequests.has(this.req.headers)) {
      this.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
      // Drop a status message meant for the 500.
      const headers = typeof rest[0] === 'string' ? rest[1] : rest[0];
      return writeHead.call(this, 503, headers);
    }
    return writeHead.call(this, statusCode, ...rest);
  };
  Object.defineProperty(responseClass.prototype, 'writeHead', {
    value: patched,
    writable: true,
    configurable: true
  });
}
