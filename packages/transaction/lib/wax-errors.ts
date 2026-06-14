import { WaxRequestError } from '@hiveio/wax';

/**
 * True when an error means we could not get a usable answer from the API node — an HTTP non-2xx
 * (e.g. `429` / `5xx`), a request timeout, a network/CORS failure, or a malformed-JSON response.
 * These are surfaced by `@hiveio/wax` as the `WaxRequestError` family.
 *
 * It is deliberately NOT true for a definitive API answer that the requested content does not
 * exist: hivemind returns "Post …/… does not exist" as an HTTP-200 JSON-RPC error, which wax
 * surfaces as a `WaxChainApiError` / `WaxAssertionError` (both extend `WaxError`, not
 * `WaxRequestError`).
 *
 * Callers use this to distinguish a transient transport failure — which should render a `5xx`
 * "service temporarily unavailable" — from genuinely-missing content, which should render a 404.
 * A transport failure must never be rendered as a 404 (misleading, and a 404 is cacheable /
 * indexable as "missing"). See hive/denser#926.
 */
export function isTransportError(error: unknown): boolean {
  if (error instanceof WaxRequestError) {
    return true;
  }

  // Defensive fallback: `instanceof` misses when the error crosses a duplicate `@hiveio/wax`
  // module instance (e.g. one bundled by a dependency, or after a WASM re-initialisation). The
  // wax transport-error class names are stable, so match them directly as a backstop.
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined;
  return (
    name === 'WaxRequestError' ||
    name === 'WaxMalformedJsonError' ||
    name === 'WaxNon_2XX_3XX_ResponseCodeError' ||
    name === 'WaxUnknownRequestError' ||
    name === 'WaxRequestTimeoutError' ||
    name === 'WaxRequestAbortedByUser'
  );
}
