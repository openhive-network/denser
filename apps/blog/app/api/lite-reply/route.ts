import { getLogger } from '@ui/lib/logging';
import { callGateway, clientIp, liteGatewayUrl } from '@/blog/lib/lite-relay/gateway';

const logger = getLogger('lite-relay');

const JSON_HEADERS = { 'content-type': 'application/json' };

/** Relay the gateway's answer; a non-JSON body (a proxy error page, say) becomes a JSON error. */
function relayed(result: { status: number; body: string }): Response {
  if (!looksLikeJson(result.body)) {
    logger.warn({ status: result.status }, 'lite gateway answered with a non-JSON body');
    const message = `lite gateway answered ${result.status} without a JSON body`;
    return Response.json({ ok: false, code: 'relay_unavailable', message }, { status: 502 });
  }
  return new Response(result.body, { status: result.status, headers: JSON_HEADERS });
}

function looksLikeJson(body: string): boolean {
  const first = body.trimStart()[0];
  return first === '{' || first === '[';
}

/**
 * GET /api/lite-reply — the lite-account gateway's /info (gate account, chain id, app ids,
 * limits), or { enabled: false } when no gateway is configured or it cannot be reached, so
 * the UI simply hides the feature.
 */
export async function GET(): Promise<Response> {
  const base = liteGatewayUrl();
  if (!base) return Response.json({ enabled: false }, { status: 200 });
  try {
    const result = await callGateway(base, '/info', { method: 'GET' });
    if (result.status === 200) return relayed(result);
    logger.warn({ status: result.status }, 'lite gateway info unavailable');
  } catch (error) {
    logger.warn(error, 'lite gateway unreachable');
  }
  return Response.json({ enabled: false }, { status: 200 });
}

/**
 * POST /api/lite-reply — proxies a lite-account reply request to the gateway's /reply as is:
 * same request body, same response body and status (validation, rate limits and the L1
 * broadcast all happen in the gateway).
 */
export async function POST(request: Request): Promise<Response> {
  const base = liteGatewayUrl();
  if (!base) {
    return Response.json({ ok: false, code: 'relay_unavailable', message: 'lite gateway is not configured' }, { status: 503 });
  }
  const body = await request.text();
  try {
    return relayed(await callGateway(base, '/reply', { method: 'POST', body, clientIp: clientIp(request) }));
  } catch (error) {
    logger.error(error, 'lite gateway request failed');
    return Response.json({ ok: false, code: 'relay_unavailable', message: 'lite gateway unreachable' }, { status: 503 });
  }
}
