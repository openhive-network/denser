/**
 * matrix-js-sdk asks the homeserver for its MatrixRTC transports (MSC4143) whenever a client
 * starts, with no option to turn that off, and denser uses no MatrixRTC: a homeserver without
 * the endpoint answers 404, which the browser logs as a failed request on every start. This
 * answers that request here, as such a homeserver would, so it never reaches the network. It can
 * go once the SDK can skip the probe (https://gitlab.syncad.com/hive/matrix-js-sdk/-/issues/3).
 */

const RTC_TRANSPORTS_PATH = '/org.matrix.msc4143/rtc/transports';
const NOT_FOUND = 404;

function pathOf(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.pathname;
  const url = typeof input === 'string' ? input : input.url;
  return url.split(/[?#]/)[0];
}

/** `fetchFn`, but answering the SDK's MatrixRTC transports request locally with `M_UNRECOGNIZED` */
export function withLocalRtcTransportsAnswer(fetchFn: typeof fetch): typeof fetch {
  return (input, init) => {
    if (!pathOf(input).includes(RTC_TRANSPORTS_PATH)) return fetchFn(input, init);
    const body = JSON.stringify({ errcode: 'M_UNRECOGNIZED', error: 'Unrecognized request' });
    return Promise.resolve(
      new Response(body, { status: NOT_FOUND, headers: { 'content-type': 'application/json' } })
    );
  };
}
