/**
 * Lite-account gateway client (server-only). The gateway (hive/lite_gateway) registers lite
 * accounts and broadcasts their bridged comments with its own gate accounts; Denser only
 * proxies to it, so a Denser deployment never holds a gate posting key.
 *
 *   DENSER_SERVER_LITE_GATEWAY_URL   base URL of the gateway API. Default: the public instance
 *                                    at https://api.hive.blog/lite-gateway-api. A node that runs
 *                                    its own gateway sets https://<its host>/lite-gateway-api;
 *                                    an empty value disables the feature.
 */
export const DEFAULT_LITE_GATEWAY_URL = 'https://api.hive.blog/lite-gateway-api';

const GATEWAY_TIMEOUT_MS = 15_000;

export function liteGatewayUrl(): string | undefined {
  const raw = process.env.DENSER_SERVER_LITE_GATEWAY_URL;
  const url = (raw === undefined ? DEFAULT_LITE_GATEWAY_URL : raw).trim().replace(/\/+$/, '');
  return url === '' ? undefined : url;
}

export type GatewayResult = { status: number; body: string };

/** Forward one request to the gateway and hand back its status and body for the caller to relay. */
export async function callGateway(
  base: string,
  path: string,
  init: { method: 'GET' | 'POST'; body?: string; clientIp?: string }
): Promise<GatewayResult> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  // The gateway rate-limits per client; tell it who the client is (it trusts its proxies).
  if (init.clientIp) headers['x-forwarded-for'] = init.clientIp;
  const response = await fetch(`${base}${path}`, {
    method: init.method,
    headers,
    body: init.body,
    cache: 'no-store',
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS)
  });
  return { status: response.status, body: await response.text() };
}

export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : request.headers.get('x-real-ip') ?? undefined;
}
