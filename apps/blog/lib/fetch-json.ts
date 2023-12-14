import { ErrorResponse } from './api';

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

  constructor({ message, response, data }: { message: string; response: Response; data: ErrorResponse }) {
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

export async function fetchJson<JSON = any>(input: RequestInfo, init?: RequestInit): Promise<JSON> {
  const response = await fetch(input, init);

  // If the server replies, there's always some data in json.
  // If there's a network error, it will throw at the previous line.
  const data = await response.json();

  // response.ok is true when res.status is 2xx
  // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
  if (response.ok) {
    return data;
  }

  throw new FetchError({
    message: `Status: ${response.status || 'none'}. Status Text: ${response.statusText || 'none'}`,
    response,
    data
  });
}
