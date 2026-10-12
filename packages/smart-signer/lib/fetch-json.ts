import type { ErrorResponse } from '@smart-signer/lib/api';

/**
 * Error specific for our API server. You should not expect the same
 * shape of `data` object, when http request is sent to the other API
 * server.
 *
 * @export
 * @class FetchError
 * @extends {Error}
 */
export class FetchError extends Error {
  response: Response;
  data: ErrorResponse;

  constructor({
    message,
    response,
    data,
  }: {
    message: string
    response: Response
    data: ErrorResponse
  }) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only
    // available on V8).
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }

    this.name = 'FetchError';
    this.response = response;
    this.data = data ?? { error: { message } };
  }
}

function statusMessage(response: Response): string {
  return `Status: ${response.status || 'none'}. Status Text: ${response.statusText || 'none'}`;
}

/**
 * A reply that is not JSON (e.g. an HTML error page from a proxy, or a route
 * the app does not serve) fails as a FetchError naming what came back, rather
 * than as a bare SyntaxError from the parser.
 */
async function parseJsonBody(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const contentType = response.headers.get('content-type') || 'no content type';
    const message = `${statusMessage(response)}. Expected a JSON response from ${response.url}, got ${contentType}`;
    throw new FetchError({ message, response, data: { error: { message } } });
  }
}

export async function fetchJson<JSON = any>(
  input: string | Request | URL,
  init?: RequestInit,
  timeout = 1000 * 30
): Promise<JSON> {
  // See https://developer.chrome.com/blog/abortable-fetch
  const controller = new AbortController();
  const signal = controller.signal;
  setTimeout(() => controller.abort(), timeout);
  const myInit = { ...init, signal };
  const response = await fetch(input, myInit);

  // If there's a network error, it will throw at the previous line.
  const data = await parseJsonBody(response);

  // response.ok is true when res.status is 2xx
  // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
  if (response.ok) {
    return data;
  }

  throw new FetchError({
    message: statusMessage(response),
    response,
    data,
  })
}
