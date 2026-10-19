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
import { getLogger } from '@ui/lib/logging';

export const DEFAULT_LITE_GATEWAY_URL = 'https://api.hive.blog/lite-gateway-api';

const logger = getLogger('lite-relay');

const GATEWAY_TIMEOUT_MS = 15_000;
const HEALTH_TIMEOUT_MS = 5_000;
const HEALTH_CACHE_MS = 5_000;

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
  init: { method: 'GET' | 'POST'; body?: string; clientIp?: string; timeoutMs?: number }
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
    signal: AbortSignal.timeout(init.timeoutMs ?? GATEWAY_TIMEOUT_MS)
  });
  return { status: response.status, body: await response.text() };
}

export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : request.headers.get('x-real-ip') ?? undefined;
}

export type GatewayHealth = { status: string } & Record<string, unknown>;

const GATEWAY_DOWN: GatewayHealth = { status: 'down' };

function isGatewayHealth(value: unknown): value is GatewayHealth {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && 'status' in value && typeof value.status === 'string';
}

async function fetchGatewayHealth(base: string): Promise<GatewayHealth> {
  try {
    const result = await callGateway(base, '/health', { method: 'GET', timeoutMs: HEALTH_TIMEOUT_MS });
    const payload: unknown = JSON.parse(result.body);
    if (isGatewayHealth(payload)) return payload;
    logger.warn({ status: result.status }, 'lite gateway health answer has no status');
  } catch (error) {
    logger.warn(error, 'lite gateway health unavailable');
  }
  return GATEWAY_DOWN;
}

let cachedHealth: { base: string; at: number; health: Promise<GatewayHealth> } | undefined;

/**
 * The gateway's /health, shared by all requests for HEALTH_CACHE_MS (a request arriving while
 * one is in flight awaits it). An unreachable gateway or an answer without a `status` reads as
 * { status: 'down' }; a gateway that answers 503 with a health body is relayed as it answered.
 */
export function gatewayHealth(base: string): Promise<GatewayHealth> {
  const now = Date.now();
  if (cachedHealth && cachedHealth.base === base && now - cachedHealth.at < HEALTH_CACHE_MS) return cachedHealth.health;
  cachedHealth = { base, at: now, health: fetchGatewayHealth(base) };
  return cachedHealth.health;
}
